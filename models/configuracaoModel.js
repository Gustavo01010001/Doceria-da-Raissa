const initDB = require('../config/db');

class Configuracao {

    // Loja pausada = não aceita pedidos novos. O recado aparece para os clientes.
    static async buscarPausa() {
        const db = await initDB();
        const linhas = await db.all("SELECT chave, valor FROM configuracoes WHERE chave IN ('pausada', 'recado_pausa')");
        const valores = Object.fromEntries(linhas.map(linha => [linha.chave, linha.valor]));
        return {
            pausada: valores.pausada === '1',
            recado: valores.recado_pausa || ''
        };
    }

    static async salvarPausa(pausada, recado) {
        const db = await initDB();
        const salvar = 'INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor';
        await db.run(salvar, ['pausada', pausada ? '1' : '0']);
        await db.run(salvar, ['recado_pausa', recado]);
    }
}

module.exports = Configuracao;
