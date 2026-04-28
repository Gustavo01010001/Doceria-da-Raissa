const Produto = require('../models/produtoModel');

const exibirPainel = async (req, res) => {
    try {
        const produtos = await Produto.buscarTodos();
        res.render('admin', { produtos });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao carregar painel");
    }
};

const exibirCadastro = (req, res) => {
    res.render('cadastrar');
};

const salvarProduto = async (req, res) => {
    const { nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));
    const imagemCaminho = req.file ? '/uploads/' + req.file.filename : null;

    try {
        await Produto.criar(nome, descricao, precoFormatado, imagemCaminho);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao salvar produto");
    }
};

const exibirEdicao = async (req, res) => {
    const { id } = req.params;
    try {
        const produto = await Produto.buscarPorId(id);
        res.render('editar', { produto });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao carregar edição");
    }
};

const atualizarProduto = async (req, res) => {
    const { id, nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));
    
    try {
        await Produto.atualizar(id, nome, descricao, precoFormatado);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao atualizar");
    }
};

const excluirProduto = async (req, res) => {
    const { id } = req.body;
    try {
         await Produto.excluir(id);
        res.redirect('/admin');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erro ao excluir");
    }
};

module.exports = {
    exibirPainel,
    exibirCadastro,
    salvarProduto,
    exibirEdicao,
    atualizarProduto,
    excluirProduto
};