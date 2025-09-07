export interface Transaction {
  id: string;
  type: 'earned' | 'redeemed' | 'other';
  merchant: string;
  customer?: string; // Wallet address of the customer
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

export interface TransactionResult {
  digest?: string;
  effects?: Record<string, unknown>;
}

export interface SuiTransactionBlockResponse {
  digest: string;
  effects?: Record<string, unknown>;
  events?: Record<string, unknown>[];
}

export interface AnalyticsData {
  totalTransactions: number;
  totalPoints: number;
  totalUsers: number;
  totalMerchants: number;
  revenue: number;
  growth: number;
}

export interface ChartData {
  date: string;
  value: number;
  label?: string;
}

export interface MerchantAnalytics {
  id: string;
  name: string;
  totalCustomers: number;
  pointsIssued: number;
  pointsRedeemed: number;
  revenue: number;
  growth: number;
  transactions: ChartData[];
  topRewards: Array<{
    name: string;
    redeemCount: number;
    revenue: number;
  }>;
}

export interface UserEngagementData {
  activeUsers: number;
  newUsers: number;
  returningUsers: number;
  averageSessionTime: number;
  engagementRate: number;
}

export interface RevenueBreakdown {
  merchantFees: number;
  transactionFees: number;
  premiumFeatures: number;
  total: number;
}

export interface TimeSeriesData {
  daily: ChartData[];
  weekly: ChartData[];
  monthly: ChartData[];
}