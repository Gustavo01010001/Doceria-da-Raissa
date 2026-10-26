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
            tipo TEXT NOT NULL DEFAULT 'pronta',
            categoria TEXT,
            estoque INTEGER
        )
    `);

    // Bancos criados antes dessas colunas existirem
    const colunasNovas = {
        disponivel: "INTEGER NOT NULL DEFAULT 1",
        tipo: "TEXT NOT NULL DEFAULT 'pronta'", // 'pronta' (pronta entrega) ou 'encomenda'
        categoria: "TEXT", // ex: Bolos, Doces, Salgados (vazio = sem categoria)
        estoque: "INTEGER" // quantas unidades ainda tem (vazio = sem controle de estoque)
    };
    const colunas = await db.all('PRAGMA table_info(produtos)');
    for (const [nome, definicao] of Object.entries(colunasNovas)) {
        if (!colunas.some(coluna => coluna.name === nome)) {
            await db.exec(`ALTER TABLE produtos ADD COLUMN ${nome} ${definicao}`);
        }
    }

    // Cópia de cada pedido enviado pelo WhatsApp. Os itens ficam em JSON com nome e preço
    // da hora da compra, pra não mudarem se a chef editar ou apagar o produto depois.
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            criado_em TEXT NOT NULL DEFAULT (datetime('now')),
            nome TEXT NOT NULL,
            entrega TEXT NOT NULL,
            endereco TEXT,
            pagamento TEXT NOT NULL,
            data_encomenda TEXT,
            observacoes TEXT,
            itens TEXT NOT NULL,
            total REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'novo'
        )
    `);

    // Sessões (login da chef e carrinhos), pra não sumirem quando o site reinicia
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sessoes (
            sid TEXT PRIMARY KEY,
            dados TEXT NOT NULL,
            expira INTEGER NOT NULL
        )
    `);

    // Ajustes que a chef muda pelo painel (ex: loja pausada)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )
    `);

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
