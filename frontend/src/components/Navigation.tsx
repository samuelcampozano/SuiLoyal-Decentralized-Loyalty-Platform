import { FC } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { ConnectButton } from '@mysten/dapp-kit';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pointsBalance: number;
}

export const Navigation: FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  pointsBalance,
}) => {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();

  return (
  <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center space-x-8">
          <h1 className="text-2xl font-bold">🎯 SuiLoyal</h1>
          <div className="hidden md:flex space-x-4">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-2 rounded-md ${currentTab === 'home' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentTab('rewards')}
              className={`px-3 py-2 rounded-md ${currentTab === 'rewards' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Rewards
            </button>
            <button
              onClick={() => setCurrentTab('merchant')}
              className={`px-3 py-2 rounded-md ${currentTab === 'merchant' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Merchant
            </button>
            <button
              onClick={() => setCurrentTab('profile')}
              className={`px-3 py-2 rounded-md ${currentTab === 'profile' ? 'bg-white/20' : 'hover:bg-white/10'}`}
            >
              Profile
            </button>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {currentAccount && (
            <div className="bg-white/20 px-3 py-1 rounded-full">
              <span className="font-bold">{pointsBalance}</span> points
            </div>
          )}
          {currentAccount ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
              </span>
              <button
                onClick={() => disconnect()}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <ConnectButton />
          )}
        </div>
      </div>
    </div>
  </nav>
  );
};