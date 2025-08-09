# Architecture

- Move contracts under `sui-packages/Loyalty` emit events for merchant signup, points accrual, and redemption.
- Backend (FastAPI) indexes events and exposes a REST API.
- Frontend (React) integrates Sui wallet and calls the backend.
- Infra: Docker Compose for local dev; optional k8s manifests for prod.
