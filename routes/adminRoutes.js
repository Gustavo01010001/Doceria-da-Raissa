// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const initDB = require('../config/db');
// Importando o porteiro!
const { verificarLogin } = require('../middlewares/auth');

// Importando o Multer e o Path para lidar com o upload de imagens
const multer = require('multer');
const path = require('path');

// ==========================================
// CONFIGURAÇÃO DO MULTER (Upload de Imagens)
// ==========================================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/') // A imagem será salva nesta pasta
    },
    filename: function (req, file, cb) {
        // Renomeia o arquivo para a data atual + extensão original para evitar conflitos de nomes iguais
        cb(null, Date.now() + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

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

// A rota /salvar agora usa o middleware upload.single('imagem')
router.post('/salvar', verificarLogin, upload.single('imagem'), async (req, res) => {
    const { nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));
    
    // Captura o caminho da foto gerado pelo Multer. Se não enviou, fica nulo.
    const imagemCaminho = req.file ? '/uploads/' + req.file.filename : null;

    try {
        const db = await initDB();
        // O INSERT agora inclui o campo imagem
        await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)', 
            [nome, descricao, precoFormatado, imagemCaminho]
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