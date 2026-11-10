const path = require('path');

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

// Fontes do Google e ícones do unpkg são as únicas coisas de fora que as páginas carregam
const POLITICA_DE_CONTEUDO = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://unpkg.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
    "font-src 'self' data: https://fonts.gstatic.com https://unpkg.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
].join('; ');

// Cabeçalhos de segurança: outro site não consegue abrir a loja ou o painel dentro de um iframe,
// o navegador não "adivinha" o tipo dos arquivos e só carrega scripts daqui e do unpkg
app.use((req, res, next) => {
    res.set({
        'Content-Security-Policy': POLITICA_DE_CONTEUDO,
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
app.use(express.static(path.join(__dirname, 'public')));

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
    res.locals.urlBase = `${req.protocol}://${req.get('host')}`;
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
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});
