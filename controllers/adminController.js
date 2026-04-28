const initDB = require('../config/db');

const exibirPainel = async (req, res) => {
    try {
        const db = await initDB();
        const produtos = await db.all('SELECT * FROM produtos');
        res.render('admin', { produtos });
    } catch (error) {
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
        const db = await initDB();
        await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)', 
            [nome, descricao, precoFormatado, imagemCaminho]
        );
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro ao salvar produto");
    }
};

const exibirEdicao = async (req, res) => {
    const { id } = req.params;
    try {
        const db = await initDB();
        const produto = await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
        res.render('editar', { produto });
    } catch (error) {
        res.status(500).send("Erro ao carregar edição");
    }
};

const atualizarProduto = async (req, res) => {
    const { id, nome, descricao, preco } = req.body;
    const precoFormatado = parseFloat(preco.replace(',', '.'));
    try {
        const db = await initDB();
        await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ? WHERE id = ?', 
            [nome, descricao, precoFormatado, id]
        );
        res.redirect('/admin');
    } catch (error) {
        res.status(500).send("Erro ao atualizar");
    }
};

const excluirProduto = async (req, res) => {
    const { id } = req.body;
    try {
        const db = await initDB();
        await db.run('DELETE FROM produtos WHERE id = ?', [id]);
        res.redirect('/admin');
    } catch (error) {
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