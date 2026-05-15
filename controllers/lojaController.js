const Produto = require('../models/produtoModel'); 

class LojaController {

    constructor() {
        if (!LojaController.instance) {
            LojaController.instance = this;
        }
        return LojaController.instance;
    }
  
    async carregarVitrine(req, res) {
        try {
            await Produto.verificarEPouparIniciais();
            const produtos = await Produto.buscarTodos();
            res.render('index', { produtos });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro interno ao carregar a vitrine");
        }
    }

    exibirLogin(req, res) {
        res.render('login', { erro: null });
    }

    autenticarUsuario(req, res) {
        const { usuario, senha } = req.body;
        
        if (usuario === 'admin' && senha === 'senha123') {
            req.session.logado = true;
            res.redirect('/admin');
        } else {
            res.render('login', { erro: 'Usuário ou senha incorretos!' });
        }
    }

    fazerLogout(req, res) {
        req.session.logado = false;
        res.redirect('/');
    }
}

const instance = new LojaController();
Object.freeze(instance);
module.exports = instance;