const Produto = require('../models/produtoModel');
const loja = require('../config/loja');
const { criarLimitador } = require('../utils/limitador');

// Depois de 10 senhas erradas, o mesmo IP espera 15 minutos (contra robô chutando senha)
const errosDeLogin = criarLimitador({ maximo: 10, janela: 15 * 60 * 1000 });

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

        if (errosDeLogin.bloqueado(req.ip)) {
            return res.status(429).render('login', { erro: 'Muitas tentativas erradas. Espere 15 minutos e tente de novo.' });
        }

        if (usuario !== loja.adminUsuario || senha !== loja.adminSenha) {
            errosDeLogin.registrar(req.ip);
            return res.status(401).render('login', { erro: 'Usuário ou senha incorretos!' });
        }

        errosDeLogin.limpar(req.ip);

        // Sessão nova ao entrar: um código de sessão pego antes do login não abre o painel
        const carrinho = req.session.carrinho;
        req.session.regenerate((erro) => {
            if (erro) {
                console.error(erro);
                return res.status(500).send('Erro ao entrar. Tente de novo.');
            }
            if (carrinho) req.session.carrinho = carrinho;
            req.session.logado = true;
            res.redirect('/admin');
        });
    }

    fazerLogout(req, res) {
        req.session.logado = false;
        delete req.session.csrfToken;
        res.redirect('/');
    }
}

const instance = new LojaController();
Object.freeze(instance);
module.exports = instance;
