# Deployment & Development Scripts

## 🎯 Purpose
Automation scripts for development, deployment, and maintenance tasks.

## 📋 Available Scripts
- ✅ `deploy.sh` - Smart contract deployment automation
- ✅ `publish_devnet.sh` - Devnet deployment script  
- ✅ `publish_devnet.ps1` - Windows PowerShell version

## 📋 Planned Scripts
- [ ] `setup-dev-env.sh` - Complete development environment setup
- [ ] `test-all.sh` - Run all tests (contracts + frontend)
- [ ] `build-production.sh` - Production build pipeline
- [ ] `seed-sample-data.py` - Generate sample merchants & rewards
- [ ] `backup-keys.sh` - Wallet key backup utilities
- [ ] `monitor-deployment.sh` - Post-deployment health checks

## 🏗️ Planned Structure
```
scripts/
├── deployment/
│   ├── deploy-contracts.sh
│   ├── deploy-frontend.sh
│   └── deploy-full-stack.sh
├── development/
│   ├── setup-dev-env.sh
│   ├── reset-local-env.sh
│   └── generate-test-data.py
├── maintenance/
│   ├── backup-data.sh
│   ├── update-contracts.sh
│   └── monitor-health.sh
└── utilities/
    ├── key-management.sh
    └── network-switcher.sh
```

## 🚀 Implementation Priority
**High Priority**: Development environment setup
**Medium Priority**: Testing automation
**Low Priority**: Advanced monitoring & maintenance

## 📝 Usage Examples
```bash
# Current usage
./scripts/deploy.sh
./scripts/publish_devnet.sh

# Planned usage  
./scripts/setup-dev-env.sh --fresh-install
./scripts/seed-sample-data.py --merchants 5 --rewards 20
```