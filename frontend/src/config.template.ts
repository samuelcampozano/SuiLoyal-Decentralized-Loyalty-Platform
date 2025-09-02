// Sui Network Configuration
export const SUI_NETWORK = 'devnet';

// Contract addresses - Update these after deployment
// Update these after your deployment:
// Package: 0x_YOUR_PACKAGE_ID_HERE
// Platform: 0x_YOUR_PLATFORM_ID_HERE
export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID || 'YOUR_PACKAGE_ID_HERE';
export const PLATFORM_ID = import.meta.env.VITE_PLATFORM_ID || 'YOUR_PLATFORM_ID_HERE';

// Sui Client Configuration
export const SUI_CONFIG = {
  network: SUI_NETWORK as 'devnet' | 'mainnet' | 'testnet' | 'localnet',
  fullnodeUrl: `https://fullnode.${SUI_NETWORK}.sui.io:443`,
  faucetUrl: `https://faucet.${SUI_NETWORK}.sui.io/gas`,
};

// Application Configuration
export const APP_CONFIG = {
  name: 'SuiLoyal',
  version: '0.1.0',
  description: 'Decentralized Loyalty Platform on Sui',
  maxTransactionGas: 100_000_000, // 0.1 SUI
};

// Environment variables validation
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (PACKAGE_ID === 'YOUR_PACKAGE_ID_HERE') {
    errors.push('VITE_PACKAGE_ID environment variable is not set');
  }
  
  if (PLATFORM_ID === 'YOUR_PLATFORM_ID_HERE') {
    errors.push('VITE_PLATFORM_ID environment variable is not set');
  }
  
  return errors;
};