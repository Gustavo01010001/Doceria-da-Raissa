const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarLogin } = require('../middlewares/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pastaUploads = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pastaUploads);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname).toLowerCase());
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, file.mimetype.startsWith('image/'));
    }
});

// Mostra uma mensagem amigável se a foto for grande demais
const receberImagem = (req, res, next) => {
    upload.single('imagem')(req, res, (err) => {
        if (err) {
            return res.status(400).send('A foto precisa ter no máximo 8 MB. <a href="javascript:history.back()">Voltar</a>');
        }
        next();
    });
};

router.get('/', verificarLogin, adminController.exibirPainel);
router.get('/cadastrar', verificarLogin, adminController.exibirCadastro);
router.get('/editar/:id', verificarLogin, adminController.exibirEdicao);

router.post('/salvar', verificarLogin, receberImagem, adminController.incluir);
router.post('/atualizar', verificarLogin, receberImagem, adminController.alterar);
router.post('/disponibilidade', verificarLogin, adminController.alternarDisponibilidade);
router.post('/excluir', verificarLogin, adminController.excluir);

module.exports = router;
