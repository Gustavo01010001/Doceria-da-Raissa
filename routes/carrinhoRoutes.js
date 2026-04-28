// routes/carrinhoRoutes.js
const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinhoController');

router.get('/', carrinhoController.exibirCarrinho);
router.post('/adicionar', carrinhoController.adicionarAoCarrinho);
router.post('/limpar', carrinhoController.limparCarrinho);

module.exports = router;