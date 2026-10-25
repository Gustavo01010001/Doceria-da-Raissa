#!/usr/bin/env bash
# Cópia de segurança do banco e das fotos. Roda sozinho todo dia às 3h (configurado pelo instalar.sh).
# Guarda as últimas 14 cópias na pasta backups/.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p backups

DATA="$(date +%Y-%m-%d)"
rm -f backups/banco.sqlite

# Copia o banco com segurança mesmo com o site ligado
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('doceria.sqlite');
db.run(\"VACUUM INTO 'backups/banco.sqlite'\", (erro) => {
    if (erro) { console.error(erro); process.exit(1); }
    db.close();
});
"

tar -czf "backups/doceria-$DATA.tar.gz" backups/banco.sqlite public/uploads
rm -f backups/banco.sqlite

# Apaga as cópias mais antigas
ls -1t backups/doceria-*.tar.gz | tail -n +15 | xargs -r rm --

echo "$(date) backup feito: backups/doceria-$DATA.tar.gz"
