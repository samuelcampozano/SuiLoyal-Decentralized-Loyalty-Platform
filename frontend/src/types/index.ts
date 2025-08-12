export interface Transaction {
  id: string;
  type: 'earned' | 'redeemed' | 'other';
  merchant: string;
  amount: number;
  reward?: string;
  date: string;
}

export interface Merchant {
  id: string;
  name: string;
  description: string;
  totalIssued: number;
  isActive: boolean;
}

export interface Reward {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  pointsCost: number;
  imageUrl: string;
  remaining: number;
}

export interface LoyaltyAccount {
  id: string;
  created: boolean;
}

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}