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
  const [isMerchant, setIsMerchant] = useState(false);
  const [hasCreatedRewards, setHasCreatedRewards] = useState(false);

  // Load blockchain data
  const loadBlockchainData = async () => {
    try {
      // Load real reward templates from blockchain
      const rewardTemplates = await loyaltyService.getRewardTemplates();
      
      if (rewardTemplates.length > 0) {
        setRewards(rewardTemplates);
        console.log('Loaded real reward templates:', rewardTemplates);
        
        // Check if we have the demo rewards created
        const hasDemo = rewardTemplates.some(r => 
          r.name.includes('Coffee') || r.name.includes('Pastry') || r.name.includes('Coupon')
        );
        if (hasDemo && !hasCreatedRewards) {
          setHasCreatedRewards(true);
        }
      } else {
        // Show message that no rewards exist yet
        setRewards([]);
        console.log('No reward templates found on blockchain');
      }

      // Set fallback merchants data (in production, this would come from smart contract)
      setMerchants([
        { id: '1', name: 'Coffee Paradise', description: 'Premium coffee experience', totalIssued: 50000, isActive: true },
        { id: '2', name: 'TechMart', description: 'Electronics & gadgets', totalIssued: 120000, isActive: true },
        { id: '3', name: 'BookHaven', description: 'Your local bookstore', totalIssued: 30000, isActive: true }
      ]);
    } catch (error) {
      console.error('Error loading blockchain data:', error);
      // Fallback to empty rewards if blockchain loading fails
      setRewards([]);
    }
  };

  // Initialize with blockchain data
  useEffect(() => {
    loadBlockchainData();
  }, []);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 6000);
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
      setIsMerchant(false);
      setHasCreatedRewards(false);
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
      
      // Check if user is a merchant
      const merchantStatus = await loyaltyService.hasMerchantCap(userAddress);
      setIsMerchant(merchantStatus);
      
      // Load transaction history - filter only relevant transactions
      const txHistory = await loyaltyService.getUserTransactionHistory(userAddress);
      const mappedTransactions = txHistory
        .filter(tx => tx.type === 'earned' || tx.type === 'redeemed') // Only show meaningful transactions
        .map(tx => {
          return {
            id: tx.id,
            type: tx.type as 'earned' | 'redeemed',
            merchant: 'Demo Merchant',
            amount: tx.amount || 0,
            date: tx.timestamp,
            reward: tx.type === 'redeemed' ? (tx.rewardName || 'Reward Item') : undefined
          };
        });

      console.log('🏠 App.tsx - Mapped transactions for UI:', mappedTransactions);
      console.log('🏠 App.tsx - Total transactions:', mappedTransactions.length);
      console.log('🏠 App.tsx - Redeemed transactions:', mappedTransactions.filter(t => t.type === 'redeemed'));

      // If no transactions, show a placeholder message about creating activity
      if (mappedTransactions.length === 0 && loyaltyAccount) {
        mappedTransactions.push({
          id: 'placeholder-1',
          type: 'earned' as const,
          merchant: 'Demo Activity',
          amount: 0,
          date: new Date().toISOString(),
          reward: undefined
        });
      }

      console.log('🔄 Setting transactions state with:', mappedTransactions.length, 'transactions');
      console.log('🔄 Redeemed in final set:', mappedTransactions.filter(t => t.type === 'redeemed').length);
      setTransactions(mappedTransactions);
      
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

      // Find MerchantCap (from new contract)
      const merchantCapObj = objects.data.find(obj => 
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
      );

      // Find LoyaltyAccount (from new contract)
      const loyaltyAccountObj = objects.data.find(obj => 
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::LoyaltyAccount')
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
            // Small delay for blockchain settlement
            await new Promise(resolve => setTimeout(resolve, 2000));
            // Reload user data to reflect new balance and transactions
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
            setIsMerchant(true);
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
      showNotification(`Insufficient points! You have ${pointsBalance} but need ${reward.pointsCost} points.`, 'error');
      return;
    }

    // Check if this is a real reward template (has object ID) or mock data
    if (reward.id.startsWith('0x')) {
      // Real reward template - proceed with redemption
      try {
        setLoading(true);
        
        // Get user's LoyaltyAccount
        const objects = await loyaltyService.client.getOwnedObjects({
          owner: currentAccount.address,
          options: { showType: true, showContent: true },
        });

        const loyaltyAccountObj = objects.data.find(obj => 
          obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::LoyaltyAccount')
        );

        if (!loyaltyAccountObj?.data?.objectId) {
          showNotification('LoyaltyAccount not found. Please create loyalty account first.', 'error');
          return;
        }

        const tx = loyaltyService.redeemRewardTransaction(
          loyaltyAccountObj.data.objectId,
          reward.id
        );
        
        signAndExecuteTransaction(
          {
            transactionBlock: tx as any,
          },
          {
            onSuccess: async (_result: any) => {
              showNotification(`Successfully redeemed: ${reward.name}! 🎉`, 'success');
              // Small delay for blockchain settlement
              await new Promise(resolve => setTimeout(resolve, 2000));
              // Reload user data and blockchain data to reflect changes
              await loadUserData(currentAccount.address!);
              await loadBlockchainData();
            },
            onError: (error: any) => {
              console.error('Redemption failed:', error);
              let errorMessage = 'Redemption failed';
              if (error.message?.includes('1001')) {
                errorMessage = 'Insufficient points for this reward';
              } else if (error.message?.includes('1002')) {
                errorMessage = 'Reward not found or inactive';
              } else if (error.message?.includes('1006')) {
                errorMessage = 'Reward is out of stock';
              } else if (error.message) {
                errorMessage += ': ' + error.message;
              }
              showNotification(errorMessage, 'error');
            },
          }
        );
      } catch (error) {
        console.error('Error redeeming reward:', error);
        showNotification('Redemption failed', 'error');
      } finally {
        setLoading(false);
      }
    } else {
      // Mock reward - show message about creating real rewards
      showNotification('This is demo data. Please create real reward templates using the "Create Demo Rewards" button in the Merchant tab.', 'info');
    }
  };

  const createDemoRewards = async () => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!isMerchant) {
      showNotification('Please register as merchant first', 'error');
      return;
    }

    if (hasCreatedRewards) {
      showNotification('Demo rewards have already been created!', 'info');
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
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
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
              onSuccess: async (_result: any) => {
                console.log(`Created reward: ${reward.name}`);
                // Small delay to let blockchain settle
                await new Promise(settleResolve => setTimeout(settleResolve, 1000));
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
      setHasCreatedRewards(true);
      
      // Wait a bit longer for blockchain to fully settle
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Reload blockchain data to show the new rewards
      await loadBlockchainData();
      
      // Force a second reload after another delay to ensure we catch the rewards
      setTimeout(async () => {
        await loadBlockchainData();
        console.log('Secondary reload of blockchain data completed');
      }, 5000);
    } catch (error) {
      console.error('Error creating demo rewards:', error);
      showNotification('Failed to create demo rewards', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateReward = async (rewardId: string, updates: Partial<Reward>) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!isMerchant) {
      showNotification('Only merchants can update rewards', 'error');
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
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      // Call individual update functions based on what needs to be updated
      let tx;
      let updateType = '';
      
      if (updates.name !== undefined) {
        tx = loyaltyService.updateRewardNameTransaction(
          merchantCapObj.data.objectId,
          rewardId,
          updates.name
        );
        updateType = 'name';
      } else if (updates.description !== undefined) {
        tx = loyaltyService.updateRewardDescriptionTransaction(
          merchantCapObj.data.objectId,
          rewardId,
          updates.description
        );
        updateType = 'description';
      } else if (updates.pointsCost !== undefined) {
        tx = loyaltyService.updateRewardCostTransaction(
          merchantCapObj.data.objectId,
          rewardId,
          updates.pointsCost
        );
        updateType = 'points cost';
      } else if (updates.imageUrl !== undefined) {
        tx = loyaltyService.updateRewardImageTransaction(
          merchantCapObj.data.objectId,
          rewardId,
          updates.imageUrl
        );
        updateType = 'image';
      } else {
        showNotification('No valid updates provided', 'error');
        return;
      }
      
      // Show wallet approval message
      showNotification(`Please approve transaction in wallet to update ${updateType}...`, 'info');
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification(`Reward ${updateType} updated successfully! 🎉`, 'success');
            // Reload blockchain data to reflect changes
            setTimeout(async () => {
              await loadBlockchainData();
            }, 1500);
          },
          onError: (error: any) => {
            console.error('Update failed:', error);
            showNotification('Failed to update reward: ' + error.message, 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error updating reward:', error);
      showNotification('Failed to update reward', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteReward = async (rewardId: string) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!isMerchant) {
      showNotification('Only merchants can delete rewards', 'error');
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
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      const tx = loyaltyService.deleteRewardTemplateTransaction(
        merchantCapObj.data.objectId,
        rewardId
      );
      
      // Show wallet approval message
      showNotification('Please approve transaction in wallet to delete reward...', 'info');
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification('Reward deleted successfully! 🗑️', 'success');
            // Reload blockchain data to reflect changes
            setTimeout(async () => {
              await loadBlockchainData();
            }, 1500);
          },
          onError: (error: any) => {
            console.error('Deletion failed:', error);
            showNotification('Failed to delete reward: ' + error.message, 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error deleting reward:', error);
      showNotification('Failed to delete reward', 'error');
    } finally {
      setLoading(false);
    }
  };

  const createSingleReward = async (name: string, description: string, pointsCost: number, imageUrl: string, supply: number) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!isMerchant) {
      showNotification('Only merchants can create rewards', 'error');
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
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      const tx = loyaltyService.createRewardTemplateTransaction(
        merchantCapObj.data.objectId,
        name,
        description,
        pointsCost,
        imageUrl,
        supply
      );
      
      // Show wallet approval message
      showNotification('Please approve transaction in wallet to create reward...', 'info');
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification(`Reward "${name}" created successfully! 🎉`, 'success');
            // Reload blockchain data to reflect changes
            setTimeout(async () => {
              await loadBlockchainData();
            }, 1500);
          },
          onError: (error: any) => {
            console.error('Creation failed:', error);
            showNotification('Failed to create reward: ' + error.message, 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error creating reward:', error);
      showNotification('Failed to create reward', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateRewardSupply = async (rewardId: string, additionalSupply: number) => {
    if (!currentAccount?.address) {
      showNotification('Please connect your wallet first', 'error');
      return;
    }

    if (!isMerchant) {
      showNotification('Only merchants can update reward supply', 'error');
      return;
    }

    if (additionalSupply <= 0) {
      showNotification('Additional supply must be greater than 0', 'error');
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
        obj.data?.type?.includes('0x661fd7b26d051e8a654a2623fdd6893f8670025e0bed9cceea83241633d49d8c::loyalty_system::MerchantCap')
      );

      if (!merchantCapObj?.data?.objectId) {
        showNotification('MerchantCap not found. Please register as merchant first.', 'error');
        return;
      }

      const tx = loyaltyService.updateRewardSupplyTransaction(
        merchantCapObj.data.objectId,
        rewardId,
        additionalSupply
      );
      
      // Show wallet approval message
      showNotification(`Please approve transaction in wallet to add ${additionalSupply} items...`, 'info');
      
      signAndExecuteTransaction(
        {
          transactionBlock: tx as any,
        },
        {
          onSuccess: async (_result: any) => {
            showNotification(`Added ${additionalSupply} items to reward supply! 📦`, 'success');
            // Reload blockchain data to reflect changes
            setTimeout(async () => {
              await loadBlockchainData();
            }, 1500);
          },
          onError: (error: any) => {
            console.error('Supply update failed:', error);
            showNotification('Failed to update supply: ' + error.message, 'error');
          },
        }
      );
    } catch (error) {
      console.error('Error updating reward supply:', error);
      showNotification('Failed to update reward supply', 'error');
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
            refreshData={() => currentAccount?.address && loadUserData(currentAccount.address)}
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
            isMerchant={isMerchant}
            hasCreatedRewards={hasCreatedRewards}
            userAddress={currentAccount?.address || ''}
            issuePoints={issuePoints}
            registerMerchant={registerMerchant}
            createDemoRewards={createDemoRewards}
            onUpdateReward={updateReward}
            onDeleteReward={deleteReward}
            onUpdateSupply={updateRewardSupply}
            onCreateReward={createSingleReward}
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