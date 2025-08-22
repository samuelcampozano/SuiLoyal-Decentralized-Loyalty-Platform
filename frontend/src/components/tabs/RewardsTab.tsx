import { FC, useState } from 'react';
import { Reward } from '../../types';
import { RewardCardSkeleton, MarketplaceHeaderSkeleton } from '../SkeletonLoader';

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
  index: number;
}> = ({ reward, isConnected, pointsBalance, loading, onRedeem, index }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const canRedeem = isConnected && pointsBalance >= reward.pointsCost && !loading && reward.remaining > 0;
  const isAffordable = pointsBalance >= reward.pointsCost;
  const outOfStock = reward.remaining === 0;
  const lowStock = reward.remaining > 0 && reward.remaining < 10;
  const isPremium = reward.pointsCost >= 1000;

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
    }
  };

  return (
    <div 
      className={`
        ${isPremium ? 'reward-card-premium' : 'reward-card'} 
        group animate-entrance relative overflow-hidden
        ${isPressed ? 'scale-95' : isHovered ? 'scale-105 shadow-glow-lg' : ''}
        ${outOfStock ? 'opacity-75' : ''}
        transition-all duration-300 ease-out cursor-pointer
      `}
      style={{ animationDelay: `${index * 50}ms` }}
      onMouseEnter={() => {
        setIsHovered(true);
        handleInteraction();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsPressed(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Premium indicator */}
      {isPremium && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-gradient-to-r from-warning-400 to-warning-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-card animate-scale-pulse">
            ✨ Premium
          </div>
        </div>
      )}

      {/* Card Header with Enhanced Image and Status */}
      <div className="relative mb-6">
        <div className={`
          w-full h-36 bg-gradient-to-br rounded-2xl flex items-center justify-center text-7xl
          transition-all duration-500 relative overflow-hidden
          ${outOfStock 
            ? 'from-gray-200 to-gray-300' 
            : isPremium 
              ? 'from-warning-100 via-brand-100 to-sui-100' 
              : 'from-brand-100 to-sui-100'
          }
          ${isHovered ? 'scale-110 rotate-3' : 'scale-100 rotate-0'}
          ${hasInteracted ? 'float-gentle' : ''}
        `}>
          <span className={`
            transition-all duration-300 
            ${isHovered ? 'animate-bounce-gentle scale-110' : ''}
            ${outOfStock ? 'grayscale' : ''}
          `}>
            {reward.imageUrl}
          </span>
          
          {/* Shine effect on hover */}
          {isHovered && !outOfStock && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-slide-right"></div>
          )}
        </div>

        {/* Enhanced Status Badges */}
        <div className="absolute top-3 right-3 space-y-2">
          {outOfStock && (
            <div className="status-error animate-pulse">
              ❌ Out of Stock
            </div>
          )}
          {lowStock && !outOfStock && (
            <div className="status-warning animate-pulse">
              ⚠️ Low Stock
            </div>
          )}
          {!isAffordable && isConnected && !outOfStock && (
            <div className="status-error">
              Need {(reward.pointsCost - pointsBalance).toLocaleString()} more
            </div>
          )}
        </div>

        {/* Availability indicator */}
        <div className={`
          absolute bottom-3 left-3 w-3 h-3 rounded-full transition-all duration-300
          ${outOfStock ? 'bg-error-500 animate-pulse' : 
            lowStock ? 'bg-warning-400 animate-pulse' : 
            'bg-success-500 animate-scale-pulse'}
        `}></div>
      </div>

      {/* Enhanced Card Content */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className={`
            font-display font-bold text-xl transition-all duration-300
            ${isHovered ? 'gradient-text transform -translate-y-1' : 'text-dark-800'}
            ${outOfStock ? 'text-dark-500' : ''}
          `}>
            {reward.name}
          </h3>
          <p className={`
            text-sm leading-relaxed transition-all duration-300
            ${isHovered ? 'text-dark-700' : 'text-dark-600'}
            ${outOfStock ? 'text-dark-400' : ''}
          `}>
            {reward.description}
          </p>
        </div>

        {/* Enhanced Price and Stock Display */}
        <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className={`
              w-8 h-8 bg-gradient-to-r from-warning-400 to-warning-500 rounded-full 
              flex items-center justify-center shadow-card transition-transform duration-300
              ${isHovered ? 'animate-bounce-gentle scale-110' : ''}
            `}>
              <span className="text-sm font-bold text-white">⭐</span>
            </div>
            <div>
              <span className={`
                font-bold text-xl transition-all duration-300
                ${isPremium ? 'text-warning-600' : 'text-brand-600'}
                ${isHovered ? 'animate-pulse' : ''}
              `}>
                {reward.pointsCost.toLocaleString()}
              </span>
              <span className="text-dark-500 text-sm ml-1">points</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${outOfStock ? 'bg-error-500' : 
                lowStock ? 'bg-warning-400' : 
                'bg-success-400'}
              ${isHovered ? 'animate-pulse scale-125' : ''}
            `}></div>
            <span className={`
              text-sm font-medium transition-all duration-300
              ${outOfStock ? 'text-error-600' : 
                lowStock ? 'text-warning-600' : 
                'text-success-600'}
            `}>
              {outOfStock ? 'Out of stock' : `${reward.remaining} left`}
            </span>
          </div>
        </div>

        {/* Enhanced Action Button */}
        <button
          onClick={() => onRedeem(reward)}
          disabled={!canRedeem}
          className={`
            w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 
            relative overflow-hidden group/btn transform
            ${canRedeem
              ? 'btn-primary hover:shadow-glow-lg hover:scale-105 active:scale-95 hover:-translate-y-1' 
              : !isConnected
                ? 'bg-dark-200 text-dark-500 cursor-not-allowed'
                : outOfStock
                  ? 'bg-error-100 text-error-600 border-2 border-error-200 cursor-not-allowed'
                  : !isAffordable
                    ? 'bg-error-100 text-error-600 border-2 border-error-200 cursor-not-allowed'
                    : 'bg-dark-200 text-dark-500 cursor-not-allowed'
            }
            ${isHovered && canRedeem ? 'animate-pulse' : ''}
          `}
        >
          <span className="relative z-10 flex items-center justify-center space-x-2">
            <span>
              {!isConnected ? '🔗 Connect Wallet' : 
               outOfStock ? '❌ Out of Stock' :
               !isAffordable ? '💰 Insufficient Points' : 
               loading ? '⏳ Processing...' : '🎁 Redeem Now'}
            </span>
            {canRedeem && isHovered && (
              <span className="animate-bounce-gentle">✨</span>
            )}
          </span>
          
          {/* Enhanced button effects */}
          {canRedeem && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>
              {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-r from-brand-400/20 to-sui-400/20 animate-pulse"></div>
              )}
            </>
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
}) => {
  // Show skeleton loading for initial load
  if (loading && rewards.length === 0) {
    return (
      <div className="space-y-8 animate-entrance">
        <MarketplaceHeaderSkeleton />
        <RewardCardSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-entrance">
      {/* Enhanced Header Section */}
      <div className="glass-card p-10 text-center relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-sui-500/5"></div>
        <div className="absolute top-4 left-4 w-20 h-20 bg-gradient-to-br from-brand-400/20 to-sui-400/20 rounded-full blur-xl"></div>
        <div className="absolute bottom-4 right-4 w-32 h-32 bg-gradient-to-br from-warning-400/20 to-brand-400/20 rounded-full blur-xl"></div>
        
        <div className="relative z-10">
          <div className="animate-float-gentle inline-block text-7xl mb-6 filter drop-shadow-lg">🎁</div>
          <h2 className="text-4xl font-display font-bold gradient-text mb-4 animate-slide-up">
            Rewards Marketplace
          </h2>
          <p className="text-dark-600 text-xl max-w-3xl mx-auto leading-relaxed mb-6 animate-slide-up-delayed">
            Discover exclusive rewards from our merchant partners. Redeem points for amazing prizes, discounts, and experiences.
          </p>
          
          {isConnected && (
            <div className="mt-6 glass px-8 py-4 rounded-2xl inline-flex items-center space-x-3 hover-glow-lg animate-scale-in">
              <div className="w-8 h-8 bg-gradient-to-r from-warning-400 to-warning-500 rounded-full flex items-center justify-center shadow-card animate-scale-pulse">
                <span className="text-sm font-bold text-white">⭐</span>
              </div>
              <div>
                <span className="font-bold text-2xl text-dark-800 animate-pulse">{pointsBalance.toLocaleString()}</span>
                <span className="text-dark-600 text-lg ml-2">points available</span>
              </div>
            </div>
          )}
        </div>
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
              <div className="w-2 h-2 bg-error-500 rounded-full"></div>
              <span className="text-xs text-dark-500">Out of Stock</span>
            </div>
          </div>
        </div>

        {/* Enhanced Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rewards.map((reward, index) => (
            <RewardCard
              key={reward.id}
              reward={reward}
              isConnected={isConnected}
              pointsBalance={pointsBalance}
              loading={loading}
              onRedeem={redeemReward}
              index={index}
            />
          ))}
        </div>
        
        {/* Loading more rewards indicator */}
        {loading && rewards.length > 0 && (
          <div className="flex justify-center mt-8">
            <div className="glass px-6 py-3 rounded-xl animate-pulse">
              <span className="text-dark-600">✨ Loading more rewards...</span>
            </div>
          </div>
        )}
      </div>
    )}
  </div>
  );
};