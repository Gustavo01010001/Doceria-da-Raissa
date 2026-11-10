// Conta quantas vezes cada pessoa (IP) fez algo dentro de uma janela de tempo.
// Fica só na memória: se o site reiniciar, a contagem começa do zero.
function criarLimitador({ maximo, janela }) {
    const contagens = new Map();

    // Esquece quem já passou do prazo, pra memória não crescer
    setInterval(() => {
        const agora = Date.now();
        for (const [chave, registro] of contagens) {
            if (registro.expira <= agora) contagens.delete(chave);
        }
    }, janela).unref();

    function registroValido(chave) {
        const registro = contagens.get(chave);
        return registro && registro.expira > Date.now() ? registro : null;
    }

    return {
        bloqueado(chave) {
            const registro = registroValido(chave);
            return Boolean(registro) && registro.total >= maximo;
        },

        registrar(chave) {
            const registro = registroValido(chave) || { total: 0, expira: Date.now() + janela };
            registro.total += 1;
            contagens.set(chave, registro);
        },

        limpar(chave) {
            contagens.delete(chave);
        }
    };
}

module.exports = { criarLimitador };
