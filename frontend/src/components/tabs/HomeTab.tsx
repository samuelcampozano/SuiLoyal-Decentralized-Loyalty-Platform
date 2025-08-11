import { FC } from 'react';
import { Transaction, LoyaltyAccount } from '../../types';

interface HomeTabProps {
  isConnected: boolean;
  loyaltyAccount: LoyaltyAccount | null;
  loading: boolean;
  transactions: Transaction[];
  connectWallet: () => void;
  createLoyaltyAccount: () => void;
}

export const HomeTab: FC<HomeTabProps> = ({
  isConnected,
  loyaltyAccount,
  loading,
  transactions,
  connectWallet,
  createLoyaltyAccount,
}) => (
  <div className="space-y-8">
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
      <h2 className="text-3xl font-bold mb-4">Welcome to SuiLoyal</h2>
      <p className="text-gray-600 mb-6">
        The decentralized loyalty platform that puts you in control of your rewards. 
        Earn points from any participating merchant and redeem them for exclusive rewards!
      </p>
      {!isConnected && (
        <button
          onClick={connectWallet}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          Get Started →
        </button>
      )}
      {isConnected && !loyaltyAccount && (
        <button
          onClick={createLoyaltyAccount}
          className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
          disabled={loading}
        >
          Create Loyalty Account
        </button>
      )}
    </div>

    <div className="grid md:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="text-4xl mb-4">💳</div>
        <h3 className="font-bold text-lg mb-2">Connect Wallet</h3>
        <p className="text-gray-600">Link your Sui wallet to start earning and redeeming points</p>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="text-4xl mb-4">🎁</div>
        <h3 className="font-bold text-lg mb-2">Earn Rewards</h3>
        <p className="text-gray-600">Shop at participating merchants and earn points automatically</p>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="text-4xl mb-4">🏆</div>
        <h3 className="font-bold text-lg mb-2">Redeem Points</h3>
        <p className="text-gray-600">Exchange your points for exclusive NFT vouchers and rewards</p>
      </div>
    </div>

    {isConnected && (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="font-bold text-xl mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {transactions.slice(0, 5).map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                  tx.type === 'earned' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {tx.type === 'earned' ? 'Earned' : 'Redeemed'}
                </span>
                <span className="ml-2 text-sm">{tx.merchant}</span>
                {tx.reward && <span className="ml-2 text-sm text-gray-500">• {tx.reward}</span>}
              </div>
              <div className="text-right">
                <div className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount)} pts
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(tx.date).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);