import { FC } from 'react';
import { Reward } from '../../types';

interface RewardsTabProps {
  rewards: Reward[];
  isConnected: boolean;
  pointsBalance: number;
  loading: boolean;
  redeemReward: (reward: Reward) => void;
  isMerchant?: boolean;
  onNavigateToMerchant?: () => void;
}

const RewardCard: FC<{
  reward: Reward;
  isConnected: boolean;
  pointsBalance: number;
  loading: boolean;
  onRedeem: (reward: Reward) => void;
}> = ({ reward, isConnected, pointsBalance, loading, onRedeem }) => {
  const canRedeem = isConnected && pointsBalance >= reward.pointsCost && !loading;
  const isAffordable = pointsBalance >= reward.pointsCost;
  const lowStock = reward.remaining < 10;

  return (
    <div className="reward-card group animate-entrance" style={{ animationDelay: `${Math.random() * 200}ms` }}>
      {/* Card Header with Image and Status */}
      <div className="relative mb-4">
        <div className="w-full h-32 bg-gradient-to-br from-brand-100 to-sui-100 rounded-xl flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-300">
          {reward.imageUrl}
        </div>
        {lowStock && (
          <div className="absolute top-2 right-2 status-warning animate-pulse">
            Low Stock
          </div>
        )}
        {!isAffordable && isConnected && (
          <div className="absolute top-2 left-2 status-error">
            Need {reward.pointsCost - pointsBalance} more
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="space-y-3">
        <div>
          <h3 className="font-display font-bold text-xl text-dark-800 group-hover:gradient-text transition-all duration-200">
            {reward.name}
          </h3>
          <p className="text-dark-600 text-sm leading-relaxed mt-1">
            {reward.description}
          </p>
        </div>

        {/* Price and Stock */}
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-warning-400 to-warning-500 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">⭐</span>
            </div>
            <span className="font-bold text-lg text-brand-600">
              {reward.pointsCost.toLocaleString()}
            </span>
            <span className="text-dark-500 text-sm">points</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${lowStock ? 'bg-warning-400' : 'bg-success-400'}`}></div>
            <span className="text-xs text-dark-500">{reward.remaining} left</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onRedeem(reward)}
          disabled={!canRedeem}
          className={`
            w-full py-3 rounded-xl font-medium transition-all duration-200 relative overflow-hidden group/btn
            ${canRedeem
              ? 'btn-primary hover:shadow-glow-lg transform hover:scale-105 active:scale-95' 
              : !isConnected
                ? 'bg-dark-200 text-dark-500 cursor-not-allowed'
                : !isAffordable
                  ? 'bg-error-100 text-error-600 border border-error-200 cursor-not-allowed'
                  : 'bg-dark-200 text-dark-500 cursor-not-allowed'
            }
          `}
        >
          <span className="relative z-10">
            {!isConnected ? '🔗 Connect Wallet' : 
             !isAffordable ? '💰 Insufficient Points' : 
             loading ? '⏳ Processing...' : '🎁 Redeem Now'}
          </span>
          {canRedeem && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
          )}
        </button>
      </div>
    </div>
  );
};

export const RewardsTab: FC<RewardsTabProps> = ({
  rewards,
  isConnected,
  pointsBalance,
  loading,
  redeemReward,
  isMerchant = false,
  onNavigateToMerchant,
}) => (
  <div className="space-y-8 animate-entrance">
    {/* Header Section */}
    <div className="glass-card p-8 text-center">
      <div className="animate-bounce-gentle inline-block text-6xl mb-4">🎁</div>
      <h2 className="text-3xl font-display font-bold gradient-text mb-3">
        Rewards Marketplace
      </h2>
      <p className="text-dark-600 text-lg max-w-2xl mx-auto leading-relaxed">
        Discover exclusive rewards from our merchant partners. Redeem points for amazing prizes, discounts, and experiences.
      </p>
      {isConnected && (
        <div className="mt-4 glass px-6 py-3 rounded-2xl inline-flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-warning-400 to-warning-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">⭐</span>
          </div>
          <span className="font-bold text-dark-800">{pointsBalance.toLocaleString()}</span>
          <span className="text-dark-600">points available</span>
        </div>
      )}
    </div>
    
    {/* Rewards Grid */}
    {rewards.length === 0 ? (
      <div className="glass-card p-12 text-center">
        <div className="animate-float text-8xl mb-6">🏪</div>
        <h3 className="text-2xl font-display font-bold text-dark-800 mb-3">
          No Rewards Available Yet
        </h3>
        <p className="text-dark-600 mb-6 max-w-md mx-auto leading-relaxed">
          {isMerchant ? 
            "You haven't created any rewards yet. Start building your loyalty program by creating your first reward!" :
            "Merchants are working on exciting rewards for you. Check back soon!"
          }
        </p>
        {isMerchant && onNavigateToMerchant ? (
          <div className="space-y-4">
            <button
              onClick={onNavigateToMerchant}
              disabled={!isConnected || loading}
              className="btn-primary hover-glow-lg"
            >
              ✨ Create Your First Reward
            </button>
            <p className="text-sm text-dark-500">
              Design rewards with custom names, descriptions, and point costs
            </p>
          </div>
        ) : (
          <div className="glass px-6 py-4 rounded-2xl inline-block">
            <p className="text-brand-600 font-medium">
              💡 Are you a merchant? Visit the Merchant tab to create rewards
            </p>
          </div>
        )}
      </div>
    ) : (
      <div className="space-y-6">
        {/* Filter/Sort Bar */}
        <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-dark-700 font-medium">
              {rewards.length} reward{rewards.length !== 1 ? 's' : ''} available
            </span>
            <div className="w-px h-4 bg-dark-300"></div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success-400 rounded-full"></div>
              <span className="text-xs text-dark-500">In Stock</span>
              <div className="w-2 h-2 bg-warning-400 rounded-full"></div>
              <span className="text-xs text-dark-500">Low Stock</span>
            </div>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.map((reward, index) => (
            <div
              key={reward.id}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <RewardCard
                reward={reward}
                isConnected={isConnected}
                pointsBalance={pointsBalance}
                loading={loading}
                onRedeem={redeemReward}
              />
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);