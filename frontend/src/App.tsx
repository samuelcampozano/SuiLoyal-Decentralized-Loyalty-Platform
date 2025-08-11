import { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Notification } from './components/Notification';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Footer } from './components/Footer';
import { HomeTab } from './components/tabs/HomeTab';
import { RewardsTab } from './components/tabs/RewardsTab';
import { MerchantTab } from './components/tabs/MerchantTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { Transaction, Merchant, Reward, LoyaltyAccount, Notification as NotificationType } from './types';


export default function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [balance, setBalance] = useState(0);
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Mock data for demo
  useEffect(() => {
    // Initialize with demo data
    setMerchants([
      { id: '1', name: 'Coffee Paradise', description: 'Premium coffee experience', totalIssued: 50000, isActive: true },
      { id: '2', name: 'TechMart', description: 'Electronics & gadgets', totalIssued: 120000, isActive: true },
      { id: '3', name: 'BookHaven', description: 'Your local bookstore', totalIssued: 30000, isActive: true }
    ]);

    setRewards([
      { id: '1', merchantId: '1', name: 'Free Coffee', description: 'Redeem for any coffee', pointsCost: 100, imageUrl: '☕', remaining: 50 },
      { id: '2', merchantId: '1', name: 'Pastry Combo', description: 'Coffee + Pastry', pointsCost: 150, imageUrl: '🥐', remaining: 30 },
      { id: '3', merchantId: '2', name: '10% Off Coupon', description: 'Valid on all items', pointsCost: 200, imageUrl: '🎫', remaining: 100 },
      { id: '4', merchantId: '3', name: 'Book of the Month', description: 'Bestseller pick', pointsCost: 300, imageUrl: '📚', remaining: 20 }
    ]);

    setTransactions([
      { id: '1', type: 'earned', merchant: 'Coffee Paradise', amount: 50, date: new Date().toISOString() },
      { id: '2', type: 'earned', merchant: 'TechMart', amount: 200, date: new Date().toISOString() },
      { id: '3', type: 'redeemed', merchant: 'Coffee Paradise', amount: -100, reward: 'Free Coffee', date: new Date().toISOString() }
    ]);
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const connectWallet = async () => {
    try {
      setLoading(true);
      // Simulate wallet connection
      const mockAddress = '0x' + Math.random().toString(16).slice(2, 42);
      setWalletAddress(mockAddress);
      setIsConnected(true);
      setBalance(1000); // Mock SUI balance
      setPointsBalance(150); // Mock points balance
      showNotification('Wallet connected successfully!', 'success');
    } catch {
      showNotification('Failed to connect wallet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setIsConnected(false);
    setBalance(0);
    setPointsBalance(0);
    showNotification('Wallet disconnected');
  };

  const createLoyaltyAccount = async () => {
    try {
      setLoading(true);
      // Simulate account creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoyaltyAccount({ id: 'acc_' + Date.now(), created: true });
      showNotification('Loyalty account created!', 'success');
    } catch {
      showNotification('Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const issuePoints = async (amount: number) => {
    try {
      setLoading(true);
      // Simulate points issuance
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPointsBalance(prev => prev + amount);
      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'earned',
        merchant: 'Demo Merchant',
        amount,
        date: new Date().toISOString()
      }, ...prev]);
      showNotification(`${amount} points added!`, 'success');
    } catch {
      showNotification('Failed to issue points', 'error');
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (pointsBalance < reward.pointsCost) {
      showNotification('Insufficient points!', 'error');
      return;
    }

    try {
      setLoading(true);
      // Simulate redemption
      await new Promise(resolve => setTimeout(resolve, 1000));
      setPointsBalance(prev => prev - reward.pointsCost);
      setTransactions(prev => [{
        id: Date.now().toString(),
        type: 'redeemed',
        merchant: merchants.find(m => m.id === reward.merchantId)?.name || 'Unknown',
        amount: -reward.pointsCost,
        reward: reward.name,
        date: new Date().toISOString()
      }, ...prev]);
      showNotification(`Redeemed: ${reward.name}! 🎉`, 'success');
    } catch {
      showNotification('Redemption failed', 'error');
    } finally {
      setLoading(false);
    }
  };






  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isConnected={isConnected}
        walletAddress={walletAddress}
        pointsBalance={pointsBalance}
        loading={loading}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
      />
      
      {notification && (
        <Notification message={notification.message} type={notification.type} />
      )}

      {loading && <LoadingOverlay />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'home' && (
          <HomeTab 
            isConnected={isConnected}
            loyaltyAccount={loyaltyAccount}
            loading={loading}
            transactions={transactions}
            connectWallet={connectWallet}
            createLoyaltyAccount={createLoyaltyAccount}
          />
        )}
        {currentTab === 'rewards' && (
          <RewardsTab 
            rewards={rewards}
            isConnected={isConnected}
            pointsBalance={pointsBalance}
            loading={loading}
            redeemReward={redeemReward}
          />
        )}
        {currentTab === 'merchant' && (
          <MerchantTab 
            merchants={merchants}
            isConnected={isConnected}
            loading={loading}
            issuePoints={issuePoints}
          />
        )}
        {currentTab === 'profile' && (
          <ProfileTab 
            isConnected={isConnected}
            walletAddress={walletAddress}
            pointsBalance={pointsBalance}
            balance={balance}
            transactions={transactions}
            connectWallet={connectWallet}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}