const session = require('express-session');
const initDB = require('./db');

const UMA_HORA = 60 * 60 * 1000;
const PADRAO_SEM_COOKIE = 24 * UMA_HORA;

// Guarda as sessões na tabela "sessoes" do mesmo banco da loja
class SessaoStore extends session.Store {

    constructor() {
        super();
        // Apaga as sessões vencidas de hora em hora
        setInterval(() => this.limparVencidas(), UMA_HORA).unref();
    }

    expiracao(sessao) {
        const cookie = sessao.cookie || {};
        return cookie.expires ? new Date(cookie.expires).getTime() : Date.now() + PADRAO_SEM_COOKIE;
    }

    get(sid, callback) {
        initDB()
            .then(db => db.get('SELECT dados, expira FROM sessoes WHERE sid = ?', [sid]))
            .then(linha => {
                if (!linha || linha.expira < Date.now()) return callback(null, null);
                callback(null, JSON.parse(linha.dados));
            })
            .catch(callback);
    }

    set(sid, sessao, callback = () => {}) {
        initDB()
            .then(db => db.run(
                'INSERT INTO sessoes (sid, dados, expira) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET dados = excluded.dados, expira = excluded.expira',
                [sid, JSON.stringify(sessao), this.expiracao(sessao)]
            ))
            .then(() => callback(null))
            .catch(callback);
    }

    // Chamado quando a sessão é usada sem mudar nada (renova o prazo)
    touch(sid, sessao, callback = () => {}) {
        initDB()
            .then(db => db.run('UPDATE sessoes SET expira = ? WHERE sid = ?', [this.expiracao(sessao), sid]))
            .then(() => callback(null))
            .catch(callback);
    }

    destroy(sid, callback = () => {}) {
        initDB()
            .then(db => db.run('DELETE FROM sessoes WHERE sid = ?', [sid]))
            .then(() => callback(null))
            .catch(callback);
    }

    limparVencidas() {
        initDB()
            .then(db => db.run('DELETE FROM sessoes WHERE expira < ?', [Date.now()]))
            .catch(erro => console.error('Erro ao limpar sessões vencidas:', erro));
    }
}

module.exports = SessaoStore;
