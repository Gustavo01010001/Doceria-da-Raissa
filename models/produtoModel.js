const initDB = require('../config/db');

// Na loja, "disponivel" já leva o estoque em conta: o doce só está à venda se a chef
// não marcou como esgotado E ainda sobrou unidade (estoque vazio = sem controle).
const COLUNAS_DA_LOJA = `id, nome, descricao, preco, imagem, tipo, categoria, estoque,
    (disponivel = 1 AND (estoque IS NULL OR estoque > 0)) AS disponivel`;

class Produto {

    constructor(id, nome, descricao, preco, imagem, disponivel, tipo, categoria, estoque) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.imagem = imagem;
        this.disponivel = disponivel;
        this.tipo = tipo;
        this.categoria = categoria;
        this.estoque = estoque;
    }

    // Painel: "disponivel" aqui é só o botão Esgotou/Voltou da chef
    static async buscarTodos() {
        const db = await initDB();
        return await db.all('SELECT * FROM produtos ORDER BY id');
    }

    // Vitrine: disponíveis primeiro, esgotados no final
    static async buscarParaVitrine() {
        const db = await initDB();
        return await db.all(`SELECT ${COLUNAS_DA_LOJA} FROM produtos ORDER BY disponivel DESC, id`);
    }

    static async buscarPorId(id) {
        const db = await initDB();
        return await db.get(`SELECT ${COLUNAS_DA_LOJA} FROM produtos WHERE id = ?`, [id]);
    }

    // Categorias já usadas, pra sugerir no cadastro
    static async buscarCategorias() {
        const db = await initDB();
        const linhas = await db.all("SELECT DISTINCT categoria FROM produtos WHERE categoria IS NOT NULL AND categoria != '' ORDER BY categoria");
        return linhas.map(linha => linha.categoria);
    }

    static async incluir(nome, descricao, preco, imagem, tipo, categoria, estoque) {
        const db = await initDB();
        return await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem, tipo, categoria, estoque) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nome, descricao, preco, imagem, tipo, categoria, estoque]
        );
    }

    // Se não vier imagem nova, mantém a que já estava
    static async alterar(id, nome, descricao, preco, tipo, categoria, estoque, imagem = null) {
        const db = await initDB();
        return await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, tipo = ?, categoria = ?, estoque = ?, imagem = COALESCE(?, imagem) WHERE id = ?',
            [nome, descricao, preco, tipo, categoria, estoque, imagem, id]
        );
    }

    // Tira do estoque só se tiver o suficiente. Retorna false se não deu
    // (ex: outro cliente comprou as últimas unidades um segundo antes).
    static async baixarEstoque(id, quantidade) {
        const db = await initDB();
        const resultado = await db.run(
            'UPDATE produtos SET estoque = estoque - ? WHERE id = ? AND (estoque IS NULL OR estoque >= ?)',
            [quantidade, id, quantidade]
        );
        return resultado.changes === 1;
    }

    // Devolve as unidades (pedido cancelado). Produtos sem controle de estoque ficam como estão.
    static async devolverEstoque(id, quantidade) {
        const db = await initDB();
        return await db.run('UPDATE produtos SET estoque = estoque + ? WHERE id = ? AND estoque IS NOT NULL', [quantidade, id]);
    }

    static async alternarDisponibilidade(id) {
        const db = await initDB();
        return await db.run('UPDATE produtos SET disponivel = 1 - disponivel WHERE id = ?', [id]);
    }

    static async excluir(id) {
        const db = await initDB();
        return await db.run('DELETE FROM produtos WHERE id = ?', [id]);
    }
}

module.exports = Produto;
