const Pedido = require('../models/pedidoModel');
const Produto = require('../models/produtoModel');
const { dataDaquiA } = require('../utils/formatar');

// Soma as quantidades por doce: [{ nome, quantidade, total }], do que mais saiu pro que menos saiu
function somarItens(itens) {
    const soma = {};
    for (const item of itens) {
        soma[item.nome] ||= { nome: item.nome, quantidade: 0, total: 0 };
        soma[item.nome].quantidade += item.quantidade;
        soma[item.nome].total += item.preco * item.quantidade;
    }
    return Object.values(soma).sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, 'pt-BR'));
}

function resumir(pedidos) {
    const total = pedidos.reduce((soma, pedido) => soma + pedido.total, 0);
    return { pedidos: pedidos.length, total, ticketMedio: pedidos.length ? total / pedidos.length : 0 };
}

// Itens de pronta entrega com controle de estoque (os pedidos antigos não guardavam o id)
function itensDoEstoque(pedido) {
    return pedido.itens.filter(item => item.id && item.tipo !== 'encomenda');
}

class PedidoController {

    constructor() {
        if (!PedidoController.instance) {
            PedidoController.instance = this;
        }
        return PedidoController.instance;
    }

    async exibirPedidos(req, res) {
        // ?status=novo filtra a lista; sem nada, mostra todos
        const filtro = Object.hasOwn(Pedido.STATUS, req.query.status) ? req.query.status : null;
        try {
            const [pedidos, encomendas, contagem] = await Promise.all([
                Pedido.buscarTodos(filtro),
                Pedido.buscarEncomendasAPartirDe(dataDaquiA(0)),
                Pedido.contarPorStatus()
            ]);

            // Agrupa as encomendas por data e soma o que precisa ser feito em cada dia:
            // { '2026-10-28': { pedidos: [...], producao: [{ nome: 'Bolo de pote', quantidade: 12 }] } }
            const encomendasPorData = {};
            for (const pedido of encomendas) {
                (encomendasPorData[pedido.data_encomenda] ||= { pedidos: [] }).pedidos.push(pedido);
            }
            for (const dia of Object.values(encomendasPorData)) {
                const itens = dia.pedidos.flatMap(pedido => pedido.itens.filter(item => item.tipo === 'encomenda'));
                dia.producao = somarItens(itens);
            }

            res.render('pedidos', {
                pedidos,
                encomendasPorData,
                contagem,
                filtro,
                statusPedido: Pedido.STATUS
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar pedidos");
        }
    }

    async alterarStatus(req, res) {
        const { id, status } = req.body;
        // Volta para a mesma lista que estava aberta
        const voltar = Object.hasOwn(Pedido.STATUS, req.body.filtro) ? `/admin/pedidos?status=${req.body.filtro}` : '/admin/pedidos';
        try {
            const pedido = await Pedido.buscarPorId(id);
            if (pedido && Object.hasOwn(Pedido.STATUS, status) && status !== pedido.status) {
                // Cancelou: as unidades voltam pro estoque. Desfez o cancelamento: saem de novo (se ainda tiver).
                if (status === 'cancelado') {
                    for (const item of itensDoEstoque(pedido)) await Produto.devolverEstoque(item.id, item.quantidade);
                } else if (pedido.status === 'cancelado') {
                    for (const item of itensDoEstoque(pedido)) await Produto.baixarEstoque(item.id, item.quantidade);
                }
                await Pedido.alterarStatus(id, status);
            }
            res.redirect(voltar);
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao alterar o pedido");
        }
    }

    // O painel pergunta de tempos em tempos se chegou pedido novo
    async contarNovos(req, res) {
        try {
            res.json({ novos: await Pedido.contarNovos() });
        } catch (error) {
            console.error(error);
            res.status(500).json({ novos: null });
        }
    }

    async exibirVendas(req, res) {
        const hoje = dataDaquiA(0);
        const inicioDaSemana = dataDaquiA(-6); // últimos 7 dias, contando hoje
        const inicioDoMes = hoje.slice(0, 8) + '01';
        try {
            // Busca desde o que vier antes (o mês pode ter começado depois dos últimos 7 dias, ou antes)
            const pedidos = await Pedido.buscarVendasDesde(inicioDaSemana < inicioDoMes ? inicioDaSemana : inicioDoMes);
            const doMes = pedidos.filter(pedido => pedido.dia >= inicioDoMes);

            res.render('vendas', {
                hoje: resumir(pedidos.filter(pedido => pedido.dia === hoje)),
                semana: resumir(pedidos.filter(pedido => pedido.dia >= inicioDaSemana)),
                mes: resumir(doMes),
                maisVendidos: somarItens(doMes.flatMap(pedido => pedido.itens)).slice(0, 10),
                nomeDoMes: new Date(hoje + 'T12:00:00Z').toLocaleDateString('pt-BR', { month: 'long', timeZone: 'UTC' })
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Erro ao carregar vendas");
        }
    }
}

const instance = new PedidoController();
Object.freeze(instance);
module.exports = instance;
