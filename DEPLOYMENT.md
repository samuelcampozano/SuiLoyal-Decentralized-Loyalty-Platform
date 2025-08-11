# Deployment Guide

## Prerequisites

- [Sui CLI](https://docs.sui.io/build/install) installed and configured
- Node.js v18+ and npm/pnpm
- Sui wallet with devnet SUI tokens

## Smart Contract Deployment

### 1. Build and Test Contracts

```bash
cd sui-packages/Loyalty
sui move build
sui move test
```

### 2. Deploy to Devnet

```bash
# Ensure you're on devnet
sui client switch --env devnet

# Deploy the package
sui client publish --gas-budget 100000000
```

### 3. Save Contract Addresses

After successful deployment, note the:
- **Package ID**: The immutable package address
- **Platform ID**: The shared platform object address

## Frontend Configuration

### 1. Copy Configuration Template

```bash
cd frontend/src
cp config.template.ts config.ts
```

### 2. Update Contract Addresses

Edit `frontend/src/config.ts` and replace:
- `YOUR_PACKAGE_ID_HERE` with your deployed package ID
- `YOUR_PLATFORM_ID_HERE` with your platform object ID

### 3. Install Dependencies and Start

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables (Optional)

Instead of editing config.ts directly, you can use environment variables:

Create `frontend/.env`:
```env
VITE_PACKAGE_ID=0xYOUR_PACKAGE_ID
VITE_PLATFORM_ID=0xYOUR_PLATFORM_ID
```

## Verification

1. Connect your Sui wallet to the application
2. Switch wallet to devnet
3. The application should show 0 points balance (fetched from blockchain)
4. Create a loyalty account to test smart contract integration
5. Issue points and redeem rewards to test full functionality

## Current Deployment

- **Network**: Sui Devnet
- **Package ID**: `0xb9adb4c65f3bf18699698a03aa36aa040a75db5236e43dec054665b0dd42bcf2`
- **Platform ID**: `0x40aaace7d709522a0a46badbac2b5ed507f10c88c7dacff473f39636a4c267ba`
- **Explorer**: [View on Sui Explorer](https://suiexplorer.com/object/0xb9adb4c65f3bf18699698a03aa36aa040a75db5236e43dec054665b0dd42bcf2?network=devnet)

## Troubleshooting

### Common Issues

1. **"Insufficient balance"**: Ensure you have SUI tokens from the devnet faucet
2. **"Package not found"**: Verify contract addresses are correct in config
3. **"Network mismatch"**: Confirm both wallet and application are on devnet
4. **"Transaction failed"**: Check gas budget and wallet connection

### Getting Help

- Check transaction status on [Sui Explorer](https://suiexplorer.com/?network=devnet)
- Verify contract deployment with `sui client object <OBJECT_ID>`
- Review browser console for detailed error messages