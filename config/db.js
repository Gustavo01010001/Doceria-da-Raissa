// config/db.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDB() {
    const db = await open({
        filename: './doceria.sqlite',
        driver: sqlite3.Database
    });

    // AQUI ESTAVA A BOMBA! Agora adicionamos o 'imagem TEXT'
    await db.exec(`
        CREATE TABLE IF NOT EXISTS produtos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT,
            descricao TEXT,
            preco REAL,
            imagem TEXT
        )
    `);

    return db;
}

module.exports = initDB;