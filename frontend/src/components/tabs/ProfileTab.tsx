import { FC } from 'react';
import { Transaction } from '../../types';

interface ProfileTabProps {
  isConnected: boolean;
  walletAddress: string;
  pointsBalance: number;
  balance: number;
  transactions: Transaction[];
  connectWallet: () => void;
}

export const ProfileTab: FC<ProfileTabProps> = ({
  isConnected,
  walletAddress,
  pointsBalance,
  balance,
  transactions,
  connectWallet,
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-6">👤 My Profile</h2>
      
      {isConnected ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl p-6">
            <div className="text-sm opacity-90 mb-2">Wallet Address</div>
            <div className="font-mono text-lg mb-4">{walletAddress}</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm opacity-90">Points Balance</div>
                <div className="text-3xl font-bold">{pointsBalance}</div>
              </div>
              <div>
                <div className="text-sm opacity-90">SUI Balance</div>
                <div className="text-xl font-bold">{balance} SUI</div>
              </div>
              <div>
                <div className="text-sm opacity-90">Total Earned</div>
                <div className="text-xl font-bold">
                  {transactions
                    .filter(tx => tx.type === 'earned')
                    .reduce((sum, tx) => sum + tx.amount, 0)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-xl mb-4">Transaction History</h3>
            <div className="space-y-3">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'earned' ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {tx.type === 'earned' ? '⬆️' : '⬇️'}
                    </div>
                    <div>
                      <div className="font-semibold">{tx.merchant}</div>
                      <div className="text-sm text-gray-600">
                        {tx.type === 'earned' ? 'Points Earned' : `Redeemed: ${tx.reward}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount)} pts
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.date).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-600 mb-4">Connect your wallet to view your profile</p>
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  </div>
);