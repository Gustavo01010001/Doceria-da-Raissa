const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinhoController');

router.get('/', carrinhoController.exibirCarrinho);
router.post('/adicionar', carrinhoController.adicionarAoCarrinho);
router.post('/esvaziar', carrinhoController.limparCarrinho);
router.get('/finalizar', carrinhoController.finalizarPedido);

module.exports = router;