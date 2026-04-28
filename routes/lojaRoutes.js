// routes/lojaRoutes.js
const express = require('express');
const router = express.Router();

// Importamos o nosso gerente
const lojaController = require('../controllers/lojaController');

// Olha como fica limpo! A rota só aponta para a função correspondente no Controller.
router.get('/', lojaController.carregarVitrine);
router.get('/login', lojaController.exibirLogin);
router.post('/login', lojaController.autenticarUsuario);
router.get('/logout', lojaController.fazerLogout);

module.exports = router;