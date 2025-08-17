# RewardCard Component (Planned)

## 🎯 Purpose
Reusable reward card component for marketplace and management interfaces.

## 📋 Planned Features
- [ ] Consistent reward display across the app
- [ ] Interactive states (hover, selected, disabled)
- [ ] Support for different layouts (grid, list, featured)
- [ ] Reward status indicators
- [ ] Action buttons (redeem, edit, delete)

## 🏗️ Planned Props Interface
```typescript
interface RewardCardProps {
  reward: Reward;
  variant: 'marketplace' | 'management' | 'compact';
  interactive?: boolean;
  onRedeem?: (reward: Reward) => void;
  onEdit?: (reward: Reward) => void;
  onDelete?: (reward: Reward) => void;
}
```

## 🚀 Implementation Status
**Status**: Planning phase  
**Priority**: Medium (current inline cards work well)
**Dependencies**: Design system standardization

## 📝 Current Implementation
Reward cards are currently rendered inline within:
- RewardsTab (marketplace cards)
- MerchantRewardManager (management cards)

Consolidating into a reusable component would improve consistency.