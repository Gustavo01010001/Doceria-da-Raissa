const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// No servidor, as senhas ficam no arquivo .env (que não vai para o GitHub)
try {
    process.loadEnvFile(path.join(__dirname, '.env'));
} catch (erro) {
    // Sem .env (no PC de desenvolvimento): usa os valores padrão de config/loja.js
}

const express = require('express');
const session = require('express-session');
const loja = require('./config/loja');
const SessaoStore = require('./config/sessaoStore');
const Configuracao = require('./models/configuracaoModel');
const { formatarPreco, formatarData, formatarDataHora } = require('./utils/formatar');
const { caminhoDaMiniatura, gerarMiniatura } = require('./utils/miniatura');

const producao = process.env.NODE_ENV === 'production';

// Online, não deixa o site subir com a senha padrão que está no GitHub
if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_SENHA || !process.env.SESSION_SECRET)) {
    console.error('Defina ADMIN_SENHA e SESSION_SECRET no arquivo .env antes de colocar o site no ar.');
    process.exit(1);
}

const app = express();

// Necessário quando hospedado atrás de proxy (Render, Railway etc.)
app.set('trust proxy', 1);

// Não conta pra quem visita que o site é feito em Express
app.disable('x-powered-by');

// As fontes do Google são a única coisa de fora que as páginas carregam.
// Scripts: só rodam os <script> da página que trazem o "nonce" (um código novo a cada página).
// Se um dia algum texto escapar sem tratamento e virar <script>, o navegador não roda.
function politicaDeConteudo(nonce) {
    return [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}'`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'"
    ].join('; ');
}

// Cabeçalhos de segurança: outro site não consegue abrir a loja ou o painel dentro de um iframe,
// o navegador não "adivinha" o tipo dos arquivos e só roda os scripts do próprio site
app.use((req, res, next) => {
    // As telas usam assim: <script nonce="<%= nonce %>">
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    res.set({
        'Content-Security-Policy': politicaDeConteudo(res.locals.nonce),
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    });
    // Online com cadeado: o navegador passa a usar sempre HTTPS
    if (process.env.NODE_ENV === 'production' && req.secure) {
        res.set('Strict-Transport-Security', 'max-age=31536000');
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// As fotos dos doces nunca mudam (foto nova = arquivo novo), então o navegador pode guardar por 30 dias
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), { maxAge: '30d', immutable: true }));

// Cópia pequena da foto para a vitrine, o carrinho e o painel. É criada na primeira vez que
// alguém pede e fica guardada em public/uploads/mini (aí quem serve é a linha de cima).
app.get('/uploads/mini/:arquivo', async (req, res, next) => {
    const achado = /^([\w-]+)\.webp$/.exec(req.params.arquivo);
    if (!achado) return next();
    try {
        const arquivo = await gerarMiniatura(achado[1]);
        if (!arquivo) return next();
        res.sendFile(arquivo, { maxAge: '30d', immutable: true });
    } catch (erro) {
        console.error(erro);
        next();
    }
});

// Os links dos estilos levam ?v=... (muda quando o arquivo muda), então online o navegador
// pode guardar por 30 dias sem risco de mostrar um visual antigo
const PASTA_CSS = path.join(__dirname, 'public/css');
app.locals.versao = Math.round(Math.max(...fs.readdirSync(PASTA_CSS).map(arquivo => fs.statSync(path.join(PASTA_CSS, arquivo)).mtimeMs))).toString(36);
app.use('/css', express.static(PASTA_CSS, { maxAge: producao ? '30d' : 0 }));
app.use(express.static(path.join(__dirname, 'public')));

// No PC de desenvolvimento, avisa se alguma tela usa um ícone que ainda não foi gerado
if (!producao) {
    const faltando = require('./scripts/gerar-icones').iconesFaltando();
    if (faltando.length > 0) {
        console.warn(`Ícones sem desenho: ${faltando.join(', ')}. Rode "npm run icones" para gerar.`);
    }
}

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    store: new SessaoStore(),
    secret: loja.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // carrinho fica guardado por 7 dias
        secure: 'auto', // cookie só por HTTPS quando o site estiver com cadeado
        sameSite: 'lax'
    }
}));

// Disponível em todas as views
app.locals.loja = loja;
app.locals.formatarPreco = formatarPreco;
app.locals.formatarData = formatarData;
app.locals.formatarDataHora = formatarDataHora;
app.locals.miniatura = caminhoDaMiniatura;
app.use(async (req, res, next) => {
    // Loja pausada pela chef: a vitrine e o carrinho param de aceitar pedidos
    try {
        res.locals.pausa = await Configuracao.buscarPausa();
    } catch (erro) {
        console.error(erro);
        res.locals.pausa = { pausada: false, recado: '' };
    }

    const carrinho = req.session.carrinho || [];
    res.locals.quantidadeCarrinho = carrinho.reduce((soma, item) => soma + item.quantidade, 0);
    res.locals.totalCarrinho = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
    // No servidor o endereço é fixo (não confia no que vem no pedido, que pode ser falsificado)
    res.locals.urlBase = loja.url || `${req.protocol}://${req.get('host')}`;
    next();
});

const lojaRoutes = require('./routes/lojaRoutes');
const carrinhoRoutes = require('./routes/carrinhoRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', lojaRoutes);
app.use('/carrinho', carrinhoRoutes);
app.use('/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).render('404');
});

// Erros que escaparam: mostra uma mensagem simples, sem o caminho dos arquivos do servidor
app.use((erro, req, res, next) => {
    if (res.headersSent) return next(erro);
    if (erro.type === 'entity.too.large') {
        return res.status(413).send('O conteúdo enviado é grande demais. <a href="/">Voltar para a loja</a>');
    }
    if (erro.type === 'entity.parse.failed' || erro.status === 400) {
        return res.status(400).send('Não entendi o que foi enviado. <a href="/">Voltar para a loja</a>');
    }
    console.error(erro);
    res.status(500).send('Algo deu errado. Tente de novo daqui a pouco. <a href="/">Voltar para a loja</a>');
});

const PORT = process.env.PORT || 3000;
// No servidor, o site só atende o próprio computador (127.0.0.1): quem vem da internet passa
// obrigatoriamente pelo Caddy (HTTPS). Assim ninguém fala com o Node direto pela porta 3000
// fingindo outro IP. No PC de casa (sem HOST) atende a rede toda, pra testar no celular pelo Wi-Fi.
const HOST = process.env.HOST || (producao ? '127.0.0.1' : undefined);
app.listen(PORT, HOST, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
