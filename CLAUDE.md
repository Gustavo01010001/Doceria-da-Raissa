# Doceria da Raissa

Loja online de doces que o Gustavo está fazendo **de graça** para uma amiga (Raissa, "a chef").
O cliente monta o carrinho e o pedido vai pelo WhatsApp dela. A chef cuida de tudo num painel.
Repositório: https://github.com/Gustavo01010001/Doceria-da-Raissa (branch `main`).

## Regras que nunca podem ser quebradas

- **Responder sempre em português do Brasil**, de um jeito simples (o Gustavo ainda está aprendendo).
- **NUNCA enviar pedido pelo WhatsApp.** O número em `config/loja.js` é o da Raissa de verdade:
  qualquer pedido enviado chega no celular dela. Nos testes, nunca clicar em "Enviar pedido pelo
  WhatsApp" e nunca abrir links `wa.me`. Os testes do back só conferem o link montado (`redirect: 'manual'`).
- **Testar sempre numa cópia do banco**, nunca no `doceria.sqlite` de verdade (ver "Como testar").
- **Não mexer no painel da chef com o banco de verdade** (excluir, editar, pausar, mudar status).
- **Commit e push só quando o Gustavo pedir.** O `DEPLOY.md` e arquivos que ele mexeu sozinho
  não entram no commit sem perguntar.
- Fotos de teste que forem parar em `public/uploads` precisam ser apagadas no fim.
- Este projeto é **separado** do Mural de Notas (`Desktop\projeto2.0`). Não misturar os dois.

## Como rodar

```bash
node app.js            # http://localhost:3000 (usa o doceria.sqlite de verdade)
npm run dev            # mesmo, com nodemon (reinicia sozinho)
```

- Sem `.env` no PC: usa os padrões de `config/loja.js` (login do painel `admin` / `senha123`).
- No servidor, o `.env` é obrigatório (`ADMIN_SENHA`, `SESSION_SECRET`); veja `.env.example`.
- Para o celular acessar: mesmo Wi-Fi, `http://IP-do-PC:3000`. Se a rede do Windows estiver como
  "Pública", o firewall bloqueia (mudar para "Privada").

## Como testar (QA)

1. Copiar o banco e subir numa porta separada:
   ```powershell
   Copy-Item doceria.sqlite $env:TEMP\doceria-copia.sqlite -Force
   $env:DB_ARQUIVO="$env:TEMP\doceria-copia.sqlite"; $env:PORT="3100"; node app.js
   ```
2. Back: testes por HTTP com `fetch` (cookies na mão, `redirect: 'manual'`). Cada cliente simulado
   precisa de um IP diferente no cabeçalho `X-Forwarded-For`, senão os limites por IP atrapalham.
   Última rodada (11/11/2026): **162/162 passaram** (login, CSRF, XSS, CSP com nonce, SQL, uploads,
   carrinho, estoque, pedidos, limites por IP, mensagem do WhatsApp...). Rode o roteiro **uma vez por
   servidor**: os limites por IP ficam na memória e uma segunda rodada já começa bloqueada.
3. Front: navegador do app em tamanho de celular (375px e 320px), temas claro e escuro,
   contraste mínimo 4,5, área de toque de 44px, sem erros no console. Sem enviar pedido.
4. No fim: desligar o servidor de teste e conferir que não sobrou foto nova em `public/uploads`.

## Estrutura

- `app.js`: servidor Express, cabeçalhos de segurança (CSP etc.), erros sem stack trace,
  miniaturas em `/uploads/mini/`, cache dos estilos com `?v=`.
- `config/`: `db.js` (SQLite, cria tabelas), `loja.js` (nome, WhatsApp, Pix, login), `sessaoStore.js`.
- `controllers/`: `lojaController` (vitrine, login), `carrinhoController` (carrinho, finalizar pedido),
  `adminController` (produtos), `pedidoController` (pedidos e vendas).
- `models/`: `produtoModel` (inclui `reservarEstoque`), `pedidoModel`, `configuracaoModel` (pausa).
- `middlewares/auth.js`: login do painel, CSRF e resposta 401 em JSON.
- `utils/`: `formatar.js` (preço, datas), `limitador.js` (limite por IP), `miniatura.js` (fotos de 600px).
- `views/`: telas EJS. `partials/tema-inicial.ejs` aplica o tema e liga o "modo leve".
- `public/css/`: `loja.css` (loja), `admin-tema.css` (painel), `icones.css` (gerado, não editar).
- `scripts/gerar-icones.js`: gera `icones.css`. **Usou ícone novo numa tela? Rode `npm run icones`.**
- `deploy/`: `instalar.sh` (Ubuntu: Node, Caddy/HTTPS, DuckDNS, PM2, backup), `atualizar.sh`, `backup.sh`.

## Decisões já tomadas (não desfazer sem motivo)

- Login: 10 senhas erradas por IP = 15 min bloqueado. Sessão nova ao entrar. Sair é POST com CSRF.
- Pedidos: no máximo 5 a cada 30 min por IP. Clique duplo em "Enviar" gera um pedido só.
- Estoque baixa quando o pedido é enviado. Cancelar devolve. Reabrir cancelado só se tiver estoque.
- Encomenda: data entre hoje + antecedência (2 dias) e 1 ano. O campo avisa na hora se o dia já passou.
- Preço aceita "15", "15,50", "15.50" e "1.234,56". Recusa zero e letra.
- Limites de texto: nome do doce 80, descrição 500; pedido: nome 80, endereço 300, observações 500.
- Visual: rosa dos botões `--cor-botao: #d81b60` (contraste 4,96), verde do WhatsApp `#15803d`.
- Desempenho: ícones locais (antes ~670 KB do unpkg), miniaturas de 600px na vitrine, carrinho e painel,
  modo leve automático em aparelho fraco (até 2 GB de memória), sem animações com "reduzir movimento".
- `nodemon` fixo em 3.1.11 (correção de segurança). `npm audit`: 0 vulnerabilidades.
- CSP com nonce: todo `<script>` leva `nonce="<%= nonce %>"`. Nada de `onsubmit`/`onclick` nem
  `javascript:` nas telas (a CSP bloqueia); pedir confirmação é com `<form data-confirmar="...">`.
- Mensagem do WhatsApp: nome e endereço numa linha só e sem `* _ ~ \``; observações vão como citação
  ("> "). Assim o cliente não consegue escrever um "Total" falso.
- Carrinho: no máximo 30 carrinhos novos por IP a cada 10 min. Abrir o carrinho vazio não cria sessão.
- Servidor: em produção o Node escuta só em `127.0.0.1` (o Caddy fica na frente). A prévia do link
  usa `LOJA_URL` ou o endereço do DuckDNS, nunca o cabeçalho `Host`.

## Pendências

- **Hospedagem:** a conta na Oracle Cloud não deu certo. O plano é o **Azure for Students**
  (sem cartão, e-mail da faculdade). **VM criada em 11/11/2026:** `doceria`, Chile Central (Brasil/EUA
  bloqueiam as máquinas grátis nesta conta), Standard_B2ats_v2, Ubuntu 24.04, IP `68.211.122.223`,
  `ssh -i ~/.ssh/doceria azureuser@68.211.122.223`. O `instalar.sh` cria swap de 1 GB.
  **No ar desde 12/11/2026 em https://doceriarubio.duckdns.org** (nome "Doceria Rubio", Instagram
  @raissa_rubio). Banco e fotos do PC foram levados pro servidor: **a partir daí os dados de verdade
  ficam no servidor**; o `doceria.sqlite` do PC virou cópia antiga. Backup diário às 3h no servidor.
  Senha da chef e token do DuckDNS apareceram em prints na conversa: recomendado trocar os dois.
  **Trocar/recuperar a senha da chef:** `ssh -t doceria "bash doceria/deploy/trocar-senha.sh"` (o atalho
  `ssh doceria` está em `~/.ssh/config` do PC). Nunca pedir pra digitar senha em print/chat.
  O `.env` sempre vence o que o PM2 guardou (`app.js` usa `util.parseEnv`); o `instalar.sh` não exporta
  mais as senhas pro PM2 (era isso que fazia a senha nova não valer).
  Plano B sem custo: PC velho em casa + Tailscale Funnel ou Cloudflare Tunnel.
- **Limite de unidades por pedido:** um pedido ainda pode levar o estoque todo de um doce.
  É regra da loja: perguntar ao Gustavo/Raissa antes de inventar um número.
- 3 fotos antigas (`public/uploads/*.jpg`) estão no git desde antes do `.gitignore`. Não é risco; deixar.
