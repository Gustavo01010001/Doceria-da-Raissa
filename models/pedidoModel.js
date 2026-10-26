const initDB = require('../config/db');

// Etapas do pedido, na ordem em que aparecem no painel
const STATUS = {
    novo: 'Novo',
    preparo: 'Em preparo',
    entregue: 'Entregue',
    cancelado: 'Cancelado'
};

function converterLinha(linha) {
    return { ...linha, itens: JSON.parse(linha.itens) };
}

class Pedido {

    static get STATUS() {
        return STATUS;
    }

    static async incluir(pedido) {
        const db = await initDB();
        return await db.run(
            `INSERT INTO pedidos (nome, entrega, endereco, pagamento, data_encomenda, observacoes, itens, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [pedido.nome, pedido.entrega, pedido.endereco || null, pedido.pagamento, pedido.dataEncomenda || null,
             pedido.observacoes || null, JSON.stringify(pedido.itens), pedido.total]
        );
    }

    // Mais novos primeiro. Sem status, traz todos.
    static async buscarTodos(status = null, limite = 200) {
        const db = await initDB();
        const linhas = status
            ? await db.all('SELECT * FROM pedidos WHERE status = ? ORDER BY id DESC LIMIT ?', [status, limite])
            : await db.all('SELECT * FROM pedidos ORDER BY id DESC LIMIT ?', [limite]);
        return linhas.map(converterLinha);
    }

    // Encomendas que ainda vão ser feitas, da data mais próxima para a mais distante
    static async buscarEncomendasAPartirDe(data) {
        const db = await initDB();
        const linhas = await db.all(
            `SELECT * FROM pedidos
             WHERE data_encomenda IS NOT NULL AND data_encomenda >= ? AND status IN ('novo', 'preparo')
             ORDER BY data_encomenda, id`,
            [data]
        );
        return linhas.map(converterLinha);
    }

    static async buscarPorId(id) {
        const db = await initDB();
        const linha = await db.get('SELECT * FROM pedidos WHERE id = ?', [id]);
        return linha ? converterLinha(linha) : null;
    }

    // Pedidos não cancelados feitos a partir de uma data ("AAAA-MM-DD", horário de Brasília).
    // O SQLite grava em UTC; Brasília é sempre UTC-3 (não tem mais horário de verão).
    static async buscarVendasDesde(data) {
        const db = await initDB();
        const linhas = await db.all(
            `SELECT *, date(criado_em, '-3 hours') AS dia FROM pedidos
             WHERE status != 'cancelado' AND date(criado_em, '-3 hours') >= ?`,
            [data]
        );
        return linhas.map(converterLinha);
    }

    static async contarNovos() {
        const db = await initDB();
        const linha = await db.get("SELECT COUNT(*) AS total FROM pedidos WHERE status = 'novo'");
        return linha.total;
    }

    static async contarPorStatus() {
        const db = await initDB();
        const linhas = await db.all('SELECT status, COUNT(*) AS total FROM pedidos GROUP BY status');
        return Object.fromEntries(linhas.map(linha => [linha.status, linha.total]));
    }

    static async alterarStatus(id, status) {
        const db = await initDB();
        return await db.run('UPDATE pedidos SET status = ? WHERE id = ?', [status, id]);
    }
}

module.exports = Pedido;
