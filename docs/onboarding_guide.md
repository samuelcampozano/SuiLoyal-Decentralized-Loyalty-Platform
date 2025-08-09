# Onboarding Guide

1. Install prerequisites: Sui CLI, Node 20, Python 3.11.
2. Run `scripts/dev_env_setup.sh` (WSL/Git Bash on Windows).
3. Backend: `uvicorn app.main:app --reload` from `backend/`.
4. Frontend: `npm run dev` from `frontend/`.
5. Move: `cd sui-packages/Loyalty && sui move build && sui move test`.
6. Optional: publish to devnet with `scripts/publish_devnet.sh`.
