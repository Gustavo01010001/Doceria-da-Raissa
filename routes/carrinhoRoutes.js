const express = require('express');
const router = express.Router();
const carrinhoController = require('../controllers/carrinhoController');

router.get('/', carrinhoController.exibirCarrinho);
router.post('/adicionar', carrinhoController.adicionarAoCarrinho);
router.post('/quantidade', carrinhoController.alterarQuantidade);
router.post('/esvaziar', carrinhoController.limparCarrinho);
router.post('/finalizar', carrinhoController.finalizarPedido);

module.exports = router;
