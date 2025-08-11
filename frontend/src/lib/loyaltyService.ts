import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, PLATFORM_ID, SUI_CONFIG } from '../config';

export class LoyaltyService {
  private client: SuiClient;

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
        return parseInt(loyaltyAccount.data.content.fields.points_balance as string) || 0;
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
        // Extract merchants from the platform object
        const merchants = platformObject.data.content.fields.merchants;
        // Note: This would need to be properly parsed based on the actual structure
        return [];
      }

      return [];
    } catch (error) {
      console.error('Error fetching merchants:', error);
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
        return tx.transaction?.data.transaction.inputs?.some(input => 
          JSON.stringify(input).includes(PACKAGE_ID)
        );
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
    // This would need to be implemented based on transaction analysis
    // For now, return a default type
    return 'other';
  }

  // Create a loyalty account transaction
  createLoyaltyAccountTransaction(userAddress: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::create_loyalty_account`,
      arguments: [
        tx.object(PLATFORM_ID),
      ],
    });

    return tx;
  }

  // Issue points transaction (for merchants)
  issuePointsTransaction(merchantAddress: string, userAddress: string, amount: number): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::issue_points`,
      arguments: [
        tx.object(PLATFORM_ID),
        tx.pure.address(userAddress),
        tx.pure.u64(amount),
      ],
    });

    return tx;
  }

  // Redeem reward transaction
  redeemRewardTransaction(userAddress: string, rewardId: string): Transaction {
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::loyalty_system::redeem_reward`,
      arguments: [
        tx.object(PLATFORM_ID),
        tx.pure.string(rewardId),
      ],
    });

    return tx;
  }
}

export const loyaltyService = new LoyaltyService();