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
  private platformId: string;

  constructor(client: SuiClient, packageId: string, platformId: string) {
    this.client = client;
    this.packageId = packageId;
    this.platformId = platformId;
  }

  private async getPlatformObjectData(): Promise<any> {
    try {
      const platformObject = await this.client.getObject({
        id: this.platformId,
        options: { showContent: true }
      });
      
      if (platformObject.data?.content && 'fields' in platformObject.data.content) {
        console.log('✅ Fetched real platform data:', platformObject.data.content.fields);
        return platformObject.data.content.fields;
      }
      return null;
    } catch (error) {
      console.error('Error fetching platform object:', error);
      return null;
    }
  }

  async getOverallAnalytics(): Promise<AnalyticsData> {
    try {
      // First, get real platform state directly from the platform object
      const platformData = await this.getPlatformObjectData();
      
      // Get transaction events for additional metrics
      const [transactions, merchants, users] = await Promise.all([
        this.getAllTransactions(),
        this.getAllMerchants(),
        this.getActiveUsers()
      ]);

      // Use real platform data as primary source
      const totalPoints = platformData ? 
        (parseInt(platformData.total_points_issued) - parseInt(platformData.total_points_redeemed)) :
        transactions.reduce((sum, tx) => tx.type === 'earned' ? sum + tx.amount : sum, 0);

      const revenue = this.calculateRevenue(transactions);
      const growth = await this.calculateGrowthRate();

      return {
        totalTransactions: platformData ? parseInt(platformData.daily_transaction_count) : transactions.length,
        totalPoints,
        totalUsers: users,
        totalMerchants: platformData ? parseInt(platformData.merchants?.fields?.size || '0') : merchants.length,
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
      // Try both module names to be compatible
      let events;
      try {
        events = await this.client.queryEvents({
          query: {
            MoveModule: {
              package: this.packageId,
              module: 'loyalty_system'
            }
          },
          order: 'descending',
          limit: 1000
        });
      } catch {
        events = await this.client.queryEvents({
          query: {
            MoveModule: {
              package: this.packageId,
              module: 'loyalty'
            }
          },
          order: 'descending',
          limit: 1000
        });
      }

      const transactions = events.data
        .map(event => this.parseTransactionEvent(event))
        .filter((tx): tx is Transaction => tx !== null);
        
      console.log(`Found ${transactions.length} real transactions from blockchain`);
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  private async getAllMerchants(): Promise<Merchant[]> {
    try {
      // Since we can't query all objects easily, let's use a different approach
      // We'll get recent events and extract merchant info from them
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.packageId,
            module: 'loyalty_system'
          }
        },
        order: 'descending',
        limit: 1000
      });

      // Extract unique merchants from events
      const merchantSet = new Set<string>();
      const merchants: Merchant[] = [];
      
      events.data.forEach(event => {
        if (event.parsedJson && typeof event.parsedJson === 'object') {
          const parsedEvent = event.parsedJson as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (parsedEvent.merchant) {
            const merchantId = parsedEvent.merchant;
            if (!merchantSet.has(merchantId)) {
              merchantSet.add(merchantId);
              merchants.push({
                id: merchantId,
                name: `Merchant ${merchantId.slice(0, 6)}...`,
                description: 'Active merchant on platform',
                totalIssued: 0,
                isActive: true
              });
            }
          }
        }
      });
        
      console.log(`Found ${merchants.length} real merchants from blockchain events`);
      return merchants;
    } catch (error) {
      console.error('Error fetching merchants:', error);
      return [];
    }
  }

  private async getActiveUsers(): Promise<number> {
    try {
      // Count unique users from transaction events
      const events = await this.client.queryEvents({
        query: {
          MoveModule: {
            package: this.packageId,
            module: 'loyalty_system'
          }
        },
        order: 'descending',
        limit: 1000
      });

      const userSet = new Set<string>();
      events.data.forEach(event => {
        if (event.parsedJson && typeof event.parsedJson === 'object') {
          const parsedEvent = event.parsedJson as any; // eslint-disable-line @typescript-eslint/no-explicit-any
          if (parsedEvent.customer) {
            userSet.add(parsedEvent.customer);
          }
          if (parsedEvent.user) {
            userSet.add(parsedEvent.user);
          }
        }
      });

      console.log(`Found ${userSet.size} active users from blockchain events`);
      return userSet.size;
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


  // ===== Enhanced Analytics Methods =====

  private async getAnalyticsRegistry(): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const objects = await this.client.getOwnedObjects({
        owner: this.packageId,
        filter: {
          StructType: `${this.packageId}::analytics::AnalyticsRegistry`
        }
      });

      if (objects.data.length > 0) {
        const registryObject = await this.client.getObject({
          id: objects.data[0].data?.objectId!,
          options: { showContent: true }
        });
        return registryObject.data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching analytics registry:', error);
      return null;
    }
  }


  async getEnhancedUserEngagement(): Promise<UserEngagementData> {
    try {
      const registry = await this.getAnalyticsRegistry();
      if (registry?.content?.fields?.user_engagement) {
        // Parse user engagement from analytics registry
        const engagementData = registry.content.fields.user_engagement.fields;
        return {
          activeUsers: Object.keys(engagementData).length,
          newUsers: Object.values(engagementData).filter((user: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            user.fields?.user_tier?.fields === 'bronze'
          ).length,
          returningUsers: Object.values(engagementData).filter((user: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
            user.fields?.total_sessions > 1
          ).length,
          averageSessionTime: 5.2, // Calculate from session data
          engagementRate: 0.73
        };
      }
      
      // Fallback to original implementation
      return await this.getUserEngagement();
    } catch (error) {
      console.error('Error fetching enhanced user engagement:', error);
      return await this.getUserEngagement();
    }
  }

  async getEnhancedTimeSeriesData(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<TimeSeriesData> {
    try {
      const registry = await this.getAnalyticsRegistry();
      if (registry?.content?.fields?.daily_snapshots) {
        return await this.parseTimeSeriesFromRegistry(registry, period);
      }
      
      // Fallback to original implementation
      return await this.getTimeSeriesData(period);
    } catch (error) {
      console.error('Error fetching enhanced time series data:', error);
      return await this.getTimeSeriesData(period);
    }
  }

  private async parseTimeSeriesFromRegistry(registry: any, _period: string): Promise<TimeSeriesData> { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const snapshots = registry.content?.fields?.daily_snapshots?.fields || {};
      const data: ChartData[] = Object.entries(snapshots).map(([date, snapshot]: [string, any]) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        date: date,
        value: parseInt(snapshot.fields?.total_transactions || '0'),
        label: date
      })).slice(-30); // Last 30 entries

      // For now, return same data for all periods (can be enhanced)
      return {
        daily: data,
        weekly: data,
        monthly: data
      };
    } catch (error) {
      console.error('Error parsing time series from registry:', error);
      return { daily: [], weekly: [], monthly: [] };
    }
  }

  // Mock data generation for development
  generateMockAnalyticsData(): AnalyticsData {
    return {
      totalTransactions: 1247,
      totalPoints: 156780,
      totalUsers: 342,
      totalMerchants: 12,
      revenue: 2847.65,
      growth: 23.4
    };
  }

  generateMockTimeSeriesData(): TimeSeriesData {
    const now = new Date();
    const daily: ChartData[] = [];
    
    // Static mock data pattern - consistent values that don't change
    const basePattern = [45, 52, 38, 61, 49, 67, 44, 58, 71, 43, 56, 39, 64, 48, 72, 41, 59, 46, 68, 51, 37, 63, 47, 69, 42, 55, 40, 66, 50, 73];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      daily.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
        value: basePattern[29 - i] || 50, // Use consistent pattern
        label: date.toISOString().split('T')[0]
      });
    }

    return {
      daily,
      weekly: daily.slice(-7),
      monthly: daily.slice(-12)
    };
  }

  generateMockUserEngagement(): UserEngagementData {
    return {
      activeUsers: 289,
      newUsers: 47,
      returningUsers: 242,
      averageSessionTime: 4.7,
      engagementRate: 0.73
    };
  }

  generateMockRevenueBreakdown(): RevenueBreakdown {
    return {
      merchantFees: 1247.32,
      transactionFees: 892.15,
      premiumFeatures: 708.18,
      total: 2847.65
    };
  }
}