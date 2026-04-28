const initDB = require('../config/db');

const Produto = {

    buscarTodos: async () => {
        const db = await initDB();
        return await db.all('SELECT * FROM produtos');
    },

    buscarPorId: async (id) => {
        const db = await initDB();
        return await db.get('SELECT * FROM produtos WHERE id = ?', [id]);
    },

    criar: async (nome, descricao, preco, imagem) => {
        const db = await initDB();
        return await db.run(
            'INSERT INTO produtos (nome, descricao, preco, imagem) VALUES (?, ?, ?, ?)',
            [nome, descricao, preco, imagem]
        );
    },

    atualizar: async (id, nome, descricao, preco) => {
        const db = await initDB();
        return await db.run(
            'UPDATE produtos SET nome = ?, descricao = ?, preco = ? WHERE id = ?',
            [nome, descricao, preco, id]
        );
    },

    excluir: async (id) => {
        const db = await initDB();
        return await db.run('DELETE FROM produtos WHERE id = ?', [id]);
    },


    verificarEPouparIniciais: async () => {
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
};

module.exports = Produto;