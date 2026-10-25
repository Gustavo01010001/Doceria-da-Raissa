// Dados da loja. Dá pra trocar tudo por variável de ambiente na hospedagem,
// sem precisar mexer no código.
module.exports = {
    nome: process.env.LOJA_NOME || 'Doceria da Chef',
    slogan: process.env.LOJA_SLOGAN || 'Doces feitos com carinho. Faça seu pedido online!',
    // Só números, com DDI + DDD (ex: 5518999999999)
    whatsapp: process.env.LOJA_WHATSAPP || '5518996469830',
    // Só o @ sem o arroba (ex: doceriadachef). Deixe vazio pra esconder o botão.
    instagram: process.env.LOJA_INSTAGRAM || '',
    // Quantos dias de antecedência a chef precisa para fazer uma encomenda
    antecedenciaEncomenda: parseInt(process.env.LOJA_ANTECEDENCIA_ENCOMENDA || '2'),

    adminUsuario: process.env.ADMIN_USUARIO || 'admin',
    adminSenha: process.env.ADMIN_SENHA || 'senha123',
    sessionSecret: process.env.SESSION_SECRET || 'doceria-super-secreta'
};
