const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const pedidoController = require('../controllers/pedidoController');
const Pedido = require('../models/pedidoModel');
const { verificarLogin, verificarCsrf } = require('../middlewares/auth');

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const pastaUploads = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(pastaUploads)) {
    fs.mkdirSync(pastaUploads, { recursive: true });
}

// A foto fica na memória até ser reduzida pelo sharp (mais abaixo)
const upload = multer({
    storage: multer.memoryStorage(),
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

// Fotos de celular têm 5-8 MB. Reduz para no máximo 1600px (continua nítida
// até em tela de celular moderna) e salva em WebP, que fica bem mais leve.
const salvarImagem = async (req, res, next) => {
    if (!req.file) return next();
    try {
        const nomeArquivo = Date.now() + '.webp';
        await sharp(req.file.buffer)
            .rotate() // deixa em pé as fotos tiradas com o celular deitado
            .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(pastaUploads, nomeArquivo));
        req.file.filename = nomeArquivo;
        next();
    } catch (err) {
        console.error(err);
        res.status(400).send('Não consegui abrir essa foto. Tente uma em JPG ou PNG. <a href="javascript:history.back()">Voltar</a>');
    }
};

// Número de pedidos novos, mostrado no link "Pedidos" de todas as páginas do painel
router.use(async (req, res, next) => {
    if (req.method !== 'GET' || !req.session.logado) return next();
    try {
        res.locals.pedidosNovos = await Pedido.contarNovos();
    } catch (err) {
        console.error(err);
        res.locals.pedidosNovos = 0;
    }
    next();
});

router.get('/', verificarLogin, adminController.exibirPainel);
router.get('/cadastrar', verificarLogin, adminController.exibirCadastro);
router.get('/editar/:id', verificarLogin, adminController.exibirEdicao);

router.post('/salvar', verificarLogin, receberImagem, verificarCsrf, salvarImagem, adminController.incluir);
router.post('/atualizar', verificarLogin, receberImagem, verificarCsrf, salvarImagem, adminController.alterar);
router.post('/disponibilidade', verificarLogin, verificarCsrf, adminController.alternarDisponibilidade);
router.post('/excluir', verificarLogin, verificarCsrf, adminController.excluir);
router.post('/pausa', verificarLogin, verificarCsrf, adminController.alterarPausa);

router.get('/pedidos', verificarLogin, pedidoController.exibirPedidos);
router.get('/pedidos/novos', verificarLogin, pedidoController.contarNovos);
router.post('/pedidos/status', verificarLogin, verificarCsrf, pedidoController.alterarStatus);
router.get('/vendas', verificarLogin, pedidoController.exibirVendas);

module.exports = router;
