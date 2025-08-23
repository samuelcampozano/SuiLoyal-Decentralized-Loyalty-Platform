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
  color = 'text-gray-900'
}) => {
  const displayValue = formatValue ? formatValue(value) : value;
  
  const getTrendIcon = () => {
    if (change === undefined || change === null) return null;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === null) return 'text-gray-600';
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatChange = (change: number) => {
    const abs = Math.abs(change);
    return `${change > 0 ? '+' : ''}${abs.toFixed(1)}%`;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className="text-gray-600 group-hover:text-gray-900 transition-colors">{icon}</div>}
            <p className="text-sm font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
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
                <span className="text-xs text-gray-500">
                  {changeLabel}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
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