const Produto = require('../models/produtoModel'); // Substituímos o initDB pelo Model

const adicionarAoCarrinho = async (req, res) => {
    const produtoId = parseInt(req.body.produtoId);
    try {
  
        const produto = await Produto.buscarPorId(produtoId);
        
        if (produto) {
            if (!req.session.carrinho) req.session.carrinho = [];
            
            const index = req.session.carrinho.findIndex(item => item.id === produtoId);
            if (index !== -1) {
                req.session.carrinho[index].quantidade += 1;
            } else {
                produto.quantidade = 1;
                req.session.carrinho.push(produto);
            }
        }
        res.redirect('/carrinho');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao adicionar ao carrinho");
    }
};

const exibirCarrinho = (req, res) => {
    const carrinho = req.session.carrinho || [];
    const total = carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0);
    res.render('carrinho', { carrinho, total });
};

const limparCarrinho = (req, res) => {
    req.session.carrinho = [];
    res.redirect('/carrinho');
};

module.exports = {
    adicionarAoCarrinho,
    exibirCarrinho,
    limparCarrinho
};