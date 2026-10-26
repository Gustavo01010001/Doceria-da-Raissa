const fs = require('fs');
const path = require('path');
const Produto = require('../models/produtoModel');
const Configuracao = require('../models/configuracaoModel');
const { converterPreco } = require('../utils/formatar');

function converterTipo(tipo) {
    return tipo === 'encomenda' ? 'encomenda' : 'pronta';
}

// Estoque só vale para pronta entrega. Vazio = sem controle (null).
// Retorna undefined se a chef digitou algo que não é um número inteiro.
function converterEstoque(texto, tipo) {
    const valor = String(texto || '').trim();
    if (tipo === 'encomenda' || valor === '') return null;
    return /^\d{1,5}$/.test(valor) ? parseInt(valor, 10) : undefined;
}

// " bolos  de pote" -> "Bolos de pote" (assim "bolos" e "Bolos" viram a mesma categoria)
function converterCategoria(texto) {
    const categoria = String(texto || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : null;
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
            const [produtos, pausa] = await Promise.all([Produto.buscarTodos(), Configuracao.buscarPausa()]);
            res.render('admin', { produtos, pausa });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar painel");
        }
    }

    async exibirCadastro(req, res) {
        try {
            const categorias = await Produto.buscarCategorias();
            res.render('cadastrar', { erro: null, valores: {}, categorias });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar cadastro");
        }
    }

    async incluir(req, res) {
        const { nome, descricao } = req.body;
        const preco = converterPreco(req.body.preco);
        const tipo = converterTipo(req.body.tipo);
        const estoque = converterEstoque(req.body.estoque, tipo);
        const imagemCaminho = caminhoDaImagem(req.file);

        try {
            if (!nome || !nome.trim() || preco === null || estoque === undefined) {
                apagarImagem(imagemCaminho);
                return res.status(400).render('cadastrar', {
                    erro: estoque === undefined ? 'O estoque precisa ser um número inteiro (ex: 10), ou deixe vazio.' : 'Confira o nome e o preço (ex: 15,50).',
                    valores: req.body,
                    categorias: await Produto.buscarCategorias()
                });
            }

            await Produto.incluir(nome.trim(), (descricao || '').trim(), preco, imagemCaminho, tipo, converterCategoria(req.body.categoria), estoque);
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
            res.render('editar', { produto, erro: null, categorias: await Produto.buscarCategorias() });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar edição");
        }
    }

    async alterar(req, res) {
        const { id, nome, descricao } = req.body;
        const preco = converterPreco(req.body.preco);
        const tipo = converterTipo(req.body.tipo);
        const estoque = converterEstoque(req.body.estoque, tipo);
        const imagemNova = caminhoDaImagem(req.file);

        try {
            const produto = await Produto.buscarPorId(id);
            if (!produto) {
                apagarImagem(imagemNova);
                return res.redirect('/admin');
            }

            if (!nome || !nome.trim() || preco === null || estoque === undefined) {
                apagarImagem(imagemNova);
                return res.status(400).render('editar', {
                    produto: { ...produto, nome, descricao, tipo, categoria: req.body.categoria, estoque: req.body.estoque },
                    erro: estoque === undefined ? 'O estoque precisa ser um número inteiro (ex: 10), ou deixe vazio.' : 'Confira o nome e o preço (ex: 15,50).',
                    categorias: await Produto.buscarCategorias()
                });
            }

            await Produto.alterar(id, nome.trim(), (descricao || '').trim(), preco, tipo, converterCategoria(req.body.categoria), estoque, imagemNova);
            if (imagemNova) apagarImagem(produto.imagem);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao atualizar");
        }
    }

    // Pausar / voltar a receber pedidos
    async alterarPausa(req, res) {
        try {
            const recado = String(req.body.recado || '').trim().slice(0, 200);
            await Configuracao.salvarPausa(req.body.pausada === '1', recado);
            res.redirect('/admin');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao pausar a loja");
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
