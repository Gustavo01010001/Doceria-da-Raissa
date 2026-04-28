const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarLogin } = require('../middlewares/auth');

const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

router.get('/', verificarLogin, adminController.exibirPainel);
router.get('/cadastrar', verificarLogin, adminController.exibirCadastro);
router.post('/salvar', verificarLogin, upload.single('imagem'), adminController.salvarProduto);
router.get('/editar/:id', verificarLogin, adminController.exibirEdicao);
router.post('/atualizar', verificarLogin, adminController.atualizarProduto);
router.post('/excluir', verificarLogin, adminController.excluirProduto);

module.exports = router;