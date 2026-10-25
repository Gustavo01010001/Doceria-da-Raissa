const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

let conexao;

async function criarConexao() {
    const db = await open({
        filename: process.env.DB_ARQUIVO || path.join(__dirname, '../doceria.sqlite'),
        driver: sqlite3.Database
    });

    const tabela = await db.get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'produtos'");

    await db.exec(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            descricao TEXT,
            preco REAL,
            imagem TEXT,
            disponivel INTEGER NOT NULL DEFAULT 1,
            tipo TEXT NOT NULL DEFAULT 'pronta'
        )
    `);

    // Bancos criados antes dessas colunas existirem
    const colunasNovas = {
        disponivel: "INTEGER NOT NULL DEFAULT 1",
        tipo: "TEXT NOT NULL DEFAULT 'pronta'" // 'pronta' (pronta entrega) ou 'encomenda'
    };
    const colunas = await db.all('PRAGMA table_info(produtos)');
    for (const [nome, definicao] of Object.entries(colunasNovas)) {
        if (!colunas.some(coluna => coluna.name === nome)) {
            await db.exec(`ALTER TABLE produtos ADD COLUMN ${nome} ${definicao}`);
        }
    }

    // Produtos de exemplo só na primeira vez, pra não voltarem se a chef apagar tudo
    if (!tabela) {
        await db.exec(`
            INSERT INTO produtos (nome, descricao, preco, imagem) VALUES
            ('Bolo de Pote de Ninho', 'Delicioso bolo de pote com creme de leite ninho.', 12.00, null),
            ('Bala Baiana', 'Bala de coco caramelizada e crocante por fora.', 5.00, null),
            ('Brownie Tradicional', 'Brownie super chocolatudo e úmido.', 8.50, null)
        `);
    }

    return db;
}

// Abre o banco uma vez só e reaproveita a mesma conexão
function initDB() {
    if (!conexao) {
        conexao = criarConexao();
    }
    return conexao;
}

module.exports = initDB;
