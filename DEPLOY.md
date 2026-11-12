# Colocando a doceria online (Azure for Students, grátis)

Ao final, o site vai ficar em um endereço como **https://doceriadachef.duckdns.org**, com cadeado, ligado 24 horas, pronto pra bio do Instagram.

**Custo: zero.** A Azure for Students não pede cartão: você prova que é estudante com o e-mail da faculdade
e ganha crédito (na nossa conta veio **R$ 538**, com prazo até 28/04/2027) + **750 horas grátis por mês** de
máquina pequena (B1s ou B2ats). Se o crédito acabar, a conta é **pausada, não cobrada**. Enquanto você for
aluno, dá pra renovar. O saldo e o prazo ficam no portal em **Educação → Visão geral**.

> **O servidor da doceria já existe** (criado em 11/11/2026): máquina `doceria`, região **Chile Central**,
> tamanho **Standard_B2ats_v2**, usuário `azureuser`, IP **68.211.122.223**, chave no PC em
> `C:\Users\Gustavo\.ssh\doceria`. Os passos 2 e 3 abaixo ficam de referência (ex: se precisar refazer).

Tempo estimado: uns 40 minutos.

---

## 1. Criar o endereço grátis no DuckDNS (não pede cartão)

1. Entre em **https://www.duckdns.org** e faça login com Google ou GitHub.
2. Em **sub domain**, digite o nome que você quer (ex: `doceriadaraissa`) e clique em **add domain**.
3. Anote o **token** que aparece no topo da página. Você vai precisar dele no passo 5.

## 2. Ativar a Azure for Students

1. Entre em **https://azure.microsoft.com/pt-br/free/students** e clique em **Começar gratuitamente**.
2. Entre (ou crie a conta Microsoft) com o **e-mail da faculdade** (`...@unoeste.edu.br`).
3. Confirme o celular e os dados que ela pedir. **Não precisa de cartão.**
4. No fim, você cai no **portal da Azure**: **https://portal.azure.com**

> Dica: no portal, procure **"Cost Management"** (ou **"Assinaturas" → Azure for Students**) pra ver quanto
> crédito ainda tem.

## 3. Criar a máquina virtual

No portal: **Máquinas virtuais → Criar → Máquina virtual do Azure**.

**Aba Básico**

| Campo | O que escolher |
|---|---|
| Assinatura | **Azure for Students** |
| Grupo de recursos | **Criar novo** → `doceria` |
| Nome da máquina virtual | `doceria` |
| Região | **(South America) Chile Central**. Na nossa conta, o Brasil e os EUA bloqueiam as máquinas pequenas grátis |
| Opções de disponibilidade | **Nenhuma redundância de infraestrutura necessária** |
| Tipo de segurança | **Padrão** |
| Imagem | **Ubuntu Server 24.04 LTS - x64 Gen2** |
| Tamanho | **Standard_B2ats_v2** (2 vCPU, 1 GiB) ou **Standard_B1s**: os dois entram nas 750 horas grátis. Clique em *Ver todos os tamanhos* |
| Tipo de autenticação | **Chave pública SSH** |
| Nome de usuário | `azureuser` |
| Origem da chave pública SSH | **Gerar novo par de chaves** |
| Nome do par de chaves | `doceria-chave` |
| Portas de entrada públicas | **Permitir portas selecionadas** → marque **HTTP (80)**, **HTTPS (443)** e **SSH (22)** |

**Aba Discos:** **SSD Premium** de **64 GB** (o grátis de estudante inclui discos P6 de 64 GB).

> Dica: se o portal disser que o tamanho "não está disponível", descubra onde ele está liberado no
> **Cloud Shell** (ícone `>_` no topo do portal):
> `az policy assignment list --query "[].parameters.listOfAllowedLocations.value" -o tsv` mostra as regiões
> permitidas para a conta.

**Aba Gerenciamento:** confira que **Habilitar desligamento automático** está **desmarcado**
(se ficar marcado, o site sai do ar toda noite).

Clique em **Revisar + criar → Criar**. A Azure mostra **Baixar a chave privada e criar o recurso**:
clique e guarde o arquivo **`doceria-chave.pem`** (ex: na pasta Downloads). ⚠️ Ela só deixa baixar essa vez.

Quando terminar, clique em **Ir para o recurso** e anote o **Endereço IP público**.

## 4. Apontar o DuckDNS para o servidor

Não precisa fazer nada: o script do passo 5 avisa o DuckDNS qual é o IP da máquina e continua
avisando a cada 5 minutos.

## 5. Entrar no servidor e instalar

No **PowerShell** do seu PC:

```powershell
ssh -i "$env:USERPROFILE\.ssh\doceria" azureuser@68.211.122.223
```

(Se um dia criar a máquina pelo portal com "Gerar novo par de chaves", use o `.pem` baixado no lugar de
`.ssh\doceria`, e antes rode `icacls "CAMINHO.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"`.)

Na primeira vez ele pergunta se confia no servidor: digite `yes`.

Já dentro do servidor:

```bash
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/Gustavo01010001/Doceria-da-Raissa.git doceria
cd doceria
bash deploy/instalar.sh     # na 1ª vez ele só cria o arquivo .env
openssl rand -hex 32        # gera uma frase secreta aleatória: copie pro SESSION_SECRET
nano .env                   # preencha a senha da chef, a frase secreta e o DuckDNS
bash deploy/instalar.sh     # agora instala tudo e coloca o site no ar
```

No `nano`: edite, aperte **Ctrl+O**, **Enter** pra salvar e **Ctrl+X** pra sair.

Pronto: abra **https://SEU-SUBDOMINIO.duckdns.org** 🎉 (o cadeado pode levar 1 ou 2 minutos na primeira vez).

## 6. Levar os doces que já estão cadastrados no seu PC (opcional)

O banco de dados não vai pro GitHub. Pra levar os produtos (e pedidos) que já existem, rode no
**PowerShell do seu PC**, dentro da pasta do projeto:

```powershell
scp -i "$env:USERPROFILE\.ssh\doceria" doceria.sqlite azureuser@68.211.122.223:~/doceria/
scp -i "$env:USERPROFILE\.ssh\doceria" -r public/uploads azureuser@68.211.122.223:~/doceria/public/
ssh -i "$env:USERPROFILE\.ssh\doceria" azureuser@68.211.122.223 "pm2 restart doceria"
```

---

## No dia a dia

No PC do Gustavo existe o atalho **`ssh doceria`** (em `C:\Users\Gustavo\.ssh\config`): ele já sabe o IP,
o usuário e a chave, e mantém a conexão viva (não cai no meio do `nano`). Todos os comandos abaixo são pra
colar no **PowerShell do PC**:

| Quero... | Comando |
|---|---|
| **Trocar a senha da chef / esqueci a senha** | `ssh -t doceria "bash doceria/deploy/trocar-senha.sh"` |
| Atualizar o site depois de mudar o código no GitHub | `ssh doceria "cd doceria && bash deploy/atualizar.sh"` |
| Ver erros / o que está acontecendo | `ssh doceria "pm2 logs doceria --lines 50 --nostream"` |
| Ver se o site está ligado | `ssh doceria "pm2 status"` |
| Mudar outra coisa do `.env` (ex: WhatsApp) | `ssh -t doceria "nano doceria/.env && pm2 restart doceria"` |
| Fazer um backup agora | `ssh doceria "cd doceria && bash deploy/backup.sh"` |

**Trocar a senha:** o `trocar-senha.sh` pede a senha nova **duas vezes**, sem mostrar na tela (pode até
tirar print), troca só essa linha do `.env`, reinicia o site, **testa se a senha nova entra** e zera o
bloqueio de "muitas tentativas". Não precisa abrir o `nano` pra isso.

> Por que não só `nano .env`? Na primeira instalação o PM2 guardava uma cópia das senhas e a troca no
> `.env` não valia. Isso foi corrigido (o `.env` sempre vence), mas o script é o jeito mais seguro.

**Backups:** todo dia às 3h é salva uma cópia do banco e das fotos em `backups/`, guardando as últimas 14.
Como as cópias ficam no próprio servidor, de vez em quando baixe uma pro seu PC:

```powershell
scp -i "$env:USERPROFILE\.ssh\doceria" "azureuser@68.211.122.223:~/doceria/backups/*.tar.gz" .
```

## Avisos importantes

- **Crédito e renovação:** o crédito tem prazo (o nosso vai até 28/04/2027). Perto do fim, a Microsoft avisa por e-mail; entre no
  portal e renove a Azure for Students (precisa continuar sendo aluno). Se o crédito acabar, a máquina é
  **desligada** (sem cobrança): por isso baixe um backup pro PC de vez em quando.
- **Nunca troque a assinatura para "Pago conforme o uso"** (Pay-As-You-Go): aí sim começaria a cobrar.
- **Não crie coisas extras** no portal (outras máquinas, bancos de dados, IPs). Só a máquina `doceria`.
- **Memória:** a máquina tem só 1 GB. O `instalar.sh` cria 1 GB de memória extra no disco (swap) pra não
  travar na instalação.
- A chave (`.ssh\doceria` no PC, ou o `.pem`) é a "chave da casa": não mande pra ninguém e não coloque no
  GitHub. Se perder, dá pra cadastrar outra no portal (máquina → **Redefinir senha** → *Redefinir chave SSH*).
- O GitHub do projeto é **público**: nunca coloque senhas no código, só no `.env` do servidor.
