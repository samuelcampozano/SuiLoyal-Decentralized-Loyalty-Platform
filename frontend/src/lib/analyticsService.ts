import { SuiClient } from '@mysten/sui/client';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import {
  AnalyticsData,
  ChartData,
  MerchantAnalytics,
  UserEngagementData,
  RevenueBreakdown,
  TimeSeriesData,
  Transaction,
  Merchant
} from '../types';

export class AnalyticsService {
  private client: SuiClient;
  private packageId: string;

  constructor(client: SuiClient, packageId: string) {
    this.client = client;
    this.packageId = packageId;
  }

  async getOverallAnalytics(): Promise<AnalyticsData> {
    try {
      const [transactions, merchants, users] = await Promise.all([
        this.getAllTransactions(),
        this.getAllMerchants(),
        this.getActiveUsers()
      ]);

      const totalPoints = transactions.reduce((sum, tx) => 
        tx.type === 'earned' ? sum + tx.amount : sum, 0
      );

      const revenue = this.calculateRevenue(transactions);
      const growth = await this.calculateGrowthRate();

      return {
        totalTransactions: transactions.length,
        totalPoints,
        totalUsers: users,
        totalMerchants: merchants.length,
        revenue,
        growth
      };
    } catch (error) {
      console.error('Error fetching overall analytics:', error);
      return {
        totalTransactions: 0,
        totalPoints: 0,
        totalUsers: 0,
        totalMerchants: 0,
        revenue: 0,
        growth: 0
      };
    }
  }

  async getMerchantAnalytics(merchantId?: string): Promise<MerchantAnalytics[]> {
    try {
      const merchants = await this.getAllMerchants();
      const transactions = await this.getAllTransactions();

      return merchants.map(merchant => {
        const merchantTransactions = transactions.filter(tx => tx.merchant === merchant.name);
        const pointsIssued = merchantTransactions
          .filter(tx => tx.type === 'earned')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        const pointsRedeemed = merchantTransactions
          .filter(tx => tx.type === 'redeemed')
          .reduce((sum, tx) => sum + tx.amount, 0);

        const uniqueCustomers = new Set(
          merchantTransactions.map(tx => tx.id.split('_')[0])
        ).size;

        const revenue = pointsIssued * 0.01; // Assuming 1 cent per point
        const growth = this.calculateMerchantGrowth(merchantTransactions);

        const transactionChart = this.generateTimeSeriesData(merchantTransactions);
        const topRewards = this.getTopRewards(merchantTransactions);

        return {
          id: merchant.id,
          name: merchant.name,
          totalCustomers: uniqueCustomers,
          pointsIssued,
          pointsRedeemed,
          revenue,
          growth,
          transactions: transactionChart.daily.slice(-30),
          topRewards
        };
      }).filter(merchant => !merchantId || merchant.id === merchantId);
    } catch (error) {
      console.error('Error fetching merchant analytics:', error);
      return [];
    }
  }

  async getUserEngagement(): Promise<UserEngagementData> {
    try {
      const transactions = await this.getAllTransactions();
      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);

      const recentTransactions = transactions.filter(tx => 
        new Date(tx.date) >= thirtyDaysAgo
      );

      const activeUsers = new Set(
        recentTransactions.map(tx => tx.id.split('_')[0])
      ).size;

      const sevenDaysAgo = subDays(now, 7);
      const newUsers = new Set(
        transactions
          .filter(tx => new Date(tx.date) >= sevenDaysAgo)
          .map(tx => tx.id.split('_')[0])
      ).size;

      const returningUsers = activeUsers - newUsers;
      const engagementRate = activeUsers > 0 ? (recentTransactions.length / activeUsers) : 0;

      return {
        activeUsers,
        newUsers,
        returningUsers,
        averageSessionTime: 4.5, // Mock data - would need proper tracking
        engagementRate: Math.round(engagementRate * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      return {
        activeUsers: 0,
        newUsers: 0,
        returningUsers: 0,
        averageSessionTime: 0,
        engagementRate: 0
      };
    }
  }

  async getRevenueBreakdown(): Promise<RevenueBreakdown> {
    try {
      const transactions = await this.getAllTransactions();
      const totalValue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      const merchantFees = totalValue * 0.005; // 0.5% merchant fee
      const transactionFees = transactions.length * 0.001; // $0.001 per transaction
      const premiumFeatures = totalValue * 0.001; // 0.1% premium features

      return {
        merchantFees,
        transactionFees,
        premiumFeatures,
        total: merchantFees + transactionFees + premiumFeatures
      };
    } catch (error) {
      console.error('Error calculating revenue breakdown:', error);
      return {
        merchantFees: 0,
        transactionFees: 0,
        premiumFeatures: 0,
        total: 0
      };
    }
  }

  async getTimeSeriesData(_period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<TimeSeriesData> {
    try {
      const transactions = await this.getAllTransactions();
      
      return {
        daily: this.generateTimeSeriesData(transactions).daily,
        weekly: this.generateTimeSeriesData(transactions).weekly,
        monthly: this.generateTimeSeriesData(transactions).monthly
      };
    } catch (error) {
      console.error('Error generating time series data:', error);
      return {
        daily: [],
        weekly: [],
        monthly: []
      };
    }
  }

  private async getAllTransactions(): Promise<Transaction[]> {
    try {
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.packageId,
            module: 'loyalty'
          }
        },
        order: 'descending',
        limit: 1000
      });

      return events.data.map(event => this.parseTransactionEvent(event)).filter((tx): tx is Transaction => tx !== null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  private async getAllMerchants(): Promise<Merchant[]> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: this.packageId,
        filter: {
          StructType: `${this.packageId}::loyalty::MerchantCap`
        }
      });

      return objects.data.map(obj => this.parseMerchantObject(obj)).filter((merchant): merchant is Merchant => merchant !== null);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      return [];
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      const accounts = await this.client.getOwnedObjects({
        owner: this.packageId,
        filter: {
          StructType: `${this.packageId}::loyalty::LoyaltyAccount`
        }
      });

      return accounts.data.length;
    } catch (error) {
      console.error('Error counting active users:', error);
      return 0;
    }
  }

  private calculateRevenue(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => {
      if (tx.type === 'earned') return sum + (tx.amount * 0.01);
      if (tx.type === 'redeemed') return sum + (tx.amount * 0.005);
      return sum;
    }, 0);
  }

  private async calculateGrowthRate(): Promise<number> {
    try {
      const now = new Date();
      const currentMonth = await this.getTransactionsInPeriod(subMonths(now, 1), now);
      const previousMonth = await this.getTransactionsInPeriod(subMonths(now, 2), subMonths(now, 1));

      if (previousMonth.length === 0) return 100;
      
      const growth = ((currentMonth.length - previousMonth.length) / previousMonth.length) * 100;
      return Math.round(growth * 100) / 100;
    } catch (error) {
      console.error('Error calculating growth rate:', error);
      return 0;
    }
  }

  private calculateMerchantGrowth(transactions: Transaction[]): number {
    const now = new Date();
    const currentWeek = transactions.filter(tx => 
      new Date(tx.date) >= subWeeks(now, 1)
    );
    const previousWeek = transactions.filter(tx => {
      const date = new Date(tx.date);
      return date >= subWeeks(now, 2) && date < subWeeks(now, 1);
    });

    if (previousWeek.length === 0) return currentWeek.length > 0 ? 100 : 0;
    
    const growth = ((currentWeek.length - previousWeek.length) / previousWeek.length) * 100;
    return Math.round(growth * 100) / 100;
  }

  private async getTransactionsInPeriod(start: Date, end: Date): Promise<Transaction[]> {
    const allTransactions = await this.getAllTransactions();
    return allTransactions.filter(tx => {
      const date = new Date(tx.date);
      return date >= start && date <= end;
    });
  }

  private generateTimeSeriesData(transactions: Transaction[]): TimeSeriesData {
    const now = new Date();
    
    // Generate daily data for last 30 days
    const daily: ChartData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(now, i);
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= startOfDay(date) && txDate <= endOfDay(date);
      });
      
      daily.push({
        date: format(date, 'MMM dd'),
        value: dayTransactions.length,
        label: format(date, 'yyyy-MM-dd')
      });
    }

    // Generate weekly data for last 12 weeks
    const weekly: ChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subWeeks(now, i);
      const weekTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= date && txDate < subWeeks(now, i - 1);
      });
      
      weekly.push({
        date: format(date, 'MMM dd'),
        value: weekTransactions.length,
        label: format(date, 'yyyy-MM-dd')
      });
    }

    // Generate monthly data for last 12 months
    const monthly: ChartData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate >= date && txDate < subMonths(now, i - 1);
      });
      
      monthly.push({
        date: format(date, 'MMM yyyy'),
        value: monthTransactions.length,
        label: format(date, 'yyyy-MM')
      });
    }

    return { daily, weekly, monthly };
  }

  private getTopRewards(transactions: Transaction[]): Array<{ name: string; redeemCount: number; revenue: number }> {
    const rewardCounts = new Map<string, { count: number; revenue: number }>();
    
    transactions
      .filter(tx => tx.type === 'redeemed' && tx.reward)
      .forEach(tx => {
        const current = rewardCounts.get(tx.reward!) || { count: 0, revenue: 0 };
        rewardCounts.set(tx.reward!, {
          count: current.count + 1,
          revenue: current.revenue + (tx.amount * 0.01)
        });
      });

    return Array.from(rewardCounts.entries())
      .map(([name, data]) => ({
        name,
        redeemCount: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => b.redeemCount - a.redeemCount)
      .slice(0, 5);
  }

  private parseTransactionEvent(event: any): Transaction | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const eventType = event.type.split('::').pop();
      const parsedJson = event.parsedJson;
      
      return {
        id: event.id.txDigest,
        type: eventType === 'PointsEarned' ? 'earned' : 
              eventType === 'PointsRedeemed' ? 'redeemed' : 'other',
        merchant: parsedJson.merchant || 'Unknown',
        amount: parseInt(parsedJson.amount || '0'),
        reward: parsedJson.reward_name,
        date: new Date(parseInt(event.timestampMs || '0')).toISOString()
      };
    } catch (error) {
      console.error('Error parsing transaction event:', error);
      return null;
    }
  }

  private parseMerchantObject(obj: any): Merchant | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      return {
        id: obj.data.objectId,
        name: obj.data.content?.fields?.name || 'Unknown Merchant',
        description: obj.data.content?.fields?.description || '',
        totalIssued: parseInt(obj.data.content?.fields?.total_issued || '0'),
        isActive: true
      };
    } catch (error) {
      console.error('Error parsing merchant object:', error);
      return null;
    }
  }
}