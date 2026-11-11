const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// A foto original fica com até 1600px (boa pra ver de perto e pra prévia do link).
// Na vitrine, no carrinho e no painel ela aparece pequena, então usamos uma cópia de 600px:
// baixa bem mais rápido e gasta uns 7x menos memória do celular, o que deixa a rolagem lisa.
const PASTA_UPLOADS = path.join(__dirname, '../public/uploads');
const PASTA_MINI = path.join(PASTA_UPLOADS, 'mini');
const EXTENSOES = ['.webp', '.jpg', '.jpeg', '.png'];
const TAMANHO = 600;

// Miniaturas sendo criadas agora (dois pedidos pela mesma foto esperam a mesma criação)
const emAndamento = new Map();

// "/uploads/123.webp" -> "/uploads/mini/123.webp"
function caminhoDaMiniatura(imagem) {
    if (!imagem || !imagem.startsWith('/uploads/')) return imagem;
    return '/uploads/mini/' + path.parse(imagem).name + '.webp';
}

function arquivoDaMiniatura(imagem) {
    return path.join(PASTA_MINI, path.parse(imagem).name + '.webp');
}

// Cria a miniatura da foto com esse nome (sem a extensão) e devolve o caminho do arquivo.
// Devolve null se a foto original não existir.
async function gerarMiniatura(nome) {
    const original = EXTENSOES.map(extensao => path.join(PASTA_UPLOADS, nome + extensao)).find(arquivo => fs.existsSync(arquivo));
    if (!original) return null;

    const destino = path.join(PASTA_MINI, nome + '.webp');
    if (!emAndamento.has(nome)) {
        const criacao = fs.promises.mkdir(PASTA_MINI, { recursive: true })
            .then(() => fs.promises.readFile(original))
            .then(foto => sharp(foto)
                .rotate()
                .resize({ width: TAMANHO, height: TAMANHO, fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 78 })
                .toFile(destino + '.tmp'))
            .then(() => fs.promises.rename(destino + '.tmp', destino))
            .finally(() => emAndamento.delete(nome));
        emAndamento.set(nome, criacao);
    }
    await emAndamento.get(nome);
    return destino;
}

module.exports = { caminhoDaMiniatura, arquivoDaMiniatura, gerarMiniatura };
