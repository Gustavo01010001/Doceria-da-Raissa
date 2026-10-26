const Produto = require('../models/produtoModel');
const Pedido = require('../models/pedidoModel');
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

// Atualiza preço/nome com o que está no banco, tira do carrinho o que foi apagado ou esgotou
// e diminui a quantidade quando passou do estoque. "ajustados" diz o que foi diminuído.
async function sincronizarCarrinho(req) {
    const carrinho = [];
    const ajustados = [];
    for (const item of req.session.carrinho || []) {
        const produto = await Produto.buscarPorId(item.id);
        if (produto && produto.disponivel) {
            let quantidade = item.quantidade;
            if (produto.estoque !== null && quantidade > produto.estoque) {
                quantidade = produto.estoque;
                ajustados.push(`${produto.nome} (só ${produto.estoque === 1 ? 'resta 1' : 'restam ' + produto.estoque})`);
            }
            carrinho.push(itemDoCarrinho(produto, quantidade));
        }
    }
    req.session.carrinho = carrinho;
    return { carrinho, ajustados };
}

function avisoDeAjuste(ajustados) {
    return ajustados.length > 0 ? `Ajustamos a quantidade de: ${ajustados.join(', ')}.` : null;
}

// Tira do estoque os itens de pronta entrega. Se algum não tiver mais o suficiente
// (outro cliente comprou antes), devolve o que já tinha tirado e retorna o nome dele.
async function reservarEstoque(itens) {
    const reservados = [];
    for (const item of itens.filter(item => item.tipo !== 'encomenda')) {
        if (!(await Produto.baixarEstoque(item.id, item.quantidade))) {
            for (const reservado of reservados) await Produto.devolverEstoque(reservado.id, reservado.quantidade);
            return item.nome;
        }
        reservados.push(item);
    }
    return null;
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
            const item = (req.session.carrinho || []).find(item => item.id === produtoId);

            // Por que não deu pra adicionar (null = deu certo)
            let motivo = null;
            if (res.locals.pausa.pausada) motivo = 'pausada';
            else if (!produto || !produto.disponivel) motivo = 'esgotado';
            else if (produto.estoque !== null && item && item.quantidade >= produto.estoque) motivo = 'limite';

            if (!motivo) {
                if (!req.session.carrinho) req.session.carrinho = [];
                if (item) {
                    item.quantidade += 1;
                } else {
                    req.session.carrinho.push(itemDoCarrinho(produto, 1));
                }
            }

            // A vitrine adiciona sem recarregar a página
            if (querJson) {
                return res.json({
                    ok: !motivo,
                    motivo,
                    nome: produto ? produto.nome : null,
                    estoque: produto ? produto.estoque : null,
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
            const { carrinho, ajustados } = await sincronizarCarrinho(req);
            renderizarCarrinho(res, carrinho, avisoDeAjuste(ajustados));
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
            const { carrinho, ajustados } = await sincronizarCarrinho(req);

            if (carrinho.length === 0 || res.locals.pausa.pausada) {
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
            // O estoque mudou enquanto o cliente preenchia: mostra o carrinho ajustado antes de enviar
            else if (ajustados.length > 0) erro = avisoDeAjuste(ajustados);

            if (!erro) {
                const esgotou = await reservarEstoque(carrinho);
                if (esgotou) erro = `Ops, ${esgotou} acabou de esgotar. Confira o carrinho e tente de novo.`;
            }

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
            const total = resumoDoCarrinho(carrinho).total;
            texto += `*Total: ${formatarPreco(total)}*\n\n`;
            texto += `*Nome:* ${cliente.nome}\n`;
            texto += cliente.entrega === 'entrega'
                ? `*Entrega no endereço:* ${cliente.endereco}\n`
                : `*Vou retirar no local*\n`;
            texto += `*Pagamento:* ${cliente.pagamento}\n`;
            if (cliente.observacoes) texto += `*Observações:* ${cliente.observacoes}\n`;
            if (cliente.pagamento === 'Pix' && loja.pix) texto += `\n*Chave Pix da loja:* ${loja.pix}\n`;

            // Guarda uma cópia no painel da chef (aba Pedidos)
            await Pedido.incluir({
                ...cliente,
                endereco: cliente.entrega === 'entrega' ? cliente.endereco : null,
                dataEncomenda: encomendas.length > 0 ? cliente.dataEncomenda : null,
                // O id serve pra devolver ao estoque se o pedido for cancelado
                itens: carrinho.map(item => ({ id: item.id, nome: item.nome, preco: item.preco, quantidade: item.quantidade, tipo: item.tipo })),
                total
            });

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
