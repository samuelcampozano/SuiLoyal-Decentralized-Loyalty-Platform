import { FC, useState, useEffect } from 'react';
import { Merchant, Reward } from '../../types';
import { MerchantRewardManager } from '../MerchantRewardManager';

interface MerchantTabProps {
  merchants: Merchant[];
  isConnected: boolean;
  loading: boolean;
  isMerchant: boolean;
  hasCreatedRewards: boolean;
  userAddress: string;
  issuePoints: (amount: number) => void;
  registerMerchant: (name: string, description: string) => void;
  createDemoRewards: () => void;
  onUpdateReward: (rewardId: string, updates: Partial<Reward>, refreshCallback?: () => Promise<void>) => void;
  onDeleteReward: (rewardId: string, refreshCallback?: () => Promise<void>) => void;
  onUpdateSupply: (rewardId: string, additionalSupply: number, refreshCallback?: () => Promise<void>) => void;
  onCreateReward: (name: string, description: string, pointsCost: number, imageUrl: string, supply: number, refreshCallback?: () => Promise<void>) => void;
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const MerchantTab: FC<MerchantTabProps> = ({
  merchants,
  isConnected,
  loading,
  isMerchant,
  hasCreatedRewards,
  userAddress,
  issuePoints,
  registerMerchant,
  createDemoRewards,
  onUpdateReward,
  onDeleteReward,
  onUpdateSupply,
  onCreateReward,
  showNotification,
}) => {
  const [merchantRewards, setMerchantRewards] = useState<Reward[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'rewards'>('overview');
  const [loadingRewards, setLoadingRewards] = useState(false);

  useEffect(() => {
    if (isMerchant && userAddress) {
      loadMerchantRewards();
    }
  }, [isMerchant, userAddress, hasCreatedRewards]);

  const loadMerchantRewards = async () => {
    if (!userAddress) return;
    
    setLoadingRewards(true);
    try {
      const { loyaltyService } = await import('../../lib/loyaltyService');
      const rewards = await loyaltyService.getMerchantRewardTemplates(userAddress);
      setMerchantRewards(rewards);
    } catch (error) {
      console.error('Error loading merchant rewards:', error);
    } finally {
      setLoadingRewards(false);
    }
  };

  // Enhanced handlers that refresh local data
  const handleUpdateReward = async (rewardId: string, updates: Partial<Reward>) => {
    await onUpdateReward(rewardId, updates, loadMerchantRewards);
  };

  const handleDeleteReward = async (rewardId: string) => {
    await onDeleteReward(rewardId, loadMerchantRewards);
  };

  const handleUpdateSupply = async (rewardId: string, additionalSupply: number) => {
    await onUpdateSupply(rewardId, additionalSupply, loadMerchantRewards);
  };

  const handleCreateReward = async (name: string, description: string, pointsCost: number, imageUrl: string, supply: number) => {
    await onCreateReward(name, description, pointsCost, imageUrl, supply, loadMerchantRewards);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4">🏪 Merchant Portal</h2>
        <div className={`${isMerchant ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
          {isMerchant ? (
            <>
              <h3 className="font-bold text-lg mb-2 text-green-800">✅ Merchant Status</h3>
              <p className="text-sm text-green-700 mb-2">
                🎉 You are registered as a Demo Merchant and can now issue points to customers!
              </p>
              <div className="flex items-center gap-2 text-sm">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                  Merchant Active
                </span>
                <span className="text-green-600">Ready to issue points and create rewards</span>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-bold text-lg mb-2">Register as Merchant</h3>
              <p className="text-sm text-blue-800 mb-4">
                Register your business to issue loyalty points to customers
              </p>
              <button
                onClick={() => registerMerchant('Demo Merchant', 'A demo merchant for testing')}
                disabled={!isConnected || loading}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
              >
                Register as Demo Merchant
              </button>
            </>
          )}
        </div>

        <div className={`${hasCreatedRewards ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'} border rounded-lg p-4 mb-6`}>
          <h3 className="font-bold text-lg mb-2">
            {hasCreatedRewards ? '✅ Reward Templates Created' : 'Create Reward Templates'}
          </h3>
          {hasCreatedRewards ? (
            <div>
              <p className="text-sm text-green-700 mb-2">
                🎉 Demo reward templates have been created successfully! Customers can now redeem:
              </p>
              <ul className="text-sm text-green-600 ml-4 mb-2">
                <li>• ☕ Free Coffee (100 points)</li>
                <li>• 🥐 Pastry Combo (150 points)</li>
                <li>• 🎫 10% Off Coupon (200 points)</li>
              </ul>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                  Rewards Active
                </span>
                <span className="text-green-600 text-xs">Available in Rewards tab</span>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-purple-800 mb-4">
                {isMerchant 
                  ? 'Create on-chain reward templates that customers can redeem with their points'
                  : 'You must register as a merchant first to create reward templates'
                }
              </p>
              <button
                onClick={createDemoRewards}
                disabled={!isConnected || loading || !isMerchant || hasCreatedRewards}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
              >
                {!isMerchant ? 'Register as Merchant First' : 'Create Demo Rewards (Coffee, Pastry, Coupon)'}
              </button>
            </>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-lg mb-2 text-green-800">Issue Points for Testing</h3>
          <p className="text-sm text-green-700 mb-2">
            🎉 As a merchant, you can issue points to your own loyalty account for testing reward redemption.
          </p>
          <p className="text-xs text-green-600">
            💡 Issue points to yourself, then go to the Rewards tab to test redeeming rewards!
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => issuePoints(100)}
            disabled={!isConnected || loading || !isMerchant}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
          >
            Issue 100 Points
          </button>
          <button
            onClick={() => issuePoints(200)}
            disabled={!isConnected || loading || !isMerchant}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
          >
            Issue 200 Points
          </button>
          <button
            onClick={() => issuePoints(500)}
            disabled={!isConnected || loading || !isMerchant}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
          >
            Issue 500 Points
          </button>
        </div>

        {isMerchant && (
          <div className="mt-6">
            <div className="flex border-b mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium ${activeTab === 'overview' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('rewards')}
                className={`px-4 py-2 font-medium ${activeTab === 'rewards' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎁 Manage Rewards
              </button>
            </div>

            {activeTab === 'overview' && (
              <div>
                <h3 className="font-bold text-xl mb-4">Participating Merchants</h3>
                <div className="space-y-4">
                  {merchants.map(merchant => (
                    <div key={merchant.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-lg">{merchant.name}</h4>
                          <p className="text-gray-600">{merchant.description}</p>
                          <div className="mt-2">
                            <span className="text-sm text-gray-500">Total Points Issued: </span>
                            <span className="font-semibold">{merchant.totalIssued.toLocaleString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          merchant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {merchant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div>
                {loadingRewards ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your rewards...</p>
                  </div>
                ) : (
                  <MerchantRewardManager
                    rewards={merchantRewards}
                    isConnected={isConnected}
                    loading={loading}
                    onUpdateReward={handleUpdateReward}
                    onDeleteReward={handleDeleteReward}
                    onUpdateSupply={handleUpdateSupply}
                    onCreateReward={handleCreateReward}
                    showNotification={showNotification}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};