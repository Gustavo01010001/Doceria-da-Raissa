const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarLogin } = require('../middlewares/auth');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 1. Criamos o caminho absoluto e à prova de falhas
const pastaUploads = path.join(__dirname, '../public/uploads');

// 2. Criamos a pasta se ela não existir
if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

// 3. Configuração do Multer blindada
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Agora o Multer recebe o endereço completo exato do seu PC
        cb(null, pastaUploads); 
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Rotas usando o Controlador
router.get('/', verificarLogin, adminController.exibirPainel);
router.get('/cadastrar', verificarLogin, adminController.exibirCadastro);
router.post('/salvar', verificarLogin, upload.single('imagem'), adminController.salvarProduto);
router.get('/editar/:id', verificarLogin, adminController.exibirEdicao);
router.post('/atualizar', verificarLogin, adminController.atualizarProduto);
router.post('/excluir', verificarLogin, adminController.excluirProduto);

module.exports = router;