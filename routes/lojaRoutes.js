const express = require('express');
const router = express.Router();

const lojaController = require('../controllers/lojaController');

router.get('/', lojaController.carregarVitrine);
router.get('/login', lojaController.exibirLogin);
router.post('/login', lojaController.autenticarUsuario);
router.get('/logout', lojaController.fazerLogout);

module.exports = router;