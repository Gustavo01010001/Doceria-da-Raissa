#!/usr/bin/env bash
# Instala e coloca a doceria no ar num servidor Ubuntu (Azure for Students, ou qualquer VM Ubuntu).
# Uso, dentro da pasta do projeto:  bash deploy/instalar.sh
# Pode rodar de novo quantas vezes quiser (ex: depois de mudar o .env).
set -euo pipefail
cd "$(dirname "$0")/.."
PASTA="$(pwd)"

if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "Criei o arquivo .env. Preencha as senhas e o DuckDNS com:  nano .env"
    echo "Depois rode de novo:  bash deploy/instalar.sh"
    exit 1
fi

# Lê o .env só para este script (sem "exportar"): assim o PM2 não guarda uma cópia das senhas,
# e o site sempre lê o .env atual quando reinicia
source .env
if [[ "${ADMIN_SENHA:-}" == troque* || "${SESSION_SECRET:-}" == troque* || "${DUCKDNS_TOKEN:-}" == cole* || -z "${DUCKDNS_SUBDOMINIO:-}" ]]; then
    echo "Preencha ADMIN_SENHA, SESSION_SECRET, DUCKDNS_SUBDOMINIO e DUCKDNS_TOKEN no .env (nano .env) e rode de novo."
    exit 1
fi
DOMINIO="$DUCKDNS_SUBDOMINIO.duckdns.org"
PORTA_APP="${PORT:-3000}"

# Máquinas pequenas (1 GB, como a B1s da Azure) travam no "npm ci" sem memória extra: cria 1 GB de swap
if ! swapon --show | grep -q .; then
    echo "==> Criando 1 GB de memória extra (swap)"
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile >/dev/null
    sudo swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> 1/7 Pacotes do sistema"
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y curl git build-essential python3 iptables-persistent \
    debian-keyring debian-archive-keyring apt-transport-https gnupg

echo "==> 2/7 Node.js"
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
node -v

echo "==> 3/7 Dependências do projeto"
npm ci --omit=dev
command -v pm2 >/dev/null || sudo npm install -g pm2

echo "==> 4/7 Liberando as portas 80 e 443 no firewall do Ubuntu"
for PORTA in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$PORTA" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT -p tcp --dport "$PORTA" -j ACCEPT
done
sudo netfilter-persistent save

echo "==> 5/7 Endereço grátis no DuckDNS ($DOMINIO)"
URL_DUCKDNS="https://www.duckdns.org/update?domains=$DUCKDNS_SUBDOMINIO&token=$DUCKDNS_TOKEN&ip="
RESPOSTA="$(curl -s "$URL_DUCKDNS")"
if [ "$RESPOSTA" != "OK" ]; then
    echo "O DuckDNS respondeu '$RESPOSTA'. Confira DUCKDNS_SUBDOMINIO e DUCKDNS_TOKEN no .env."
    exit 1
fi
mkdir -p backups
# Mantém o DuckDNS atualizado a cada 5 min e faz backup todo dia às 3h
( crontab -l 2>/dev/null | grep -v '# doceria-' || true
  echo "*/5 * * * * curl -s '$URL_DUCKDNS' >/dev/null # doceria-duckdns"
  echo "0 3 * * * bash $PASTA/deploy/backup.sh >> $PASTA/backups/backup.log 2>&1 # doceria-backup"
) | crontab -

echo "==> 6/7 Caddy (HTTPS com cadeado automático)"
if ! command -v caddy >/dev/null; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y caddy
fi
sudo tee /etc/caddy/Caddyfile >/dev/null <<EOF
$DOMINIO {
    encode gzip
    reverse_proxy 127.0.0.1:$PORTA_APP
}
EOF
sudo systemctl enable caddy
sudo systemctl restart caddy

echo "==> 7/7 Ligando o site com o PM2"
pm2 startOrReload ecosystem.config.js
pm2 save
sudo env PATH="$PATH" "$(command -v pm2)" startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo ""
echo "Pronto! Em 1 ou 2 minutos o site estará em:  https://$DOMINIO"
echo "Ver o que está acontecendo:  pm2 logs doceria"
