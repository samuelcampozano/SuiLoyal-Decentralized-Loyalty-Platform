import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { PACKAGE_ID, PLATFORM_ID, SUI_CONFIG } from '../config';

export class LoyaltyService {
  public client: SuiClient;

  constructor() {
    this.client = new SuiClient({
      url: SUI_CONFIG.fullnodeUrl,
    });
  }

  // Query user's loyalty account points balance
  async getUserPointsBalance(userAddress: string): Promise<number> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_ID}::loyalty_system::LoyaltyAccount`,
        },
        options: {
          showContent: true,
        },
      });

      if (objects.data.length === 0) {
        return 0; // No loyalty account found
      }

      const loyaltyAccount = objects.data[0];
      if (loyaltyAccount.data?.content && 'fields' in loyaltyAccount.data.content) {
        const fields = loyaltyAccount.data.content.fields as any;
        return parseInt(fields.points_balance) || 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching user points balance:', error);
      return 0;
    }
  }

  // Check if user has a loyalty account
  async hasLoyaltyAccount(userAddress: string): Promise<boolean> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_ID}::loyalty_system::LoyaltyAccount`,
        },
      });

      return objects.data.length > 0;
    } catch (error) {
      console.error('Error checking loyalty account:', error);
      return false;
    }
  }

  // Check if user has merchant capabilities
  async hasMerchantCap(userAddress: string): Promise<boolean> {
    try {
      const objects = await this.client.getOwnedObjects({
        owner: userAddress,
        filter: {
          StructType: `${PACKAGE_ID}::loyalty_system::MerchantCap`,
        },
      });

      return objects.data.length > 0;
    } catch (error) {
      console.error('Error checking merchant cap:', error);
      return false;
    }
  }

  // Get registered merchants from the platform
  async getMerchants() {
    try {
      const platformObject = await this.client.getObject({
        id: PLATFORM_ID,
        options: {
          showContent: true,
        },
      });

      if (platformObject.data?.content && 'fields' in platformObject.data.content) {
        // Note: Merchants would need to be properly parsed from the platform object
        // const fields = platformObject.data.content.fields as any;
        return [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching merchants:', error);
      return [];
    }
  }

  // Get reward templates from the blockchain
  async getRewardTemplates() {
    try {
      // Query recent transactions to find RewardTemplate creation events
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          MoveFunction: {
            package: PACKAGE_ID,
            module: 'loyalty_system',
            function: 'create_reward_template',
          },
        },
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
        limit: 50,
      });

      const rewards = [];
      
      for (const tx of transactions.data) {
        if (tx.objectChanges) {
          for (const change of tx.objectChanges) {
            if (change.type === 'created' && 
                change.objectType?.includes('RewardTemplate')) {
              try {
                // Get the reward template object details
                const rewardObj = await this.client.getObject({
                  id: change.objectId,
                  options: {
                    showContent: true,
                  },
                });

                if (rewardObj.data?.content && 'fields' in rewardObj.data.content) {
                  const fields = rewardObj.data.content.fields as any;
                  rewards.push({
                    id: change.objectId,
                    name: fields.name ? new TextDecoder().decode(new Uint8Array(fields.name)) : 'Unknown Reward',
                    description: fields.description ? new TextDecoder().decode(new Uint8Array(fields.description)) : 'No description',
                    pointsCost: parseInt(fields.points_required) || 0,
                    imageUrl: fields.image_url ? new TextDecoder().decode(new Uint8Array(fields.image_url)) : '🎁',
                    availableSupply: parseInt(fields.available_supply) || 0,
                    totalSupply: parseInt(fields.total_supply) || 0,
                    isActive: fields.is_active !== false,
                  });
                }
              } catch (objError) {
                console.warn('Could not fetch reward template:', change.objectId, objError);
              }
            }
          }
        }
      }

      console.log('Loaded reward templates from transactions:', rewards);
      return rewards;
    } catch (error) {
      console.error('Error fetching reward templates:', error);
      // Fallback: return mock data to show UI works
      if (error.message?.includes('No transactions found')) {
        return [];
      }
      return [];
    }
  }

  // Get transaction history for a user
  async getUserTransactionHistory(userAddress: string) {
    try {
      const transactions = await this.client.queryTransactionBlocks({
        filter: {
          FromOrToAddress: {
            addr: userAddress,
          },
        },
        options: {
          showEffects: true,
          showInput: true,
          showEvents: true,
        },
        limit: 50,
      });

      // Filter for loyalty-related transactions
      const loyaltyTransactions = transactions.data.filter(tx => {
        // Check if transaction involves our package
        return JSON.stringify(tx).includes(PACKAGE_ID);
      });

      return loyaltyTransactions.map(tx => ({
        id: tx.digest,
        type: this.determineTransactionType(tx),
        timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
        digest: tx.digest,
      }));
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  private determineTransactionType(tx: any): 'earned' | 'redeemed' | 'other' {
    try {
      const txString = JSON.stringify(tx);
      
      // Check for specific function calls in the transaction
      if (txString.includes('issue_points')) {
        return 'earned';
      } else if (txString.includes('redeem_reward')) {
        return 'redeemed';
      }
      
      return 'other';
    } catch {
      return 'other';
    }
  }

  // Create a loyalty account transaction  
  createLoyaltyAccountTransaction(_userAddress: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::create_loyalty_account`,
      arguments: [
        tx.object('0x6'), // Clock shared object
      ],
    });

    return tx;
  }

  // Register as merchant transaction
  registerMerchantTransaction(name: string, description: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::register_merchant`,
      arguments: [
        tx.object(PLATFORM_ID),           // platform
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(name)))),        // name as vector<u8>
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(description)))), // description as vector<u8>
        tx.object('0x6'),                 // Clock shared object
      ],
    });

    return tx;
  }

  // Issue points transaction (for registered merchants with MerchantCap)
  async issuePointsTransaction(merchantCapId: string, loyaltyAccountId: string, amount: number): Promise<Transaction> {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::issue_points`,
      arguments: [
        tx.object(PLATFORM_ID),           // platform
        tx.object(merchantCapId),         // merchant_cap (from your wallet)
        tx.object(loyaltyAccountId),      // user's loyalty account (mutable)
        tx.pure(bcs.u64().serialize(amount)),  // amount
        tx.object('0x6'),                 // Clock shared object
      ],
    });

    return tx;
  }

  // Redeem reward transaction
  redeemRewardTransaction(loyaltyAccountId: string, rewardTemplateId: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::redeem_reward`,
      arguments: [
        tx.object(PLATFORM_ID),           // platform
        tx.object(loyaltyAccountId),      // account (mutable)
        tx.object(rewardTemplateId),      // reward_template (mutable)
        tx.object('0x6'),                 // Clock shared object
      ],
    });

    return tx;
  }

  // Create reward template transaction (for merchants with MerchantCap)
  createRewardTemplateTransaction(
    merchantCapId: string, 
    name: string, 
    description: string, 
    pointsCost: number, 
    imageUrl: string, 
    totalSupply: number
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::create_reward_template`,
      arguments: [
        tx.object(merchantCapId),         // merchant_cap
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(name)))),        // name as vector<u8>
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(description)))), // description as vector<u8>
        tx.pure(bcs.u64().serialize(pointsCost)), // points_cost
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(imageUrl)))),    // image_url as vector<u8>
        tx.pure(bcs.u64().serialize(totalSupply)), // total_supply
      ],
    });

    return tx;
  }
}

export const loyaltyService = new LoyaltyService();