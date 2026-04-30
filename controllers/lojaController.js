const Produto = require('../models/produtoModel'); 

const carregarVitrine = async (req, res) => {
    try {

        await Produto.verificarEPouparIniciais();
        
        const produtos = await Produto.buscarTodos();
        
        res.render('index', { produtos });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro interno ao carregar a vitrine");
    }
};

const exibirLogin = (req, res) => {
    res.render('login', { erro: null });
};

const autenticarUsuario = (req, res) => {
    const { usuario, senha } = req.body;
    
    if (usuario === 'admin' && senha === 'senha123') {
        req.session.logado = true;
        res.redirect('/admin');
    } else {
        res.render('login', { erro: 'Usuário ou senha incorretos!' });
    }
};

const fazerLogout = (req, res) => {
    req.session.logado = false;
    res.redirect('/');
};

module.exports = {
    carregarVitrine,
    exibirLogin,
    autenticarUsuario,
    fazerLogout
};