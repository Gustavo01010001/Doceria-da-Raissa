const initDB = require('../config/db');

class Produto {

    constructor(id, nome, descricao, preco, imagem, disponivel, tipo) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.imagem = imagem;
        this.disponivel = disponivel;
        this.tipo = tipo;
    }

    static async buscarTodos() {
        const db = await initDB();
        return await db.all('SELECT * FROM produtos ORDER BY id');
    }

    // Vitrine: disponíveis primeiro, esgotados no final
    static async buscarParaVitrine() {
        const db = await initDB();
        return await db.all('SELECT * FROM produtos ORDER BY disponivel DESC, id');
    }

    static async buscarPorId(id) {
        const db = await initDB();
        return await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
    }

    static async incluir(nome, descricao, preco, imagem, tipo) {
        const db = await initDB();
        return await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem, tipo) VALUES (?, ?, ?, ?, ?)',
            [nome, descricao, preco, imagem, tipo]
        );
    }

    // Se não vier imagem nova, mantém a que já estava
    static async alterar(id, nome, descricao, preco, tipo, imagem = null) {
        const db = await initDB();
        return await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, tipo = ?, imagem = COALESCE(?, imagem) WHERE id = ?',
            [nome, descricao, preco, tipo, imagem, id]
        );
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
