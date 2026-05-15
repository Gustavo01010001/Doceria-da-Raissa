const initDB = require('../config/db');

class Produto {
    
    constructor(id, nome, descricao, preco, imagem) {
        this.id = id;
        this.nome = nome;
        this.descricao = descricao;
        this.preco = preco;
        this.imagem = imagem;
    }

    static async buscarTodos() {
        const db = await initDB();
        return await db.all('SELECT * FROM produtos');
    }

    static async buscarPorId(id) {
        const db = await initDB();
        return await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
    }

    static async incluir(nome, descricao, preco, imagem) {
        const db = await initDB();
        return await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)',
            [nome, descricao, preco, imagem]
        );
    }

    static async alterar(id, nome, descricao, preco, imagem) {
        const db = await initDB();
        return await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ?, imagem = ? WHERE id = ?',
            [nome, descricao, preco, imagem, id]
        );
    }

    static async excluir(id) {
        const db = await initDB();
        return await db.run('DELETE FROM produtos WHERE id = ?', [id]);
    }

    static async verificarEPouparIniciais() {
        const db = await initDB();
        const count = await db.get('SELECT COUNT(*) as total FROM produtos');
        
        if (count.total === 0) {
            await db.exec(`
                INSERT INTO produtos (nome, descricao, preco, imagem) VALUES 
                ('Bolo de Pote de Ninho', 'Delicioso bolo de pote com creme de leite ninho.', 12.00, null),
                ('Bala Baiana', 'Bala de coco caramelizada e crocante por fora.', 5.00, null),
                ('Brownie Tradicional', 'Brownie super chocolatudo e úmido.', 8.50, null)
            `);
        }
    }
}

module.exports = Produto;