#!/usr/bin/env bash
# Puxa a versão mais nova do GitHub e reinicia o site.
# Uso, dentro da pasta do projeto no servidor:  bash deploy/atualizar.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull
npm ci --omit=dev
pm2 reload doceria

echo "Site atualizado!"
