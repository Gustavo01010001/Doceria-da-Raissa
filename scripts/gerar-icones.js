// Gera public/css/icones.css só com os ícones que o site usa de verdade.
// Antes o site baixava a coleção inteira do Phosphor (6 arquivos de estilo e 4 fontes, mais de 1 MB)
// para mostrar umas 40 figuras. Agora elas vão dentro de um arquivo pequeno do próprio site.
//
// Usou um ícone novo em alguma tela? Rode:  npm run icones
const fs = require('fs');
const path = require('path');

const PASTA_VIEWS = path.join(__dirname, '../views');
const ARQUIVO_CSS = path.join(__dirname, '../public/css/icones.css');
const ORIGEM = 'https://unpkg.com/@phosphor-icons/core@2.1.1/assets';

// Classe do peso -> pasta e final do nome do arquivo na coleção
const PESOS = {
    'ph': { pasta: 'regular', final: '' },
    'ph-bold': { pasta: 'bold', final: '-bold' },
    'ph-fill': { pasta: 'fill', final: '-fill' },
    'ph-light': { pasta: 'light', final: '-light' }
};

function lerViews(pasta = PASTA_VIEWS) {
    return fs.readdirSync(pasta, { withFileTypes: true })
        .map(item => {
            const caminho = path.join(pasta, item.name);
            if (item.isDirectory()) return lerViews(caminho);
            return item.name.endsWith('.ejs') ? fs.readFileSync(caminho, 'utf8') : '';
        })
        .join('\n');
}

// Lista do tipo ["ph-bold ph-plus", "ph ph-trash", ...] com tudo que aparece nas telas
function iconesUsados() {
    const texto = lerViews();
    const usados = new Set();
    const nomesComPeso = new Set();

    for (const [, peso, nome] of texto.matchAll(/\b(ph|ph-bold|ph-fill|ph-light) (ph-[a-z0-9-]+)/g)) {
        usados.add(`${peso} ${nome}`);
        nomesComPeso.add(nome);
    }

    // Ícones escolhidos pelo código, ex: class="ph-bold <%= aba.icone %>" com icone: 'ph-lightning'
    const pesosDinamicos = new Set([...texto.matchAll(/\b(ph|ph-bold|ph-fill|ph-light) <%/g)].map(achado => achado[1]));
    for (const [, nome] of texto.matchAll(/['"`](ph-[a-z0-9-]+)['"`]/g)) {
        if (PESOS[nome] || nomesComPeso.has(nome)) continue;
        for (const peso of pesosDinamicos) usados.add(`${peso} ${nome}`);
    }

    return [...usados].sort();
}

// Ícones usados nas telas que ainda não estão no icones.css
function iconesFaltando() {
    const css = fs.existsSync(ARQUIVO_CSS) ? fs.readFileSync(ARQUIVO_CSS, 'utf8') : '';
    return iconesUsados().filter(icone => !css.includes(seletor(icone) + ' {'));
}

function seletor(icone) {
    const [peso, nome] = icone.split(' ');
    return `.${peso}.${nome}`;
}

async function baixarDesenho(icone) {
    const [peso, nome] = icone.split(' ');
    const { pasta, final } = PESOS[peso];
    const endereco = `${ORIGEM}/${pasta}/${nome.replace(/^ph-/, '')}${final}.svg`;
    const resposta = await fetch(endereco);
    if (!resposta.ok) throw new Error(`Não achei o ícone "${icone}" (${endereco})`);
    const svg = (await resposta.text()).trim().replace(/fill="currentColor"/g, 'fill="#000"');
    return svg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E');
}

async function gerar() {
    const icones = iconesUsados();
    const regras = [];
    for (const icone of icones) {
        regras.push(`${seletor(icone)} { --desenho: url("data:image/svg+xml,${await baixarDesenho(icone)}"); }`);
    }

    const css = `/* Arquivo gerado por scripts/gerar-icones.js (npm run icones). Não edite na mão. */
/* Ícones Phosphor (licença MIT), só os ${icones.length} que o site usa. */

.ph, .ph-bold, .ph-fill, .ph-light {
    display: inline-block;
    width: 1em;
    height: 1em;
    flex-shrink: 0;
    vertical-align: -0.125em;
    background-color: currentColor;
    -webkit-mask: var(--desenho) center / contain no-repeat;
    mask: var(--desenho) center / contain no-repeat;
}

${regras.join('\n')}
`;
    fs.writeFileSync(ARQUIVO_CSS, css);
    console.log(`${icones.length} ícones gravados em public/css/icones.css (${(css.length / 1024).toFixed(1)} KB)`);
}

module.exports = { iconesUsados, iconesFaltando };

if (require.main === module) {
    gerar().catch(erro => {
        console.error(erro.message);
        process.exit(1);
    });
}
