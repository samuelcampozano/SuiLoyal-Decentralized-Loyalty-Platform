import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  formatValue?: (value: string | number) => string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  formatValue,
  color = 'text-white'
}) => {
  const displayValue = formatValue ? formatValue(value) : value;
  
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-gray-400';
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const formatChange = (change: number) => {
    const abs = Math.abs(change);
    return `${change > 0 ? '+' : ''}${abs.toFixed(1)}%`;
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-xl hover:bg-white/15 transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className="text-white/80 group-hover:text-white transition-colors">{icon}</div>}
            <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">
              {title}
            </p>
          </div>
          
          <p className={`text-2xl font-bold ${color} mb-2 group-hover:scale-105 transition-transform`}>
            {displayValue}
          </p>

          {change !== undefined && change !== null && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {formatChange(change)}
              </span>
              {changeLabel && (
                <span className="text-xs text-white/50">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-1000 ease-out`}
          style={{ 
            width: change !== undefined && change !== null ? `${Math.min(Math.abs(change), 100)}%` : '0%'
          }}
        />
      </div>
    </div>
  );
};

export default StatCard;