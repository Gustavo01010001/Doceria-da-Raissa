// routes/carrinhoRoutes.js
const express = require('express');
const router = express.Router();
const initDB = require('../config/db');

router.post('/adicionar', async (req, res) => {
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

router.get('/', (req, res) => {
    const carrinho = req.session.carrinho || [];
    const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
    res.render('carrinho', { carrinho, total });
});

router.post('/limpar', (req, res) => {
    req.session.carrinho = [];
    res.redirect('/carrinho');
});

module.exports = router;