const fs = require('fs');
const path = require('path');
const Produto = require('../models/produtoModel');
const { converterPreco } = require('../utils/formatar');

function converterTipo(tipo) {
    return tipo === 'encomenda' ? 'encomenda' : 'pronta';
}

function caminhoDaImagem(arquivo) {
    return arquivo ? '/uploads/' + arquivo.filename : null;
}

// Apaga do disco a foto que não é mais usada
function apagarImagem(caminho) {
    if (!caminho || !caminho.startsWith('/uploads/')) return;
    fs.unlink(path.join(__dirname, '../public', caminho), () => {});
}

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
        res.render('cadastrar', { erro: null, valores: {} });
    }

    async incluir(req, res) {
        const { nome, descricao } = req.body;
        const preco = converterPreco(req.body.preco);
        const imagemCaminho = caminhoDaImagem(req.file);

        if (!nome || !nome.trim() || preco === null) {
            apagarImagem(imagemCaminho);
            return res.status(400).render('cadastrar', {
                erro: 'Confira o nome e o preço (ex: 15,50).',
                valores: req.body
            });
        }

        try {
            await Produto.incluir(nome.trim(), (descricao || '').trim(), preco, imagemCaminho, converterTipo(req.body.tipo));
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
            if (!produto) return res.redirect('/admin');
            res.render('editar', { produto, erro: null });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar edição");
        }
    }

    async alterar(req, res) {
        const { id, nome, descricao } = req.body;
        const preco = converterPreco(req.body.preco);
        const imagemNova = caminhoDaImagem(req.file);

        try {
            const produto = await Produto.buscarPorId(id);
            if (!produto) {
                apagarImagem(imagemNova);
                return res.redirect('/admin');
            }

            if (!nome || !nome.trim() || preco === null) {
                apagarImagem(imagemNova);
                return res.status(400).render('editar', {
                    produto: { ...produto, nome, descricao, tipo: converterTipo(req.body.tipo) },
                    erro: 'Confira o nome e o preço (ex: 15,50).'
                });
            }

            await Produto.alterar(id, nome.trim(), (descricao || '').trim(), preco, converterTipo(req.body.tipo), imagemNova);
            if (imagemNova) apagarImagem(produto.imagem);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao atualizar");
        }
    }

    async alternarDisponibilidade(req, res) {
        try {
            await Produto.alternarDisponibilidade(req.body.id);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao alterar disponibilidade");
        }
    }

    async excluir(req, res) {
        const { id } = req.body;
        try {
            const produto = await Produto.buscarPorId(id);
            await Produto.excluir(id);
            if (produto) apagarImagem(produto.imagem);
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
