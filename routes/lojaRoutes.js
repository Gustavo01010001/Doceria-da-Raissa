const express = require('express');
const router = express.Router();

const lojaController = require('../controllers/lojaController');
const { verificarCsrf } = require('../middlewares/auth');

router.get('/', lojaController.carregarVitrine);
router.get('/login', lojaController.exibirLogin);
router.post('/login', lojaController.autenticarUsuario);
// Sair só pelo botão do painel (POST com o código CSRF): um link de outro site não desloga a chef
const jaSaiu = (req, res, next) => (req.session.logado ? next() : res.redirect('/'));
router.post('/logout', jaSaiu, verificarCsrf, lojaController.fazerLogout);
router.get('/logout', (req, res) => res.redirect('/admin'));

module.exports = router;