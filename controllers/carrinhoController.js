const Produto = require('../models/produtoModel');
const loja = require('../config/loja');
const { formatarPreco, dataDaquiA, formatarData, dataValida } = require('../utils/formatar');

const PAGAMENTOS = ['Pix', 'Dinheiro', 'Cartão'];

function itemDoCarrinho(produto, quantidade) {
    return {
        id: produto.id,
        nome: produto.nome,
        preco: produto.preco,
        imagem: produto.imagem,
        tipo: produto.tipo,
        quantidade
    };
}

function renderizarCarrinho(res, carrinho, erro = null, cliente = {}) {
    const { total } = resumoDoCarrinho(carrinho);
    res.render('carrinho', {
        carrinho,
        total,
        erro,
        cliente,
        pagamentos: PAGAMENTOS,
        temEncomenda: carrinho.some(item => item.tipo === 'encomenda'),
        dataMinima: dataDaquiA(loja.antecedenciaEncomenda)
    });
}

function resumoDoCarrinho(carrinho) {
    return {
        quantidade: carrinho.reduce((soma, item) => soma + item.quantidade, 0),
        total: carrinho.reduce((soma, item) => soma + (item.preco * item.quantidade), 0)
    };
}

// Atualiza preço/nome com o que está no banco e tira do carrinho o que foi apagado ou esgotou
async function sincronizarCarrinho(req) {
    const atualizado = [];
    for (const item of req.session.carrinho || []) {
        const produto = await Produto.buscarPorId(item.id);
        if (produto && produto.disponivel) {
            atualizado.push(itemDoCarrinho(produto, item.quantidade));
        }
    }
    req.session.carrinho = atualizado;
    return atualizado;
}

class CarrinhoController {

    constructor() {
        if (!CarrinhoController.instance) {
            CarrinhoController.instance = this;
        }
        return CarrinhoController.instance;
    }

    async adicionarAoCarrinho(req, res) {
        const produtoId = parseInt(req.body.produtoId);
        const querJson = (req.get('Accept') || '').includes('application/json');
        try {
            const produto = await Produto.buscarPorId(produtoId);

            if (produto && produto.disponivel) {
                if (!req.session.carrinho) req.session.carrinho = [];

                const item = req.session.carrinho.find(item => item.id === produtoId);
                if (item) {
                    item.quantidade += 1;
                } else {
                    req.session.carrinho.push(itemDoCarrinho(produto, 1));
                }
            }

            // A vitrine adiciona sem recarregar a página
            if (querJson) {
                return res.json({
                    ok: Boolean(produto && produto.disponivel),
                    nome: produto ? produto.nome : null,
                    ...resumoDoCarrinho(req.session.carrinho || [])
                });
            }
            res.redirect('/carrinho');
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao adicionar ao carrinho");
        }
    }

    async exibirCarrinho(req, res) {
        try {
            const carrinho = await sincronizarCarrinho(req);
            renderizarCarrinho(res, carrinho);
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar o carrinho");
        }
    }

    alterarQuantidade(req, res) {
        const produtoId = parseInt(req.body.produtoId);
        const carrinho = req.session.carrinho || [];
        const item = carrinho.find(item => item.id === produtoId);

        if (item) {
            if (req.body.acao === 'mais') item.quantidade += 1;
            if (req.body.acao === 'menos') item.quantidade -= 1;
            if (req.body.acao === 'remover') item.quantidade = 0;
        }

        req.session.carrinho = carrinho.filter(item => item.quantidade > 0);
        res.redirect('/carrinho');
    }

    limparCarrinho(req, res) {
        req.session.carrinho = [];
        res.redirect('/carrinho');
    }

    async finalizarPedido(req, res) {
        try {
            const carrinho = await sincronizarCarrinho(req);

            if (carrinho.length === 0) {
                return res.redirect('/carrinho');
            }

            const cliente = {
                nome: (req.body.nome || '').trim(),
                entrega: req.body.entrega === 'entrega' ? 'entrega' : 'retirada',
                endereco: (req.body.endereco || '').trim(),
                pagamento: PAGAMENTOS.includes(req.body.pagamento) ? req.body.pagamento : '',
                dataEncomenda: (req.body.dataEncomenda || '').trim(),
                observacoes: (req.body.observacoes || '').trim()
            };

            const prontaEntrega = carrinho.filter(item => item.tipo !== 'encomenda');
            const encomendas = carrinho.filter(item => item.tipo === 'encomenda');
            const dataMinima = dataDaquiA(loja.antecedenciaEncomenda);

            let erro = null;
            if (!cliente.nome) erro = 'Informe seu nome.';
            else if (cliente.entrega === 'entrega' && !cliente.endereco) erro = 'Informe o endereço de entrega.';
            else if (encomendas.length > 0 && !dataValida(cliente.dataEncomenda)) erro = 'Escolha a data da encomenda.';
            else if (encomendas.length > 0 && cliente.dataEncomenda < dataMinima) erro = `A encomenda precisa ser para ${formatarData(dataMinima)} ou depois.`;
            else if (!cliente.pagamento) erro = 'Escolha a forma de pagamento.';

            if (erro) {
                res.status(400);
                return renderizarCarrinho(res, carrinho, erro, cliente);
            }

            const listarItens = itens => itens
                .map(item => `${item.quantidade}x ${item.nome} - ${formatarPreco(item.preco * item.quantidade)}\n`)
                .join('');

            let texto = `Olá! Gostaria de fazer o seguinte pedido:\n\n`;
            if (prontaEntrega.length > 0) {
                texto += `*Pronta entrega:*\n${listarItens(prontaEntrega)}\n`;
            }
            if (encomendas.length > 0) {
                texto += `*Encomenda para ${formatarData(cliente.dataEncomenda)}:*\n${listarItens(encomendas)}\n`;
            }
            texto += `*Total: ${formatarPreco(resumoDoCarrinho(carrinho).total)}*\n\n`;
            texto += `*Nome:* ${cliente.nome}\n`;
            texto += cliente.entrega === 'entrega'
                ? `*Entrega no endereço:* ${cliente.endereco}\n`
                : `*Vou retirar no local*\n`;
            texto += `*Pagamento:* ${cliente.pagamento}\n`;
            if (cliente.observacoes) texto += `*Observações:* ${cliente.observacoes}\n`;

            req.session.carrinho = [];

            const url = `https://wa.me/${loja.whatsapp}?text=${encodeURIComponent(texto)}`;
            res.redirect(url);
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao finalizar o pedido");
        }
    }
}

const instance = new CarrinhoController();
Object.freeze(instance);
module.exports = instance;
