const express = require('express');
const session = require('express-session');
const path = require('path');
const initDB = require('./config/db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'doceria-super-secreta',
    resave: false,
    saveUninitialized: true
}));

// ==========================================
// --- ROTAS DA LOJA (PÚBLICAS) ---
// ==========================================

app.get('/', async (req, res) => {
    try {
        const db = await initDB();
        const produtosCount = await db.get('SELECT COUNT(*) as count FROM produtos');
        if (produtosCount.count === 0) {
            await db.exec(`
                INSERT INTO produtos (nome, descricao, preco) VALUES 
                ('Bolo de Pote de Ninho', 'Delicioso bolo de pote com creme de leite ninho.', 12.00),
                ('Bala Baiana', 'Bala de coco caramelizada e crocante por fora.', 5.00),
                ('Brownie Tradicional', 'Brownie super chocolatudo e úmido.', 8.50)
            `);
        }
        const produtos = await db.all('SELECT * FROM produtos');
        res.render('index', { produtos });
    } catch (error) {
        console.error("Erro ao carregar a página inicial:", error);
        res.status(500).send("Erro interno no servidor");
    }
});

app.post('/carrinho/adicionar', async (req, res) => {
    const produtoId = parseInt(req.body.produtoId);
    try {
        const db = await initDB();
        const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [produtoId]);
        if (produto) {
            if (!req.session.carrinho) req.session.carrinho = [];
            const index = req.session.carrinho.findIndex(item => item.id === produtoId);
            if (index !== -1) {
                req.session.carrinho[index].quantidade += 1;
            } else {
                produto.quantidade = 1;
                req.session.carrinho.push(produto);
            }
        }
        res.redirect('/carrinho');
    } catch (error) {
        res.status(500).send("Erro interno");
    }
});

app.get('/carrinho', (req, res) => {
    const carrinho = req.session.carrinho || [];
    const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
    res.render('carrinho', { carrinho, total });
});

app.post('/carrinho/limpar', (req, res) => {
    req.session.carrinho = [];
    res.redirect('/carrinho');
});

// ==========================================
// --- SISTEMA DE LOGIN ---
// ==========================================

app.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    // DADOS DE ACESSO DA SUA AMIGA (Você pode mudar aqui depois)
    if (usuario === 'admin' && senha === 'senha123') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
});

app.get('/logout', (req, res) => {
    req.session.logado = false;
    res.redirect('/');
});

// MIDDLEWARE: O "Porteiro" do Painel Admin
const verificarLogin = (req, res, next) => {
    if (req.session.logado) {
        next(); // Deixa passar
    } else {
        res.redirect('/login'); // Manda de volta pro login
    }
};

// ==========================================
// --- ÁREA ADMINISTRATIVA (PROTEGIDA) ---
// ==========================================

// Note que agora usamos o "verificarLogin" no meio das rotas admin
app.get('/admin', verificarLogin, async (req, res) => {
    try {
        const db = await initDB();
        const produtos = await db.all('SELECT * FROM produtos');
        res.render('admin', { produtos });
    } catch (error) {
        res.status(500).send("Erro interno");
    }
});

app.get('/admin/cadastrar', verificarLogin, (req, res) => {
    res.render('cadastrar');
});

app.post('/admin/salvar', verificarLogin, async (req, res) => {
    const { nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));
    try {
        const db = await initDB();
        await db.run(
            'INSERT INTO produtos (nome, descricao, preco) VALUES (?, ?, ?)', 
            [nome, descricao, precoFormatado]
        );
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro ao salvar produto");
    }
});

// Tela para editar um doce existente
app.get('/admin/editar/:id', verificarLogin, async (req, res) => {
    const { id } = req.params;
    try {
        const db = await initDB();
        const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
        res.render('editar', { produto });
    } catch (error) {
        res.status(500).send("Erro ao carregar produto para edição");
    }
});

// Rota que processa a atualização dos dados
app.post('/admin/atualizar', verificarLogin, async (req, res) => {
    const { id, nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));

    try {
        const db = await initDB();
        await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ? WHERE id = ?',
            [nome, descricao, precoFormatado, id]
        );
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro ao atualizar produto");
    }
});

app.post('/admin/excluir', verificarLogin, async (req, res) => {
    const { id } = req.body;
    try {
        const db = await initDB();
        await db.run('DELETE FROM produtos WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro ao excluir produto");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando liso na porta ${PORT}`);
});