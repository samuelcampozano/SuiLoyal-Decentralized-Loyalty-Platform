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
                  console.log('Raw reward fields:', fields);
                  
                  rewards.push({
                    id: change.objectId,
                    merchantId: fields.merchant || 'unknown',
                    name: fields.name || 'Unknown Reward',
                    description: fields.description || 'No description',
                    pointsCost: parseInt(fields.points_cost) || 0,
                    imageUrl: fields.image_url || '🎁',
                    remaining: parseInt(fields.remaining_supply) || 0,
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
    console.log('🔍 Fetching transaction history for:', userAddress);
    console.log('📦 Looking for package ID:', PACKAGE_ID);
    
    try {
      // Try both approaches: by address and by package
      const [addressTransactions, packageTransactions] = await Promise.all([
        // Query by user address
        this.client.queryTransactionBlocks({
          filter: {
            FromOrToAddress: {
              addr: userAddress,
            },
          },
          options: {
            showEffects: true,
            showInput: true,
            showEvents: true,
            showObjectChanges: true,
          },
          limit: 50,
          order: 'descending',
        }),
        // Query by package
        this.client.queryTransactionBlocks({
          filter: {
            MoveFunction: {
              package: PACKAGE_ID,
            },
          },
          options: {
            showEffects: true,
            showInput: true,
            showEvents: true,
            showObjectChanges: true,
          },
          limit: 50,
          order: 'descending',
        })
      ]);

      console.log('📊 Address transactions found:', addressTransactions.data.length);
      console.log('📦 Package transactions found:', packageTransactions.data.length);

      // Combine and deduplicate transactions
      const allTransactions = [...addressTransactions.data, ...packageTransactions.data];
      const uniqueTransactions = allTransactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.digest === tx.digest)
      );

      console.log('🔗 Combined unique transactions:', uniqueTransactions.length);
      
      if (uniqueTransactions.length > 0) {
        console.log('🔍 Sample transaction structure:', JSON.stringify(uniqueTransactions[0], null, 2));
      }

      // Filter for transactions that involve both the user and loyalty functions
      const loyaltyTransactions = uniqueTransactions.filter(tx => {
        const txString = JSON.stringify(tx);
        const hasPackageId = txString.includes(PACKAGE_ID);
        const hasLoyaltyFunction = txString.includes('loyalty_system');
        const involvesUser = txString.includes(userAddress);
        
        const isLoyaltyTx = (hasPackageId || hasLoyaltyFunction) && involvesUser;
        
        if (isLoyaltyTx) {
          console.log('✅ Found user loyalty transaction:', tx.digest, {
            hasPackageId,
            hasLoyaltyFunction,
            involvesUser,
            timestamp: tx.timestampMs
          });
        }
        
        return isLoyaltyTx;
      });

      console.log('🎯 Loyalty transactions found:', loyaltyTransactions.length);

      const mappedTransactions = loyaltyTransactions.map(tx => {
        const txType = this.determineTransactionType(tx);
        const amount = this.extractTransactionAmount(tx, txType);
        
        console.log('🔄 Processing transaction:', {
          digest: tx.digest,
          type: txType,
          amount: amount,
          timestamp: tx.timestampMs
        });
        
        return {
          id: tx.digest,
          type: txType,
          amount: amount,
          timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
          digest: tx.digest,
        };
      });

      console.log('📋 Final mapped transactions:', mappedTransactions);
      
      // If no transactions found, return a helpful message
      if (mappedTransactions.length === 0) {
        console.log('⚠️ No loyalty transactions found. This could mean:');
        console.log('1. Recent transactions haven\'t been indexed yet');
        console.log('2. Transactions were made on a different network');
        console.log('3. Transactions are still settling on the blockchain');
        console.log('4. No loyalty transactions have been made for this address');
      }
      
      return mappedTransactions;
    } catch (error) {
      console.error('❌ Error fetching transaction history:', error);
      return [];
    }
  }

  private determineTransactionType(tx: any): 'earned' | 'redeemed' | 'other' {
    try {
      const txString = JSON.stringify(tx);
      
      // Check for specific function calls in the transaction
      if (txString.includes('issue_points') || txString.includes('::loyalty_system::issue_points')) {
        return 'earned';
      } else if (txString.includes('redeem_reward') || txString.includes('::loyalty_system::redeem_reward')) {
        return 'redeemed';
      } else if (txString.includes('create_loyalty_account') || txString.includes('register_merchant') || txString.includes('create_reward_template')) {
        return 'other';
      }
      
      return 'other';
    } catch {
      return 'other';
    }
  }

  // Extract transaction amount from transaction data
  private extractTransactionAmount(tx: any, type: 'earned' | 'redeemed' | 'other'): number {
    try {
      // Look for amount in transaction input
      if (tx.transaction?.data?.transaction?.transactions) {
        for (const transaction of tx.transaction.data.transaction.transactions) {
          if (transaction.MoveCall?.arguments) {
            for (const arg of transaction.MoveCall.arguments) {
              if (arg.Input !== undefined && typeof arg.Input === 'number') {
                const value = tx.transaction.data.transaction.inputs[arg.Input];
                if (value?.type === 'pure' && value.valueType === 'u64') {
                  const amount = parseInt(value.value);
                  if (amount > 0 && amount < 10000) { // Reasonable points range
                    return type === 'redeemed' ? -amount : amount;
                  }
                }
              }
            }
          }
        }
      }
      
      // Fallback to estimated amounts
      return type === 'earned' ? 50 : type === 'redeemed' ? -100 : 0;
    } catch {
      return type === 'earned' ? 50 : type === 'redeemed' ? -100 : 0;
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