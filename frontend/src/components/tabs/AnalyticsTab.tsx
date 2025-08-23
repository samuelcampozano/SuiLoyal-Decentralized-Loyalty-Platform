import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  DollarSign, 
  Activity,
  Zap,
  Target
} from 'lucide-react';
import { AnalyticsService } from '../../lib/analyticsService';
import { 
  AnalyticsData, 
  UserEngagementData, 
  RevenueBreakdown, 
  TimeSeriesData,
  MerchantAnalytics
} from '../../types';
import StatCard from '../StatCard';
import AreaChart from '../charts/AreaChart';
import LineChart from '../charts/LineChart';
import PieChart from '../charts/PieChart';
import { SkeletonLoader } from '../SkeletonLoader';

interface AnalyticsTabProps {
  analyticsService: AnalyticsService;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analyticsService }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [engagement, setEngagement] = useState<UserEngagementData | null>(null);
  const [revenue, setRevenue] = useState<RevenueBreakdown | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData | null>(null);
  const [merchantAnalytics, setMerchantAnalytics] = useState<MerchantAnalytics[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyticsData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      const [
        analyticsData,
        engagementData,
        revenueData,
        timeData,
        merchantData
      ] = await Promise.all([
        analyticsService.getOverallAnalytics(),
        analyticsService.getUserEngagement(),
        analyticsService.getRevenueBreakdown(),
        analyticsService.getTimeSeriesData(selectedPeriod),
        analyticsService.getMerchantAnalytics()
      ]);

      setAnalytics(analyticsData);
      setEngagement(engagementData);
      setRevenue(revenueData);
      setTimeSeriesData(timeData);
      setMerchantAnalytics(merchantData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAnalyticsData(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toFixed(2)}`;
  };
  const formatNumber = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString();
  };

  const getPieChartData = () => {
    if (!revenue) return [];
    return [
      {
        name: 'Merchant Fees',
        value: revenue.merchantFees,
        color: '#3B82F6'
      },
      {
        name: 'Transaction Fees',
        value: revenue.transactionFees,
        color: '#8B5CF6'
      },
      {
        name: 'Premium Features',
        value: revenue.premiumFeatures,
        color: '#10B981'
      }
    ];
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} className="h-32" />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics Dashboard
          </h2>
          <p className="text-white/70 mt-1">Real-time insights and performance metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-white/10 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  selectedPeriod === period
                    ? 'bg-white text-gray-900'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => loadAnalyticsData(true)}
            disabled={refreshing}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Activity className={`h-4 w-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Transactions"
          value={analytics?.totalTransactions || 0}
          change={analytics?.growth}
          changeLabel="vs last period"
          icon={<Activity className="h-5 w-5" />}
          formatValue={formatNumber}
        />
        
        <StatCard
          title="Active Users"
          value={engagement?.activeUsers || 0}
          change={((engagement?.newUsers || 0) / (engagement?.activeUsers || 1)) * 100}
          changeLabel="new users"
          icon={<Users className="h-5 w-5" />}
          formatValue={formatNumber}
        />
        
        <StatCard
          title="Total Revenue"
          value={revenue?.total || 0}
          change={15.3}
          changeLabel="this month"
          icon={<DollarSign className="h-5 w-5" />}
          formatValue={formatCurrency}
          color="text-green-400"
        />
        
        <StatCard
          title="Points Issued"
          value={analytics?.totalPoints || 0}
          change={analytics?.growth}
          changeLabel="vs last period"
          icon={<Zap className="h-5 w-5" />}
          formatValue={formatNumber}
          color="text-yellow-400"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AreaChart
          data={timeSeriesData?.[selectedPeriod] || []}
          title={`Transaction Volume (${selectedPeriod})`}
          color="#3B82F6"
          gradientId="transactionGradient"
          height={250}
          formatValue={formatNumber}
        />
        
        <LineChart
          data={timeSeriesData?.[selectedPeriod] || []}
          title={`Growth Trend (${selectedPeriod})`}
          color="#10B981"
          height={250}
          formatValue={formatNumber}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChart
          data={getPieChartData()}
          title="Revenue Breakdown"
          height={250}
          formatValue={formatCurrency}
        />
        
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="h-5 w-5" />
            User Engagement
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Active Users</span>
              <span className="text-white font-semibold">{engagement?.activeUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">New Users</span>
              <span className="text-green-400 font-semibold">{engagement?.newUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Returning Users</span>
              <span className="text-blue-400 font-semibold">{engagement?.returningUsers || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Engagement Rate</span>
              <span className="text-purple-400 font-semibold">{engagement?.engagementRate?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Top Merchants
          </h3>
          <div className="space-y-3">
            {merchantAnalytics.slice(0, 5).map((merchant, index) => (
              <div key={merchant.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{merchant.name}</p>
                    <p className="text-white/60 text-xs">{merchant.totalCustomers} customers</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-semibold">{formatCurrency(merchant.revenue)}</p>
                  <p className={`text-xs ${merchant.growth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {merchant.growth > 0 ? '+' : ''}{merchant.growth.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Merchant Performance */}
      {merchantAnalytics.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Merchant Performance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {merchantAnalytics.map((merchant) => (
              <div key={merchant.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-white font-medium mb-2">{merchant.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Points Issued</span>
                    <span className="text-white">{formatNumber(merchant.pointsIssued)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Points Redeemed</span>
                    <span className="text-white">{formatNumber(merchant.pointsRedeemed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Revenue</span>
                    <span className="text-green-400">{formatCurrency(merchant.revenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Growth</span>
                    <span className={merchant.growth > 0 ? 'text-green-400' : 'text-red-400'}>
                      {merchant.growth > 0 ? '+' : ''}{merchant.growth.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

