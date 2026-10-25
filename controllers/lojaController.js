const Produto = require('../models/produtoModel');
const loja = require('../config/loja');

class LojaController {

    constructor() {
        if (!LojaController.instance) {
            LojaController.instance = this;
        }
        return LojaController.instance;
    }

    async carregarVitrine(req, res) {
        try {
            const produtos = await Produto.buscarParaVitrine();
            // Abre na aba pedida no link (?aba=encomenda); senão, na que tiver doces à venda
            let abaAtiva = req.query.aba === 'encomenda' || req.query.aba === 'pronta' ? req.query.aba : null;
            if (!abaAtiva) {
                const temProntaEntrega = produtos.some(produto => produto.tipo !== 'encomenda' && produto.disponivel);
                const temEncomenda = produtos.some(produto => produto.tipo === 'encomenda');
                abaAtiva = !temProntaEntrega && temEncomenda ? 'encomenda' : 'pronta';
            }
            res.render('index', { produtos, abaAtiva });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro interno ao carregar a vitrine");
        }
    }

    exibirLogin(req, res) {
        if (req.session.logado) return res.redirect('/admin');
        res.render('login', { erro: null });
    }

    autenticarUsuario(req, res) {
        const { usuario, senha } = req.body;

        if (usuario === loja.adminUsuario && senha === loja.adminSenha) {
            req.session.logado = true;
            res.redirect('/admin');
        } else {
            res.status(401).render('login', { erro: 'Usuário ou senha incorretos!' });
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
