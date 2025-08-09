#!/usr/bin/env bash
set -euo pipefail

echo "Setting up local dev environment for SuiLoyal..."

# Requirements: git, Node.js (>= 18), npm, Python (>=3.10), pip, Sui CLI
# On Windows, use WSL or Git Bash.

# Node
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Install from https://nodejs.org/en/download"; exit 1; fi
node -v

# Python
if ! command -v python3 >/dev/null 2>&1 && ! command -v python >/dev/null 2>&1; then
  echo "Python not found. Install Python 3.11+"; exit 1; fi

# Sui CLI
if ! command -v sui >/dev/null 2>&1; then
  echo "Sui CLI not found. See https://docs.sui.io/guides/developer/getting-started/sui-install"; fi

# Backend deps
python -m pip install --upgrade pip || true
pip install -r backend/requirements.txt || true

# Frontend deps
( cd frontend && npm install ) || true

echo "Done. See README for next steps."
