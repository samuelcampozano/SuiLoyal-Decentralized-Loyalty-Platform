# SuiLoyal — Decentralized Loyalty Platform

A full-stack scaffold for a decentralized loyalty program on Sui.

- Move package: `sui-packages/Loyalty`
- Backend: FastAPI (`backend`)
- Frontend: React + Vite + TypeScript (`frontend`)
- CI: GitHub Actions for Move, backend, and frontend tests
- Infra: Docker Compose + optional Kubernetes manifests

## Quick Start

- Backend: see `backend/requirements.txt`, then `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend` → `npm install` → `npm run dev`
- Move: `cd sui-packages/Loyalty` → `sui move build && sui move test`

On Windows, prefer WSL or Git Bash for shell scripts in `scripts/`.
