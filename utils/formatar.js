function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

// Aceita "15", "15,5", "15,50", "15.50" e com ponto de milhar ("1.234,56").
// Retorna null se tiver letra, mais de 2 casas depois da vírgula ou for zero.
function converterPreco(texto) {
    let valor = String(texto || '').trim().replace(/^R\$\s*/i, '');
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(valor)) {
        valor = valor.replace(/\./g, '');
    } else if (!/^\d+([.,]\d{1,2})?$/.test(valor)) {
        return null;
    }
    const numero = Number(valor.replace(',', '.'));
    return numero > 0 ? Math.round(numero * 100) / 100 : null;
}

// Data de hoje no horário de Brasília + N dias, no formato "AAAA-MM-DD" (o mesmo do <input type="date">)
function dataDaquiA(dias) {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const data = new Date(hoje + 'T00:00:00Z');
    data.setUTCDate(data.getUTCDate() + dias);
    return data.toISOString().slice(0, 10);
}

// "2026-10-27" -> "27/10/2026"
function formatarData(texto) {
    const [ano, mes, dia] = texto.split('-');
    return `${dia}/${mes}/${ano}`;
}

// "2026-10-27 22:15:00" (UTC, como o SQLite grava) -> "27/10/2026, 19:15" no horário de Brasília
function formatarDataHora(texto) {
    return new Date(texto.replace(' ', 'T') + 'Z').toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short'
    });
}

function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
    const data = new Date(texto + 'T00:00:00Z');
    return !isNaN(data) && data.toISOString().slice(0, 10) === texto;
}

module.exports = { formatarPreco, converterPreco, dataDaquiA, formatarData, formatarDataHora, dataValida };
