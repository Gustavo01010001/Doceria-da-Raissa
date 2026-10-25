function formatarPreco(valor) {
    return 'R$ ' + Number(valor).toFixed(2).replace('.', ',');
}

// Aceita "15,50", "15.50" ou "15". Retorna null se não for um preço válido.
function converterPreco(texto) {
    const valor = parseFloat(String(texto || '').trim().replace(',', '.'));
    return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : null;
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

function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
    const data = new Date(texto + 'T00:00:00Z');
    return !isNaN(data) && data.toISOString().slice(0, 10) === texto;
}

module.exports = { formatarPreco, converterPreco, dataDaquiA, formatarData, dataValida };
