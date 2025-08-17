# Backend API (Planned)

## 🎯 Purpose
FastAPI backend for SUI event indexing and REST API endpoints.

## 📋 Planned Features
- [ ] Event indexing from SUI blockchain
- [ ] REST API for loyalty data
- [ ] Authentication & authorization
- [ ] Analytics endpoints
- [ ] Merchant dashboard APIs

## 🏗️ Planned Structure
```
backend/
├── app/
│   ├── api/v1/         # API endpoints
│   ├── core/           # Configuration & SUI client
│   ├── db/             # Database models & CRUD
│   └── services/       # Business logic
├── requirements.txt    # Python dependencies
└── Dockerfile         # Container configuration
```

## 🚀 Implementation Status
**Status**: Planning phase
**Priority**: Medium (frontend-first approach working well)
**Dependencies**: Requires SUI event indexing research

## 📝 Notes
Current frontend connects directly to SUI RPC. Backend will add:
- Event indexing for faster queries
- Analytics and reporting
- Multi-merchant management
- API rate limiting