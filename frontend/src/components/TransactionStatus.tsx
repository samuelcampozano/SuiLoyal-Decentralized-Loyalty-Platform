import { FC } from 'react';

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  transactionType?: string;
}

export const TransactionStatus: FC<TransactionStatusProps> = ({
  status,
  message,
  transactionType = 'Transaction'
}) => {
  if (status === 'idle') return null;

  const statusConfig = {
    pending: {
      icon: '⏳',
      color: 'blue',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    },
    success: {
      icon: '✅',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    error: {
      icon: '❌',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`fixed top-4 right-4 z-50 ${config.bgColor} ${config.borderColor} border rounded-lg p-4 max-w-sm shadow-lg`}>
      <div className="flex items-start gap-3">
        <div className="text-xl">{config.icon}</div>
        <div>
          <h4 className={`font-semibold ${config.textColor}`}>
            {status === 'pending' && `Processing ${transactionType}...`}
            {status === 'success' && `${transactionType} Successful!`}
            {status === 'error' && `${transactionType} Failed`}
          </h4>
          {message && (
            <p className={`text-sm mt-1 ${config.textColor} opacity-80`}>
              {message}
            </p>
          )}
          {status === 'pending' && (
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                <span className="text-xs text-blue-600">Please approve in your wallet</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};