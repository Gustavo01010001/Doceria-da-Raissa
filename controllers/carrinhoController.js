const Produto = require('../models/produtoModel'); 

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

const finalizarPedido = (req, res) => {
    const carrinho = req.session.carrinho || [];

    if (carrinho.length === 0) {
        return res.redirect('/');
    }

    let texto = "Olá! Gostaria de fazer o seguinte pedido:\n\n";
    let total = 0;

    carrinho.forEach(item => {
        texto += `${item.quantidade}x ${item.nome} - R$ ${(item.preco * item.quantidade).toFixed(2).replace('.', ',')}\n`;
        total += (item.preco * item.quantidade);
    });

    texto += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;

    const numeroWhatsApp = "5518996516732"; 

    req.session.carrinho = [];
    
    const url = `https://api.whatsapp.com/send?phone=${numeroWhatsApp}&text=${encodeURIComponent(texto)}`;
    res.redirect(url);
};


module.exports = {
    adicionarAoCarrinho,
    exibirCarrinho,
    limparCarrinho,
    finalizarPedido 
};