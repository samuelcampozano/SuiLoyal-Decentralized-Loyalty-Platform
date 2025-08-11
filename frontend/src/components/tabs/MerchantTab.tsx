import { FC } from 'react';
import { Merchant } from '../../types';

interface MerchantTabProps {
  merchants: Merchant[];
  isConnected: boolean;
  loading: boolean;
  issuePoints: (amount: number) => void;
  registerMerchant: (name: string, description: string) => void;
  createDemoRewards: () => void;
}

export const MerchantTab: FC<MerchantTabProps> = ({
  merchants,
  isConnected,
  loading,
  issuePoints,
  registerMerchant,
  createDemoRewards,
}) => (
  <div className="space-y-6">
    <div className="bg-white rounded-xl p-6 shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🏪 Merchant Portal</h2>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-lg mb-2">Register as Merchant</h3>
        <p className="text-sm text-blue-800 mb-4">
          Register your business to issue loyalty points to customers
        </p>
        <button
          onClick={() => registerMerchant('Demo Merchant', 'A demo merchant for testing')}
          disabled={!isConnected || loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
        >
          Register as Demo Merchant
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-lg mb-2">Create Reward Templates</h3>
        <p className="text-sm text-purple-800 mb-4">
          Create on-chain reward templates that customers can redeem with their points
        </p>
        <button
          onClick={createDemoRewards}
          disabled={!isConnected || loading}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
        >
          Create Demo Rewards (Coffee, Pastry, Coupon)
        </button>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800">
          🎉 Ready for points issuance! If you've registered as a merchant and created a loyalty account, you can now issue points using the buttons below.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => issuePoints(50)}
          disabled={!isConnected || loading}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
        >
          Issue 50 Demo Points
        </button>
        <button
          onClick={() => issuePoints(100)}
          disabled={!isConnected || loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:bg-gray-300 transition-colors"
        >
          Issue 100 Demo Points
        </button>
      </div>

      <h3 className="font-bold text-xl mb-4">Participating Merchants</h3>
      <div className="space-y-4">
        {merchants.map(merchant => (
          <div key={merchant.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{merchant.name}</h4>
                <p className="text-gray-600">{merchant.description}</p>
                <div className="mt-2">
                  <span className="text-sm text-gray-500">Total Points Issued: </span>
                  <span className="font-semibold">{merchant.totalIssued.toLocaleString()}</span>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                merchant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {merchant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);