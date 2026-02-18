#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
PROJECT_NAME="$(basename "${ROOT_DIR}")"
OUT_DIR="${PARENT_DIR}/${PROJECT_NAME}-rendu"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"
rm -rf "${ROOT_DIR}/rendu-ecf"

rsync -a \
  --exclude '.git' \
  --exclude '.vscode' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'data/app.db' \
  --exclude 'rendu-ecf' \
  --exclude '.DS_Store' \
  "${ROOT_DIR}/" "${OUT_DIR}/"

echo "Dossier de rendu genere: ${OUT_DIR}"
echo "Contenu inclus: sources + schemas + scripts + README + .env.example"
