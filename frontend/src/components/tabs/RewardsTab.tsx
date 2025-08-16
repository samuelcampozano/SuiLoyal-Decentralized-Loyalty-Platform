import { FC } from 'react';
import { Reward } from '../../types';

interface RewardsTabProps {
  rewards: Reward[];
  isConnected: boolean;
  pointsBalance: number;
  loading: boolean;
  redeemReward: (reward: Reward) => void;
  isMerchant?: boolean;
  onCreateReward?: (name: string, description: string, pointsCost: number, imageUrl: string, supply: number) => void;
}

export const RewardsTab: FC<RewardsTabProps> = ({
  rewards,
  isConnected,
  pointsBalance,
  loading,
  redeemReward,
  isMerchant = false,
  onCreateReward,
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🎁 Rewards Marketplace</h2>
      <p className="text-gray-600 mb-6">Browse and redeem exclusive rewards from our merchant partners</p>
      
      {rewards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏪</div>
          <h3 className="text-xl font-bold mb-2">No Reward Templates Available</h3>
          <p className="text-gray-600 mb-4">
            {isMerchant ? 
              "You haven't created any rewards yet. Create your first reward to get started!" :
              "Merchants haven't created reward templates yet."
            }
          </p>
          {isMerchant && onCreateReward ? (
            <div className="mt-6">
              <button
                onClick={() => {
                  // Create a sample reward - merchants can edit it afterwards
                  onCreateReward(
                    "Welcome Reward",
                    "Special reward for new customers",
                    100,
                    "🎁",
                    10
                  );
                }}
                disabled={!isConnected || loading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg disabled:bg-gray-300 transition-all"
              >
                🚀 Create Your First Reward
              </button>
              <p className="text-sm text-gray-500 mt-2">
                You can edit the details after creation in the Merchant tab
              </p>
            </div>
          ) : (
            <p className="text-sm text-blue-600">
              💡 Tip: If you're a registered merchant, go to the Merchant tab to create rewards
            </p>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map(reward => (
            <div key={reward.id} className="border rounded-xl p-4 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3 text-center">{reward.imageUrl}</div>
              <h3 className="font-bold text-lg">{reward.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{reward.description}</p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-blue-600 font-bold">{reward.pointsCost} points</span>
                <span className="text-xs text-gray-500">{reward.remaining} left</span>
              </div>
              <button
                onClick={() => redeemReward(reward)}
                disabled={!isConnected || pointsBalance < reward.pointsCost || loading}
                className={`w-full py-2 rounded-lg font-semibold transition-all ${
                  isConnected && pointsBalance >= reward.pointsCost
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {!isConnected ? 'Connect Wallet' : 
                 pointsBalance < reward.pointsCost ? 'Insufficient Points' : 'Redeem'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);