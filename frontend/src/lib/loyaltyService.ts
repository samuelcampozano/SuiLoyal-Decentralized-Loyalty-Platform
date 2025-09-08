import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { PACKAGE_ID, PLATFORM_ID, SUI_CONFIG } from '../config';

export class LoyaltyService {
  public client: SuiClient;
  private rewardNameCache: Map<string, string> = new Map();
  private rewardCachePromises: Map<string, Promise<string>> = new Map();

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
        const fields = loyaltyAccount.data.content.fields as Record<string, unknown>;
        return parseInt(String(fields.points_balance)) || 0;
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
        // const fields = platformObject.data.content.fields as Record<string, unknown>;
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
                  const fields = rewardObj.data.content.fields as Record<string, unknown>;
                  console.log('Raw reward fields:', fields);
                  
                  const rewardName = String(fields.name || 'Unknown Reward');
                  
                  // Cache the reward name for future lookups
                  this.rewardNameCache.set(change.objectId, rewardName);
                  
                  rewards.push({
                    id: change.objectId,
                    merchantId: String(fields.merchant || 'unknown'),
                    name: rewardName,
                    description: String(fields.description || 'No description'),
                    pointsCost: parseInt(String(fields.points_cost)) || 0,
                    imageUrl: String(fields.image_url || '🎁'),
                    remaining: parseInt(String(fields.remaining_supply)) || 0,
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
      console.log('Cached reward names:', Array.from(this.rewardNameCache.entries()));
      return rewards;
    } catch (error) {
      console.error('Error fetching reward templates:', error);
      // Fallback: return mock data to show UI works
      if (error instanceof Error && error.message?.includes('No transactions found')) {
        return [];
      }
      return [];
    }
  }

  // Ensure reward cache is populated
  private async ensureRewardCachePopulated() {
    if (this.rewardNameCache.size === 0) {
      console.log('🔄 Populating reward cache...');
      await this.getRewardTemplates();
    }
  }

  // Get transaction history for a user
  async getUserTransactionHistory(userAddress: string) {
    console.log('🔍 Fetching transaction history for:', userAddress);
    console.log('📦 Looking for package ID:', PACKAGE_ID);
    
    // Ensure reward cache is populated for better reward name resolution
    await this.ensureRewardCachePopulated();
    
    try {
      // Query by package only (since FromOrToAddress is not supported)
      const packageTransactions = await this.client.queryTransactionBlocks({
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
        limit: 100,
        order: 'descending',
      });

      console.log('📦 Package transactions found:', packageTransactions.data.length);

      const uniqueTransactions = packageTransactions.data;

      console.log('🔗 Combined unique transactions:', uniqueTransactions.length);
      
      if (uniqueTransactions.length > 0) {
        console.log('🔍 Sample transaction structure:', JSON.stringify(uniqueTransactions[0], null, 2));
      }

      // Filter for transactions that involve the user
      const loyaltyTransactions = uniqueTransactions.filter(tx => {
        const txString = JSON.stringify(tx);
        
        // Check multiple ways the user could be involved
        const involvesUser = 
          txString.includes(userAddress) ||                    // Direct address match
          tx.transaction?.data?.sender === userAddress ||      // Transaction sender
          (tx.effects?.gasObject?.owner && 
           typeof tx.effects.gasObject.owner === 'object' && 
           'AddressOwner' in tx.effects.gasObject.owner &&
           tx.effects.gasObject.owner.AddressOwner === userAddress); // Gas payer
        
        if (involvesUser) {
          console.log('✅ Found user loyalty transaction:', tx.digest, {
            sender: tx.transaction?.data?.sender,
            gasOwner: tx.effects?.gasObject?.owner,
            timestamp: tx.timestampMs,
            functions: this.extractMoveCallFunctions(tx as unknown as Record<string, unknown>)
          });
        } else {
          console.log('❌ Transaction does not involve user:', tx.digest, {
            sender: tx.transaction?.data?.sender,
            userAddress,
            gasOwner: tx.effects?.gasObject?.owner
          });
        }
        
        return involvesUser;
      });

      console.log('🎯 Loyalty transactions found:', loyaltyTransactions.length);

      // Process transactions with async reward name extraction
      const mappedTransactions = await Promise.all(loyaltyTransactions.map(async (tx) => {
        const txType = this.determineTransactionType(tx as unknown as Record<string, unknown>);
        const amount = this.extractTransactionAmount(tx as unknown as Record<string, unknown>, txType);
        const rewardTemplateId = txType === 'redeemed' ? this.extractRewardTemplateId(tx as unknown as Record<string, unknown>) : undefined;
        const rewardName = txType === 'redeemed' ? await this.extractRewardName(tx as unknown as Record<string, unknown>) : undefined;
        
        console.log('🔄 Processing transaction:', {
          digest: tx.digest,
          type: txType,
          amount: amount,
          timestamp: tx.timestampMs,
          rewardTemplateId: rewardTemplateId,
          rewardName: rewardName
        });
        
        return {
          id: tx.digest,
          type: txType,
          amount: amount,
          timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
          digest: tx.digest,
          rewardTemplateId: rewardTemplateId,
          rewardName: rewardName,
        };
      }));

      // Sort transactions by timestamp (newest first)
      mappedTransactions.sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return timeB - timeA; // Descending order (newest first)
      });

      console.log('📋 Final mapped transactions (sorted):', mappedTransactions);
      console.log('📋 First 5 transactions:', mappedTransactions.slice(0, 5).map(t => ({ type: t.type, amount: t.amount, timestamp: t.timestamp })));
      
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

  private extractMoveCallFunctions(tx: Record<string, unknown>): string[] {
    const functions: string[] = [];
    try {
      const transaction = tx.transaction as any;
      if (transaction?.data?.transaction?.transactions) {
        for (const trans of transaction.data.transaction.transactions) {
          if (trans.MoveCall?.function) {
            functions.push(trans.MoveCall.function);
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting move call functions:', error);
    }
    return functions;
  }

  // Extract reward template ID from transaction (non-async, faster)
  private extractRewardTemplateId(tx: Record<string, unknown>): string | undefined {
    try {
      // Try to find the reward template ID from the transaction arguments
      const transaction = tx.transaction as any;
      if (transaction?.data?.transaction?.transactions) {
        for (const trans of transaction.data.transaction.transactions) {
          if (trans.MoveCall?.function === 'redeem_reward') {
            // Look for reward template object ID in arguments
            const args = trans.MoveCall.arguments;
            if (args && args.length >= 3) {
              // The third argument should be the reward template object
              const rewardTemplateArg = args[2];
              if (rewardTemplateArg?.Object) {
                return rewardTemplateArg.Object;
              }
            }
          }
        }
      }
      
      return undefined;
    } catch (error) {
      console.warn('Error extracting reward template ID:', error);
      return undefined;
    }
  }

  private async extractRewardName(tx: Record<string, unknown>): Promise<string> {
    try {
      // First try to get the reward template ID and use cache
      const rewardTemplateId = this.extractRewardTemplateId(tx);
      if (rewardTemplateId) {
        const cachedName = await this.getRewardNameFromCache(rewardTemplateId);
        if (cachedName !== 'Reward Item') {
          return cachedName;
        }
      }
      
      // Fallback to transaction events
      const events = tx.events as any[];
      if (events) {
        for (const event of events) {
          if (event.type?.includes('PointsRedeemed')) {
            // NEW: Extract reward name directly from the enhanced event
            if (event.parsedJson?.reward_name) {
              console.log('✅ Found reward_name in PointsRedeemed event:', event.parsedJson.reward_name);
              return String(event.parsedJson.reward_name);
            }
            // If event has reward template ID, use that
            if (event.parsedJson?.reward_template_id) {
              console.log('✅ Found reward_template_id in PointsRedeemed event:', event.parsedJson.reward_template_id);
              return await this.getRewardNameFromCache(event.parsedJson.reward_template_id);
            }
          }
        }
      }
      
      return 'Reward Item';
    } catch (error) {
      console.warn('Error extracting reward name:', error);
      return 'Reward Item';
    }
  }

  // Get reward name from cache or fetch it
  private async getRewardNameFromCache(objectId: string): Promise<string> {
    // Check if we already have it cached
    if (this.rewardNameCache.has(objectId)) {
      return this.rewardNameCache.get(objectId)!;
    }
    
    // Check if we're already fetching this reward
    if (this.rewardCachePromises.has(objectId)) {
      return this.rewardCachePromises.get(objectId)!;
    }
    
    // Create a promise to fetch the reward name
    const fetchPromise = this.fetchRewardName(objectId);
    this.rewardCachePromises.set(objectId, fetchPromise);
    
    try {
      const rewardName = await fetchPromise;
      this.rewardNameCache.set(objectId, rewardName);
      this.rewardCachePromises.delete(objectId);
      return rewardName;
    } catch (error) {
      this.rewardCachePromises.delete(objectId);
      console.warn('Failed to fetch reward name for', objectId, error);
      return 'Reward Item';
    }
  }
  
  // Fetch reward name from the blockchain
  private async fetchRewardName(objectId: string): Promise<string> {
    try {
      const rewardObject = await this.client.getObject({
        id: objectId,
        options: {
          showContent: true,
        },
      });
      
      if (rewardObject.data?.content && 'fields' in rewardObject.data.content) {
        const fields = rewardObject.data.content.fields as Record<string, unknown>;
        
        // Check if it's a RewardTemplate with a name field
        if (fields.name) {
          console.log('✅ Successfully fetched reward name:', fields.name, 'for ID:', objectId);
          return String(fields.name);
        }
      }
      
      return 'Reward Item';
    } catch (error) {
      console.warn('Error fetching reward object:', error);
      return 'Reward Item';
    }
  }

  private determineTransactionType(tx: Record<string, unknown>): 'earned' | 'redeemed' | 'other' {
    try {
      // First try to extract function names directly
      const functions = this.extractMoveCallFunctions(tx);
      
      for (const func of functions) {
        if (func === 'issue_points') {
          return 'earned';
        } else if (func === 'redeem_reward') {
          return 'redeemed';
        }
      }
      
      // Fallback to string search
      const txString = JSON.stringify(tx);
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

  // Extract transaction amount from transaction data
  private extractTransactionAmount(tx: Record<string, unknown>, type: 'earned' | 'redeemed' | 'other'): number {
    try {
      // Look for amount in transaction events first (most reliable)
      const events = tx.events as any[];
      if (events) {
        for (const event of events) {
          if (event.type?.includes('PointsIssued') && type === 'earned') {
            if (event.parsedJson?.amount) {
              return parseInt(event.parsedJson.amount);
            }
          } else if (event.type?.includes('PointsRedeemed') && type === 'redeemed') {
            if (event.parsedJson?.amount) {
              return -parseInt(event.parsedJson.amount);
            }
          }
        }
      }

      // Fallback: Look for amount in transaction input
      const transaction = tx.transaction as any;
      if (transaction?.data?.transaction?.transactions) {
        for (const trans of transaction.data.transaction.transactions) {
          if (trans.MoveCall?.function === 'issue_points' && type === 'earned') {
            // For issue_points, the amount is usually the 4th argument (after platform, merchant_cap, account)
            if (trans.MoveCall.arguments && trans.MoveCall.arguments.length >= 4) {
              const amountArg = trans.MoveCall.arguments[3];
              if (amountArg?.Input !== undefined && typeof amountArg.Input === 'number') {
                const value = transaction.data.transaction.inputs[amountArg.Input];
                if (value?.type === 'pure' && value.valueType === 'u64') {
                  const amount = parseInt(value.value);
                  if (amount > 0) {
                    return amount;
                  }
                }
              }
            }
          } else if (transaction.MoveCall?.function === 'redeem_reward' && type === 'redeemed') {
            // For redemptions, we need to get the cost from the reward template
            // This is more complex, so we'll rely on events or fallback
            continue;
          }
        }
      }
      
      // Final fallback based on transaction type
      return type === 'earned' ? 50 : type === 'redeemed' ? -100 : 0;
    } catch (error) {
      console.warn('Error extracting transaction amount:', error);
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

  // Update reward name transaction  
  updateRewardNameTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    name: string
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::update_reward_name`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(name)))),
      ],
    });

    return tx;
  }

  // Update reward description transaction
  updateRewardDescriptionTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    description: string
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::update_reward_description`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(description)))),
      ],
    });

    return tx;
  }

  // Update reward cost transaction
  updateRewardCostTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    pointsCost: number
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::update_reward_cost`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.u64().serialize(pointsCost)),
      ],
    });

    return tx;
  }

  // Update reward image transaction
  updateRewardImageTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    imageUrl: string
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::update_reward_image`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.vector(bcs.u8()).serialize(Array.from(new TextEncoder().encode(imageUrl)))),
      ],
    });

    return tx;
  }

  // Delete reward template transaction
  deleteRewardTemplateTransaction(
    merchantCapId: string,
    rewardTemplateId: string
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::delete_reward_template`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
      ],
    });

    return tx;
  }

  // Update reward supply transaction (add additional supply)
  updateRewardSupplyTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    additionalSupply: number
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::add_reward_supply`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.u64().serialize(additionalSupply)),
      ],
    });

    return tx;
  }

  // Set reward supply to a specific amount transaction
  setRewardSupplyTransaction(
    merchantCapId: string,
    rewardTemplateId: string,
    newSupply: number
  ): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::set_reward_supply`,
      arguments: [
        tx.object(merchantCapId),
        tx.object(rewardTemplateId),
        tx.pure(bcs.u64().serialize(newSupply)),
      ],
    });

    return tx;
  }

  // Get merchant's reward templates
  async getMerchantRewardTemplates(merchantAddress: string) {
    try {
      const allRewards = await this.getRewardTemplates();
      
      // Filter rewards for this specific merchant
      const merchantRewards = allRewards.filter(reward => {
        return reward.merchantId === merchantAddress;
      });
      
      console.log('Merchant rewards filtered:', merchantRewards);
      return merchantRewards;
    } catch (error) {
      console.error('Error fetching merchant reward templates:', error);
      return [];
    }
  }

  // Get SUI balance for a wallet address
  async getSuiBalance(address: string): Promise<number> {
    try {
      const balance = await this.client.getBalance({
        owner: address,
        coinType: '0x2::sui::SUI'
      });
      
      // Convert from MIST to SUI (1 SUI = 1,000,000,000 MIST)
      const suiBalance = Number(balance.totalBalance) / 1_000_000_000;
      return Math.round(suiBalance * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error fetching SUI balance:', error);
      return 0;
    }
  }
}

export const loyaltyService = new LoyaltyService();