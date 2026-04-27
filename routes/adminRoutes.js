// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const initDB = require('../config/db');
// Importando o porteiro!
const { verificarLogin } = require('../middlewares/auth');

router.get('/', verificarLogin, async (req, res) => {
    try {
        const db = await initDB();
        const produtos = await db.all('SELECT * FROM produtos');
        res.render('admin', { produtos });
    } catch (error) {
        res.status(500).send("Erro interno");
    }
});

router.get('/cadastrar', verificarLogin, (req, res) => {
    res.render('cadastrar');
});

router.post('/salvar', verificarLogin, async (req, res) => {
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
        res.status(500).send("Erro");
    }
});

router.get('/editar/:id', verificarLogin, async (req, res) => {
    const { id } = req.params;
    try {
        const db = await initDB();
        const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
        res.render('editar', { produto });
    } catch (error) {
        res.status(500).send("Erro");
    }
});

router.post('/atualizar', verificarLogin, async (req, res) => {
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
        res.status(500).send("Erro");
    }
});

router.post('/excluir', verificarLogin, async (req, res) => {
    const { id } = req.body;
    try {
        const db = await initDB();
        await db.run('DELETE FROM produtos WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro");
    }
});

module.exports = router;