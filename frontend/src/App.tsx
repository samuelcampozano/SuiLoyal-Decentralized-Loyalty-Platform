import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { Navigation } from './components/Navigation';
import { Notification } from './components/Notification';
import { LoadingOverlay } from './components/LoadingOverlay';
import { Footer } from './components/Footer';
import { HomeTab } from './components/tabs/HomeTab';
import { RewardsTab } from './components/tabs/RewardsTab';
import { MerchantTab } from './components/tabs/MerchantTab';
import { ProfileTab } from './components/tabs/ProfileTab';
import { Transaction, Merchant, Reward, LoyaltyAccount, Notification as NotificationType } from './types';
import { loyaltyService } from './lib/loyaltyService';


export default function App() {
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransactionBlock();
  const [currentTab, setCurrentTab] = useState('home');
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationType | null>(null);

  // Initialize with fallback data for demo purposes
  useEffect(() => {
    // Set fallback rewards data (in production, this would come from smart contract)
    setRewards([
      { id: '1', merchantId: '1', name: 'Free Coffee', description: 'Redeem for any coffee', pointsCost: 100, imageUrl: '☕', remaining: 50 },
      { id: '2', merchantId: '1', name: 'Pastry Combo', description: 'Coffee + Pastry', pointsCost: 150, imageUrl: '🥐', remaining: 30 },
      { id: '3', merchantId: '2', name: '10% Off Coupon', description: 'Valid on all items', pointsCost: 200, imageUrl: '🎫', remaining: 100 },
      { id: '4', merchantId: '3', name: 'Book of the Month', description: 'Bestseller pick', pointsCost: 300, imageUrl: '📚', remaining: 20 }
    ]);

    // Set fallback merchants data (in production, this would come from smart contract)
    setMerchants([
      { id: '1', name: 'Coffee Paradise', description: 'Premium coffee experience', totalIssued: 50000, isActive: true },
      { id: '2', name: 'TechMart', description: 'Electronics & gadgets', totalIssued: 120000, isActive: true },
      { id: '3', name: 'BookHaven', description: 'Your local bookstore', totalIssued: 30000, isActive: true }
    ]);
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Load user data when wallet connects/disconnects
  useEffect(() => {
    if (currentAccount?.address) {
      loadUserData(currentAccount.address);
      showNotification('Wallet connected successfully!', 'success');
    } else {
      setPointsBalance(0);
      setLoyaltyAccount(null);
      setTransactions([]);
    }
  }, [currentAccount]);

  const loadUserData = async (userAddress: string) => {
    try {
      setLoading(true);
      
      // Load points balance from blockchain
      const balance = await loyaltyService.getUserPointsBalance(userAddress);
      setPointsBalance(balance);
      
      // Check if user has loyalty account
      const hasAccount = await loyaltyService.hasLoyaltyAccount(userAddress);
      setLoyaltyAccount(hasAccount ? { id: userAddress, created: true } : null);
      
      // Load transaction history
      const txHistory = await loyaltyService.getUserTransactionHistory(userAddress);
      setTransactions(txHistory.map(tx => ({
        id: tx.id,
        type: tx.type === 'other' ? 'earned' : tx.type,
        merchant: 'On-chain Transaction',
        amount: 0, // Would need to be parsed from transaction data
        date: tx.timestamp
      })));
      
    } catch (error) {
      console.error('Error loading user data:', error);
      showNotification('Error loading blockchain data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createLoyaltyAccount = async () => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const tx = loyaltyService.createLoyaltyAccountTransaction(currentAccount.address);
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification('Loyalty account created successfully!', 'success');
            // Reload user data to reflect new account
            await loadUserData(currentAccount.address!);
          },
          onError: (error: any) => {
            console.error('Transaction failed:', error);
            showNotification('Failed to create account', 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error creating loyalty account:', error);
      showNotification('Failed to create account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const issuePoints = async (amount: number) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!loyaltyAccount) {
      showNotification('Please create a loyalty account first', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Get user's owned objects to find MerchantCap and LoyaltyAccount
      const objects = await loyaltyService.client.getOwnedObjects({
        owner: currentAccount.address,
        options: { showType: true, showContent: true },
      });

      // Find MerchantCap
      const merchantCapObj = objects.data.find(obj => 
        obj.data?.type?.includes('MerchantCap')
      );

      // Find LoyaltyAccount
      const loyaltyAccountObj = objects.data.find(obj => 
        obj.data?.type?.includes('LoyaltyAccount')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      if (!loyaltyAccountObj?.data?.objectId) {
        showNotification('LoyaltyAccount not found. Please create loyalty account first.', 'error');
        return;
      }

      const tx = await loyaltyService.issuePointsTransaction(
        merchantCapObj.data.objectId,
        loyaltyAccountObj.data.objectId,
        amount
      );
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification(`${amount} points issued successfully! 🎉`, 'success');
            // Reload user data to reflect new balance
            await loadUserData(currentAccount.address!);
          },
          onError: (error: any) => {
            console.error('Transaction failed:', error);
            showNotification('Failed to issue points: ' + error.message, 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error issuing points:', error);
      showNotification('Failed to issue points', 'error');
    } finally {
      setLoading(false);
    }
  };

  const registerMerchant = async (name: string, description: string) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const tx = loyaltyService.registerMerchantTransaction(name, description);
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification('Successfully registered as merchant!', 'success');
            // Reload user data
            await loadUserData(currentAccount.address!);
          },
          onError: (error: any) => {
            console.error('Merchant registration failed:', error);
            showNotification('Failed to register as merchant', 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error registering merchant:', error);
      showNotification('Failed to register as merchant', 'error');
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (pointsBalance < reward.pointsCost) {
      showNotification('Insufficient points!', 'error');
      return;
    }

    // For now, show a message that reward templates need to be created first
    showNotification('Reward redemption requires RewardTemplate objects to be created on-chain first. This feature will be implemented when merchants create reward templates.', 'info');
    
    // TODO: Implement reward template creation and redemption flow
    // The smart contract requires:
    // 1. Merchants to create RewardTemplate objects using create_reward_template
    // 2. RewardTemplate object IDs to be used in redemption transactions
    
    console.log('Reward redemption requested:', reward.name, 'Cost:', reward.pointsCost);
  };

  const createDemoRewards = async () => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Get user's MerchantCap
      const objects = await loyaltyService.client.getOwnedObjects({
        owner: currentAccount.address,
        options: { showType: true, showContent: true },
      });

      const merchantCapObj = objects.data.find(obj => 
        obj.data?.type?.includes('MerchantCap')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      // Create demo rewards one by one
      const demoRewards = [
        { name: 'Free Coffee', description: 'Redeem for any coffee', cost: 100, imageUrl: '☕', supply: 50 },
        { name: 'Pastry Combo', description: 'Coffee + Pastry', cost: 150, imageUrl: '🥐', supply: 30 },
        { name: '10% Off Coupon', description: 'Valid on all items', cost: 200, imageUrl: '🎫', supply: 100 }
      ];

      for (const reward of demoRewards) {
        const tx = loyaltyService.createRewardTemplateTransaction(
          merchantCapObj.data.objectId,
          reward.name,
          reward.description,
          reward.cost,
          reward.imageUrl,
          reward.supply
        );
        
        await new Promise((resolve, reject) => {
          signAndExecuteTransaction(
            {
              transactionBlock: tx as any,
            },
            {
              onSuccess: (_result: any) => {
                console.log(`Created reward: ${reward.name}`);
                resolve(true);
              },
              onError: (error: any) => {
                console.error(`Failed to create ${reward.name}:`, error);
                reject(error);
              },
            }
          );
        });

        // Small delay between transactions
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      showNotification('Demo reward templates created successfully! 🎉', 'success');
    } catch (error) {
      console.error('Error creating demo rewards:', error);
      showNotification('Failed to create demo rewards', 'error');
    } finally {
      setLoading(false);
    }
  };






  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation 
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        pointsBalance={pointsBalance}
      />
      
      {notification && (
        <Notification message={notification.message} type={notification.type} />
      )}

      {loading && <LoadingOverlay />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'home' && (
          <HomeTab 
            isConnected={!!currentAccount}
            loyaltyAccount={loyaltyAccount}
            loading={loading}
            transactions={transactions}
            createLoyaltyAccount={createLoyaltyAccount}
          />
        )}
        {currentTab === 'rewards' && (
          <RewardsTab 
            rewards={rewards}
            isConnected={!!currentAccount}
            pointsBalance={pointsBalance}
            loading={loading}
            redeemReward={redeemReward}
          />
        )}
        {currentTab === 'merchant' && (
          <MerchantTab 
            merchants={merchants}
            isConnected={!!currentAccount}
            loading={loading}
            issuePoints={issuePoints}
            registerMerchant={registerMerchant}
            createDemoRewards={createDemoRewards}
          />
        )}
        {currentTab === 'profile' && (
          <ProfileTab 
            isConnected={!!currentAccount}
            walletAddress={currentAccount?.address || ''}
            pointsBalance={pointsBalance}
            balance={0}
            transactions={transactions}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}