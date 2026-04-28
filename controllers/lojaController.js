// controllers/lojaController.js
const initDB = require('../config/db');

// Função 1: Carrega a vitrine
const carregarVitrine = async (req, res) => {
    try {
        const db = await initDB();
        // A lógica de criar os 3 doces caso o banco esteja vazio
        const produtosCount = await db.get('SELECT COUNT(*) as count FROM produtos');
        if (produtosCount.count === 0) {
            await db.exec(`
                INSERT INTO produtos (nome, descricao, preco, imagem) VALUES 
                ('Bolo de Pote de Ninho', 'Delicioso bolo de pote com creme de leite ninho.', 12.00, null),
                ('Bala Baiana', 'Bala de coco caramelizada e crocante por fora.', 5.00, null),
                ('Brownie Tradicional', 'Brownie super chocolatudo e úmido.', 8.50, null)
            `);
        }
        const produtos = await db.all('SELECT * FROM produtos');
        res.render('index', { produtos });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro interno");
    }
};

// Função 2: Mostra a tela de login
const exibirLogin = (req, res) => {
    res.render('login', { erro: null });
};

// Função 3: Valida usuário e senha
const autenticarUsuario = (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === 'senha123') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
};

// Função 4: Sai do sistema
const fazerLogout = (req, res) => {
    req.session.logado = false;
    res.redirect('/');
};

// Exportamos todas as funções para a Rota poder usar
module.exports = {
    carregarVitrine,
    exibirLogin,
    autenticarUsuario,
    fazerLogout
};