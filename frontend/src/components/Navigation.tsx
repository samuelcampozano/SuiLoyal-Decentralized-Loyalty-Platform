import { FC, useState } from 'react';
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'rewards', label: 'Rewards', icon: '🎁' },
    { id: 'merchant', label: 'Merchant', icon: '🏪' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav backdrop-blur-xl bg-gradient-to-r from-brand-500/10 via-sui-500/10 to-brand-600/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-18">
          {/* Logo */}
          <div className="flex items-center animate-entrance">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-sui-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-r from-brand-500 to-sui-500 p-3 rounded-2xl shadow-card">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-display font-bold gradient-text">SuiLoyal</h1>
                <p className="text-xs text-dark-500 font-medium">Decentralized Loyalty</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2 animate-entrance-delayed">
            {navItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`
                  relative px-4 py-2.5 rounded-xl font-medium transition-all duration-200 
                  flex items-center space-x-2 group
                  ${currentTab === item.id 
                    ? 'bg-white/20 text-dark-900 shadow-inner-glow font-semibold' 
                    : 'text-dark-700 hover:bg-white/10 hover:text-dark-900'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="text-lg group-hover:animate-bounce-gentle">{item.icon}</span>
                <span>{item.label}</span>
                {currentTab === item.id && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gradient-to-r from-brand-500 to-sui-500 rounded-full animate-scale-in"></div>
                )}
              </button>
            ))}
          </div>

          {/* Right Side - Points & Account */}
          <div className="flex items-center space-x-4 animate-entrance-delayed">
            {/* Points Display */}
            {currentAccount && (
              <div className="hidden sm:flex items-center space-x-2 glass-card px-4 py-2 hover-glow">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-warning-400 to-warning-500 rounded-full flex items-center justify-center shadow-card">
                    <span className="text-sm font-bold text-white">⭐</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-dark-800">{pointsBalance.toLocaleString()}</p>
                    <p className="text-xs text-dark-500">Points</p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Section */}
            {currentAccount ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 glass-card px-3 py-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-sui-500 to-brand-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {currentAccount.address.slice(2, 4).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-dark-700">
                    {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="btn-error text-sm px-4 py-2"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="[&>button]:!bg-gradient-to-r [&>button]:!from-brand-500 [&>button]:!to-sui-500 [&>button]:!text-white [&>button]:!px-6 [&>button]:!py-3 [&>button]:!rounded-xl [&>button]:!font-medium [&>button]:!shadow-card [&>button]:hover:!shadow-card-hover [&>button]:!transition-all [&>button]:!duration-200">
                <ConnectButton />
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-xl glass hover:bg-white/20 transition-all duration-200"
            >
              <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                <div className={`h-0.5 bg-dark-700 transition-all duration-200 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
                <div className={`h-0.5 bg-dark-700 transition-all duration-200 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
                <div className={`h-0.5 bg-dark-700 transition-all duration-200 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 glass-card m-4 rounded-2xl shadow-card-xl animate-slide-down">
            <div className="p-6 space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium transition-all duration-200
                    ${currentTab === item.id 
                      ? 'bg-gradient-to-r from-brand-500 to-sui-500 text-white shadow-card' 
                      : 'text-dark-700 hover:bg-white/10'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};