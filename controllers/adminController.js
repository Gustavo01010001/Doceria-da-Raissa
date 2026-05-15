const Produto = require('../models/produtoModel');

class AdminController {
    
    constructor() {
        if (!AdminController.instance) {
            AdminController.instance = this;
        }
        return AdminController.instance;
    }

    async exibirPainel(req, res) {
        try {
            const produtos = await Produto.buscarTodos();
            res.render('admin', { produtos });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar painel");
        }
    }

    exibirCadastro(req, res) {
        res.render('cadastrar');
    }

    async incluir(req, res) {
        const { nome, descricao, preco } = req.body;
        const precoFormatado = parseFloat(preco.replace(',', '.'));
        const imagemCaminho = req.file ? '/uploads/' + req.file.filename : null;

        try {
            await Produto.incluir(nome, descricao, precoFormatado, imagemCaminho);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao salvar produto");
        }
    }

    async exibirEdicao(req, res) {
        const { id } = req.params;
        try {
            const produto = await Produto.buscarPorId(id);
            res.render('editar', { produto });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar edição");
        }
    }

    async alterar(req, res) {
        const { id, nome, descricao, preco } = req.body;
        const precoFormatado = parseFloat(preco.replace(',', '.'));
        
        try {
            await Produto.alterar(id, nome, descricao, precoFormatado);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao atualizar");
        }
    }

    async excluir(req, res) {
        const { id } = req.body;
        try {
             await Produto.excluir(id);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao excluir");
        }
    }
}

const instance = new AdminController();
Object.freeze(instance);
module.exports = instance;