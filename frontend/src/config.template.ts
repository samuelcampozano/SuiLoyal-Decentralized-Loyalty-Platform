// Sui Network Configuration
export const SUI_NETWORK = 'devnet';

// Contract addresses - Update these after deployment
// Latest deployment (2025-08-20): 
// Package: 0x907f59a06c072e92d551e1e2e22a03bcd16e4e662a3b17051af3b94ec2287b0e
// Platform: 0x4225897336536aac1bc6c86f7da17879f6677ab6f12d7da823d2690a46539b6b
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