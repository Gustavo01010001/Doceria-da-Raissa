#!/usr/bin/env bash
# Troca (ou recupera) a senha do painel da chef, com segurança:
# - a senha NÃO aparece na tela enquanto você digita (pode até tirar print)
# - pede duas vezes, pra não salvar com erro de digitação
# - troca só a linha ADMIN_SENHA do .env, reinicia o site e testa se a senha nova entra
# - o reinício também zera o bloqueio de "muitas tentativas erradas"
#
# Uso, no PowerShell do PC:  ssh -t doceria "bash doceria/deploy/trocar-senha.sh"
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "Não achei o arquivo .env. Rode antes:  bash deploy/instalar.sh"
    exit 1
fi

while true; do
    read -rsp "Senha nova da chef (não aparece enquanto digita): " SENHA; echo
    read -rsp "Digite de novo para confirmar: " CONFIRMA; echo
    if [ "$SENHA" != "$CONFIRMA" ]; then
        echo "As duas não ficaram iguais. Vamos de novo."; echo; continue
    fi
    if [ "${#SENHA}" -lt 10 ]; then
        echo "Use pelo menos 10 caracteres (ex: três palavras + números)."; echo; continue
    fi
    if [[ "$SENHA" =~ [[:space:]\"\'\\\$\`#] ]]; then
        echo "Não use espaço, aspas, \\, \$, \` nem # (eles atrapalham o arquivo .env)."; echo; continue
    fi
    break
done

# Troca só a linha ADMIN_SENHA (mantém o resto do .env como está e a permissão do arquivo)
TEMPORARIO="$(mktemp)"
trap 'rm -f "$TEMPORARIO"' EXIT
awk -v nova="$SENHA" '
    /^ADMIN_SENHA=/ { print "ADMIN_SENHA=" nova; trocou = 1; next }
    { print }
    END { if (!trocou) print "ADMIN_SENHA=" nova }
' .env > "$TEMPORARIO"
cat "$TEMPORARIO" > .env
chmod 600 .env
echo "Senha salva no .env."

# Reinicia o site (ele lê o .env de novo) e espera ele voltar
pm2 restart doceria >/dev/null
PORTA="$(grep -E '^PORT=' .env | cut -d= -f2)"; PORTA="${PORTA:-3000}"
for _ in $(seq 1 20); do
    curl -s -o /dev/null "http://127.0.0.1:$PORTA/" && break
    sleep 1
done

# Testa de verdade: tenta entrar no painel com a senha nova
USUARIO="$(grep -E '^ADMIN_USUARIO=' .env | cut -d= -f2)"; USUARIO="${USUARIO:-admin}"
RESPOSTA="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' \
    --data-urlencode "usuario=$USUARIO" --data-urlencode "senha=$SENHA" "http://127.0.0.1:$PORTA/login")"
if [[ "$RESPOSTA" == 302*"/admin" ]]; then
    echo "Pronto! Testei aqui: o usuário \"$USUARIO\" já entra com a senha nova."
else
    echo "Atenção: a senha foi salva, mas o teste de login não passou ($RESPOSTA)."
    echo "Veja o que aconteceu com:  pm2 logs doceria"
    exit 1
fi
