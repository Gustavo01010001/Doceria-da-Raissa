# Colocando a doceria online (Oracle Cloud, grátis)

Ao final, o site vai ficar em um endereço como **https://doceriadachef.duckdns.org**, com cadeado, ligado 24 horas, pronto pra bio do Instagram.

Tempo estimado: uns 40 minutos, a maior parte esperando as telas da Oracle.

---

## 1. Criar o endereço grátis no DuckDNS (não pede cartão)

1. Entre em **https://www.duckdns.org** e faça login com Google ou GitHub.
2. Em **sub domain**, digite o nome que você quer (ex: `doceriadaraissa`) e clique em **add domain**.
3. Anote o **token** que aparece no topo da página. Você vai precisar dele no passo 5.

## 2. Criar a conta na Oracle Cloud

1. Entre em **https://www.oracle.com/br/cloud/free/** e clique em **Comece gratuitamente**.
2. Em **Home Region**, escolha **Brazil East (Sao Paulo)**. ⚠️ Não dá pra trocar depois.
3. A Oracle pede um cartão **só pra confirmar sua identidade**. Ela faz uma reserva pequena que é devolvida.
   **Nunca clique em "Upgrade to Pay As You Go"**: enquanto a conta for só "Free Tier", nada é cobrado.

## 3. Criar a máquina virtual

No painel da Oracle: **☰ Menu → Compute → Instances → Create instance**.

| Campo | O que escolher |
|---|---|
| Name | `doceria` |
| Image | **Canonical Ubuntu 24.04** (clique em *Change image*) |
| Shape | **VM.Standard.E2.1.Micro** (tem o selo *Always Free-eligible*) |
| Networking | Deixe criar uma VCN nova, com **subnet pública** e **Assign a public IPv4 address** marcado |
| Add SSH keys | **Generate a key pair for me** → clique em **Save private key** e guarde o arquivo `.key` |

Clique em **Create**. Quando ficar verde (**Running**), anote o **Public IP address**.

> Se a Oracle disser "Out of capacity", espere um pouco e tente de novo, ou use o shape **Ampere A1 Flex** com 1 OCPU e 6 GB (também é grátis).

## 4. Liberar as portas 80 e 443 na rede da Oracle

Na página da máquina: clique no nome da **Subnet** → **Security Lists** → **Default Security List** → **Add Ingress Rules**:

- **Source CIDR:** `0.0.0.0/0`
- **IP Protocol:** TCP
- **Destination Port Range:** `80,443`

Clique em **Add Ingress Rules**. O firewall de dentro do Ubuntu, o script libera sozinho.

## 5. Entrar no servidor e instalar

No **PowerShell** do seu PC (troque o caminho da chave e o IP):

```powershell
# Só na primeira vez: o Windows exige que a chave seja privada
icacls "C:\Users\Gustavo\Downloads\ssh-key.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"

ssh -i "C:\Users\Gustavo\Downloads\ssh-key.key" ubuntu@SEU_IP
```

Já dentro do servidor:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/Gustavo01010001/Doceria-da-Raissa.git doceria
cd doceria
bash deploy/instalar.sh     # na 1ª vez ele só cria o arquivo .env
nano .env                   # preencha a senha da chef, a frase secreta e o DuckDNS
bash deploy/instalar.sh     # agora instala tudo e coloca o site no ar
```

No `nano`: edite, aperte **Ctrl+O**, **Enter** pra salvar e **Ctrl+X** pra sair.

Pronto: abra **https://SEU-SUBDOMINIO.duckdns.org** 🎉

## 6. Levar os doces que já estão cadastrados no seu PC (opcional)

O banco de dados não vai pro GitHub. Pra levar os produtos que já existem, rode no **PowerShell do seu PC**, dentro da pasta do projeto:

```powershell
scp -i "C:\Users\Gustavo\Downloads\ssh-key.key" doceria.sqlite ubuntu@SEU_IP:~/doceria/
scp -i "C:\Users\Gustavo\Downloads\ssh-key.key" -r public/uploads ubuntu@SEU_IP:~/doceria/public/
ssh -i "C:\Users\Gustavo\Downloads\ssh-key.key" ubuntu@SEU_IP "pm2 restart doceria"
```

---

## No dia a dia

| Quero... | Comando (dentro do servidor, na pasta `doceria`) |
|---|---|
| Atualizar o site depois de mudar o código no GitHub | `bash deploy/atualizar.sh` |
| Ver erros / o que está acontecendo | `pm2 logs doceria` |
| Ver se o site está ligado | `pm2 status` |
| Trocar a senha da chef | `nano .env` e depois `pm2 restart doceria` |
| Fazer um backup agora | `bash deploy/backup.sh` |

**Backups:** todo dia às 3h é salva uma cópia do banco e das fotos em `backups/`, guardando as últimas 14. Como as cópias ficam no próprio servidor, de vez em quando baixe uma pro seu PC:

```powershell
scp -i "C:\Users\Gustavo\Downloads\ssh-key.key" "ubuntu@SEU_IP:~/doceria/backups/*.tar.gz" .
```

## Avisos importantes

- **Máquina parada por falta de uso:** a Oracle pode **parar** máquinas grátis que ficam quase sem uso por uns 7 dias, e costuma avisar por e-mail antes. Se o site sair do ar, entre no painel → **Compute → Instances → doceria → Start**. O site volta sozinho, porque o PM2 religa.
- O aviso `MemoryStore is not designed for a production environment` no `pm2 logs` é esperado: o carrinho fica na memória e some se o servidor reiniciar. Pra uma loja pequena não tem problema.
- O GitHub do projeto é **público**: nunca coloque senhas no código, só no `.env` do servidor.
