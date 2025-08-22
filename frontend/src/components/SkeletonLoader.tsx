import { FC } from 'react';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'circle' | 'button';
  width?: string;
  height?: string;
  className?: string;
  count?: number;
}

export const SkeletonLoader: FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  count = 1
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'h-80 rounded-2xl';
      case 'circle':
        return 'rounded-full aspect-square';
      case 'button':
        return 'h-12 rounded-xl';
      case 'text':
      default:
        return 'h-4 rounded-lg';
    }
  };

  const skeletonClasses = `
    bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
    animate-shimmer bg-[length:200%_100%] 
    ${getVariantClasses()} 
    ${className}
  `;

  const style = {
    width: width || (variant === 'circle' ? height : undefined),
    height: height || undefined,
  };

  if (count > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, index) => (
          <div 
            key={index} 
            className={skeletonClasses} 
            style={style}
          />
        ))}
      </div>
    );
  }

  return <div className={skeletonClasses} style={style} />;
};

interface RewardCardSkeletonProps {
  count?: number;
}

export const RewardCardSkeleton: FC<RewardCardSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index} 
          className="glass-card p-6 space-y-4 animate-entrance"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Image skeleton */}
          <SkeletonLoader variant="card" height="8rem" />
          
          {/* Title skeleton */}
          <SkeletonLoader width="70%" height="1.5rem" />
          
          {/* Description skeleton */}
          <SkeletonLoader count={2} height="1rem" />
          
          {/* Price and stock skeleton */}
          <div className="flex justify-between items-center pt-2">
            <SkeletonLoader width="6rem" height="1.25rem" />
            <SkeletonLoader width="4rem" height="1rem" />
          </div>
          
          {/* Button skeleton */}
          <SkeletonLoader variant="button" />
        </div>
      ))}
    </div>
  );
};

export const MarketplaceHeaderSkeleton: FC = () => {
  return (
    <div className="glass-card p-8 text-center space-y-4">
      {/* Icon skeleton */}
      <div className="flex justify-center">
        <SkeletonLoader variant="circle" width="4rem" height="4rem" />
      </div>
      
      {/* Title skeleton */}
      <SkeletonLoader width="20rem" height="2rem" className="mx-auto" />
      
      {/* Description skeleton */}
      <div className="max-w-2xl mx-auto space-y-2">
        <SkeletonLoader height="1.25rem" />
        <SkeletonLoader width="80%" height="1.25rem" className="mx-auto" />
      </div>
      
      {/* Points balance skeleton */}
      <div className="flex justify-center mt-4">
        <SkeletonLoader width="12rem" height="3rem" className="rounded-2xl" />
      </div>
    </div>
  );
};