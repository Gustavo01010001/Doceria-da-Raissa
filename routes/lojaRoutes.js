// routes/lojaRoutes.js
const express = require('express');
const router = express.Router();
const initDB = require('../config/db');

router.get('/', async (req, res) => {
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
        console.error(error);
        res.status(500).send("Erro interno");
    }
});

router.get('/login', (req, res) => {
    res.render('login', { erro: null });
});

router.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (usuario === 'admin' && senha === 'senha123') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
});

router.get('/logout', (req, res) => {
    req.session.logado = false;
    res.redirect('/');
});

module.exports = router;