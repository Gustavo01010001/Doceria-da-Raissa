// Gera views/partials/granulado.ejs: o granulado espalhado no topo da vitrine.
//
// Cada granulado é um <i> separado (e não uma imagem só), pra poder cair do céu um por um quando a
// cliente abre a loja. Só a posição final fica aqui; a queda é feita no CSS (public/css/loja.css).
//
// Como o desenho é feito:
//  - uma faixa larga (2400 x 330 px) presa no centro do topo: o miolo fica livre pro logo, o nome,
//    o slogan e os botões; no celular aparecem só os granulados em volta do cupcake;
//  - pontos sorteados com distância mínima entre eles ("Poisson"): parece jogado à mão, sem grade;
//  - sorteio com semente fixa: rodar de novo dá sempre o mesmo resultado.
//
// Mudou alguma regra aqui? Rode:  npm run granulado
const fs = require('fs');
const path = require('path');

const ARQUIVO = path.join(__dirname, '../views/partials/granulado.ejs');
const W = 2400, H = 330, CX = W / 2;

let semente = 20261122;
function sorteio() {
    semente |= 0;
    semente = (semente + 0x6d2b79f5) | 0;
    let t = Math.imul(semente ^ (semente >>> 15), 1 | semente);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Áreas que ficam livres (dx = distância horizontal do centro do topo)
function livre(x, y) {
    const dx = x - CX, adx = Math.abs(dx);
    if (Math.hypot(dx, y - 74) < 60) return false;          // logo (cupcake)
    if (adx < 196 && y > 104 && y < 184) return false;      // nome da loja
    if (adx < 238 && y > 158 && y < 220) return false;      // slogan (1 linha no PC, 2 no celular)
    if (adx < 206 && y > 212 && y < 286) return false;      // botões WhatsApp / Instagram
    if (dx > 92 && dx < 204 && y < 70) return false;        // botão do tema no celular (320 a 414 px)
    return true;
}

// Pontos com distância mínima entre eles (algoritmo de Bridson)
const R = 78, TENTATIVAS = 30, CASA = R / Math.SQRT2;
const colunas = Math.ceil(W / CASA), linhas = Math.ceil(H / CASA);
const grade = new Array(colunas * linhas).fill(-1);
const pontos = [], ativos = [];

function adicionar(p) {
    pontos.push(p);
    ativos.push(p);
    grade[Math.floor(p[1] / CASA) * colunas + Math.floor(p[0] / CASA)] = pontos.length - 1;
}

function longeDosOutros(x, y) {
    // os granulados do celular (os 9 primeiros) podem dividir a mesma casa da grade: confere um a um
    for (let i = 0; i < Math.min(9, pontos.length); i++) {
        if (Math.hypot(pontos[i][0] - x, pontos[i][1] - y) < R) return false;
    }
    const gx = Math.floor(x / CASA), gy = Math.floor(y / CASA);
    for (let j = Math.max(0, gy - 2); j <= Math.min(linhas - 1, gy + 2); j++) {
        for (let i = Math.max(0, gx - 2); i <= Math.min(colunas - 1, gx + 2); i++) {
            const q = grade[j * colunas + i];
            if (q >= 0 && Math.hypot(pontos[q][0] - x, pontos[q][1] - y) < R) return false;
        }
    }
    return true;
}

// 1º: a faixa que aparece no celular (em cima, dos dois lados do logo) ganha um espaçamento menor,
// senão quase nada aparece numa tela de 375 px
const RM = 44;
for (let t = 0, n = 0; t < 4000 && n < 9; t++) {
    const x = CX - 187 + sorteio() * 374, y = 10 + sorteio() * 96;
    if (!livre(x, y)) continue;
    if (pontos.some(([qx, qy]) => Math.hypot(qx - x, qy - y) < RM)) continue;
    adicionar([x, y]);
    n++;
}
ativos.length = 0;

// 2º: o resto do topo, mais espaçado
adicionar([CX - 600, 120]);
while (ativos.length) {
    const indice = Math.floor(sorteio() * ativos.length);
    const [px, py] = ativos[indice];
    let achou = false;
    for (let t = 0; t < TENTATIVAS; t++) {
        const angulo = sorteio() * Math.PI * 2, distancia = R * (1 + sorteio());
        const x = px + Math.cos(angulo) * distancia, y = py + Math.sin(angulo) * distancia;
        if (x < 6 || x > W - 6 || y < 8 || y > H - 12) continue;
        if (longeDosOutros(x, y)) {
            adicionar([x, y]);
            achou = true;
            break;
        }
    }
    if (!achou) ativos.splice(indice, 1);
}

// Tira os que caem nas áreas livres; perto do miolo fica um pouco mais ralo
const usados = pontos.filter(([x, y], i) => {
    if (!livre(x, y)) return false;
    if (i < 9 && Math.abs(x - CX) < 187 && y < 110) return true;
    const adx = Math.abs(x - CX);
    const chance = 0.6 + 0.4 * Math.min(1, Math.max(0, (adx - 160) / 640));
    return sorteio() < chance;
});

// Cada ponto vira um granulado (bastãozinho) ou, às vezes, um confeito redondo.
// Espessura do bastão: 4,5 px com pontas redondas.
const formas = usados.map(([x, y]) => {
    const cor = ['a', 'b', 'c'][Math.floor(sorteio() * 3)];
    if (sorteio() < 0.16) return { cor, x, y, bola: true, tamanho: 2 * (2.6 + sorteio() * 1.2), angulo: 0 };
    const comprimento = 8 + sorteio() * 6, angulo = sorteio() * Math.PI;
    return { cor, x, y, bola: false, tamanho: comprimento + 4.5, angulo: (angulo * 180) / Math.PI };
});

// Queda de cada um (sorteada depois do desenho, pra não mudar as posições):
//  d = espera antes de cair (os do meio caem primeiro), t = tempo da queda,
//  q = de quantos px acima ele vem (sempre de fora do topo), s = quanto gira enquanto cai
const um = v => Math.round(v * 10) / 10;
const tags = formas.map(f => {
    const adx = Math.abs(f.x - CX);
    const espera = Math.round((adx / 1200) * 250 + sorteio() * 400);
    const queda = Math.round(650 + sorteio() * 350);
    const altura = Math.round(f.y + 40 + sorteio() * 80);
    const giro = Math.round((sorteio() < 0.5 ? -1 : 1) * (100 + sorteio() * 200));
    const classe = f.bola ? `g${f.cor} bola` : `g${f.cor}`;
    const estilo = `--x:${um(f.x - CX)};--y:${um(f.y)};--a:${Math.round(f.angulo)};--l:${um(f.tamanho)};--d:${espera};--t:${queda};--q:${altura};--s:${giro}`;
    return `    <i class="${classe}" style="${estilo}"></i>`;
});

const saida = [
    '<%# Gerado por scripts/gerar-granulado.js (npm run granulado). Não edite à mão. %>',
    '<div class="granulado" aria-hidden="true">',
    ...tags,
    '</div>',
    ''
].join('\n');

fs.writeFileSync(ARQUIVO, saida);
const visiveis = largura => usados.filter(([x]) => Math.abs(x - CX) < largura / 2).length;
console.log(`granulado.ejs: ${formas.length} granulados (${visiveis(375)} no celular, ${visiveis(1425)} em 1440 px, ${visiveis(1905)} em 1920 px), ${saida.length} bytes`);
