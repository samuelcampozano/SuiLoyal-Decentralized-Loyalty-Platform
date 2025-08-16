module loyalty::loyalty_system {
    use std::string::{String, utf8};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::dynamic_object_field as dof;
    use sui::clock::{Self, Clock};

    // ===== Error Codes =====
    const ENotMerchant: u64 = 1000;
    const EInsufficientPoints: u64 = 1001;
    const ERewardNotFound: u64 = 1002;
    const EInvalidAmount: u64 = 1003;
    const EMerchantAlreadyExists: u64 = 1004;
    const ENotAuthorized: u64 = 1005;
    const ERewardOutOfStock: u64 = 1006;

    // ===== Constants =====
    const POINTS_DECIMALS: u8 = 2;
    const DEFAULT_POINTS_RATE: u64 = 100; // 1 SUI = 100 points

    // ===== Core Structs =====
    
    /// Main loyalty platform registry - shared object
    struct LoyaltyPlatform has key {
        id: UID,
        merchants: Table<address, MerchantInfo>,
        total_points_issued: u64,
        total_points_redeemed: u64,
        platform_fee_balance: Balance<SUI>,
        admin: address,
    }

    /// Merchant information stored in platform
    struct MerchantInfo has store, copy, drop {
        name: String,
        description: String,
        wallet: address,
        total_points_issued: u64,
        total_points_redeemed: u64,
        is_active: bool,
        created_at: u64,
    }

    /// User loyalty account - owned object
    struct LoyaltyAccount has key, store {
        id: UID,
        owner: address,
        points_balance: u64,
        lifetime_earned: u64,
        lifetime_redeemed: u64,
        merchant_balances: Table<address, u64>,
        created_at: u64,
    }

    /// Merchant capability - required for merchant operations
    struct MerchantCap has key, store {
        id: UID,
        merchant_address: address,
        platform_id: ID,
    }

    /// Reward NFT that can be redeemed with points
    struct RewardNFT has key, store {
        id: UID,
        name: String,
        description: String,
        merchant: address,
        points_cost: u64,
        image_url: String,
        redeemed_by: address,
        redeemed_at: u64,
    }

    /// Reward template that merchants can create
    struct RewardTemplate has key, store {
        id: UID,
        merchant: address,
        name: String,
        description: String,
        points_cost: u64,
        image_url: String,
        total_supply: u64,
        remaining_supply: u64,
        is_active: bool,
    }

    // ===== Events =====
    
    struct MerchantRegistered has copy, drop {
        merchant: address,
        name: String,
        timestamp: u64,
    }

    struct PointsIssued has copy, drop {
        merchant: address,
        customer: address,
        amount: u64,
        timestamp: u64,
    }

    struct PointsRedeemed has copy, drop {
        customer: address,
        merchant: address,
        amount: u64,
        reward_id: ID,
        timestamp: u64,
    }

    struct RewardCreated has copy, drop {
        reward_id: ID,
        merchant: address,
        name: String,
        points_cost: u64,
    }

    struct RewardUpdated has copy, drop {
        reward_id: ID,
        merchant: address,
        updated_field: String,
    }

    struct RewardDeleted has copy, drop {
        reward_id: ID,
        merchant: address,
    }

    // ===== Init Function =====
    
    fun init(ctx: &mut TxContext) {
        let platform = LoyaltyPlatform {
            id: object::new(ctx),
            merchants: table::new(ctx),
            total_points_issued: 0,
            total_points_redeemed: 0,
            platform_fee_balance: balance::zero(),
            admin: tx_context::sender(ctx),
        };
        
        transfer::share_object(platform);
    }

    // ===== Merchant Functions =====
    
    /// Register as a merchant on the platform
    public entry fun register_merchant(
        platform: &mut LoyaltyPlatform,
        name: vector<u8>,
        description: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(!table::contains(&platform.merchants, sender), EMerchantAlreadyExists);
        
        let merchant_info = MerchantInfo {
            name: utf8(name),
            description: utf8(description),
            wallet: sender,
            total_points_issued: 0,
            total_points_redeemed: 0,
            is_active: true,
            created_at: clock::timestamp_ms(clock),
        };
        
        table::add(&mut platform.merchants, sender, merchant_info);
        
        // Create and transfer merchant capability
        let merchant_cap = MerchantCap {
            id: object::new(ctx),
            merchant_address: sender,
            platform_id: object::id(platform),
        };
        
        transfer::transfer(merchant_cap, sender);
        
        event::emit(MerchantRegistered {
            merchant: sender,
            name: utf8(name),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Create or get user loyalty account
    public entry fun create_loyalty_account(
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let account = LoyaltyAccount {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            points_balance: 0,
            lifetime_earned: 0,
            lifetime_redeemed: 0,
            merchant_balances: table::new(ctx),
            created_at: clock::timestamp_ms(clock),
        };
        
        transfer::transfer(account, tx_context::sender(ctx));
    }

    /// Issue points to a customer (merchant only)
    public entry fun issue_points(
        platform: &mut LoyaltyPlatform,
        merchant_cap: &MerchantCap,
        account: &mut LoyaltyAccount,
        amount: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Verify merchant
        assert!(table::contains(&platform.merchants, merchant_cap.merchant_address), ENotMerchant);
        assert!(amount > 0, EInvalidAmount);
        
        // Update account balances
        account.points_balance = account.points_balance + amount;
        account.lifetime_earned = account.lifetime_earned + amount;
        
        // Update merchant-specific balance
        if (table::contains(&account.merchant_balances, merchant_cap.merchant_address)) {
            let merchant_balance = table::borrow_mut(&mut account.merchant_balances, merchant_cap.merchant_address);
            *merchant_balance = *merchant_balance + amount;
        } else {
            table::add(&mut account.merchant_balances, merchant_cap.merchant_address, amount);
        };
        
        // Update platform stats
        platform.total_points_issued = platform.total_points_issued + amount;
        
        // Update merchant stats
        let merchant_info = table::borrow_mut(&mut platform.merchants, merchant_cap.merchant_address);
        merchant_info.total_points_issued = merchant_info.total_points_issued + amount;
        
        event::emit(PointsIssued {
            merchant: merchant_cap.merchant_address,
            customer: account.owner,
            amount,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Issue points for a payment (automatic conversion)
    public entry fun issue_points_for_payment(
        platform: &mut LoyaltyPlatform,
        merchant_cap: &MerchantCap,
        account: &mut LoyaltyAccount,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let payment_amount = coin::value(&payment);
        let points_to_issue = payment_amount * DEFAULT_POINTS_RATE / 1000000000; // Convert from MIST to SUI
        
        // Take platform fee (1%)
        let fee_amount = payment_amount / 100;
        let merchant_amount = payment_amount - fee_amount;
        
        // Add fee to platform balance
        let payment_balance = coin::into_balance(payment);
        let fee_balance = balance::split(&mut payment_balance, fee_amount);
        balance::join(&mut platform.platform_fee_balance, fee_balance);
        
        // Send remaining to merchant
        let merchant_coin = coin::from_balance(payment_balance, ctx);
        transfer::public_transfer(merchant_coin, merchant_cap.merchant_address);
        
        // Issue points
        issue_points(platform, merchant_cap, account, points_to_issue, clock, ctx);
    }

    // ===== Reward Functions =====
    
    /// Create a reward template (merchant only)
    public entry fun create_reward_template(
        merchant_cap: &MerchantCap,
        name: vector<u8>,
        description: vector<u8>,
        points_cost: u64,
        image_url: vector<u8>,
        total_supply: u64,
        ctx: &mut TxContext
    ) {
        let reward = RewardTemplate {
            id: object::new(ctx),
            merchant: merchant_cap.merchant_address,
            name: utf8(name),
            description: utf8(description),
            points_cost,
            image_url: utf8(image_url),
            total_supply,
            remaining_supply: total_supply,
            is_active: true,
        };
        
        let reward_id = object::id(&reward);
        
        event::emit(RewardCreated {
            reward_id,
            merchant: merchant_cap.merchant_address,
            name: utf8(name),
            points_cost,
        });
        
        transfer::share_object(reward);
    }

    /// Redeem points for a reward NFT
    public entry fun redeem_reward(
        platform: &mut LoyaltyPlatform,
        account: &mut LoyaltyAccount,
        reward_template: &mut RewardTemplate,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Verify conditions
        assert!(reward_template.is_active, ERewardNotFound);
        assert!(reward_template.remaining_supply > 0, ERewardOutOfStock);
        assert!(account.points_balance >= reward_template.points_cost, EInsufficientPoints);
        
        // Deduct points
        account.points_balance = account.points_balance - reward_template.points_cost;
        account.lifetime_redeemed = account.lifetime_redeemed + reward_template.points_cost;
        
        // Update platform stats
        platform.total_points_redeemed = platform.total_points_redeemed + reward_template.points_cost;
        
        // Update merchant stats
        if (table::contains(&platform.merchants, reward_template.merchant)) {
            let merchant_info = table::borrow_mut(&mut platform.merchants, reward_template.merchant);
            merchant_info.total_points_redeemed = merchant_info.total_points_redeemed + reward_template.points_cost;
        };
        
        // Decrease supply
        reward_template.remaining_supply = reward_template.remaining_supply - 1;
        
        // Mint reward NFT
        let reward_nft = RewardNFT {
            id: object::new(ctx),
            name: reward_template.name,
            description: reward_template.description,
            merchant: reward_template.merchant,
            points_cost: reward_template.points_cost,
            image_url: reward_template.image_url,
            redeemed_by: tx_context::sender(ctx),
            redeemed_at: clock::timestamp_ms(clock),
        };
        
        let reward_id = object::id(&reward_nft);
        
        event::emit(PointsRedeemed {
            customer: account.owner,
            merchant: reward_template.merchant,
            amount: reward_template.points_cost,
            reward_id,
            timestamp: clock::timestamp_ms(clock),
        });
        
        transfer::transfer(reward_nft, tx_context::sender(ctx));
    }

    /// Update reward template name (merchant only)
    public entry fun update_reward_name(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_name: vector<u8>,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        reward_template.name = utf8(new_name);
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"name"),
        });
    }

    /// Update reward template description (merchant only)
    public entry fun update_reward_description(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_description: vector<u8>,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        reward_template.description = utf8(new_description);
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"description"),
        });
    }

    /// Update reward template points cost (merchant only)
    public entry fun update_reward_cost(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_cost: u64,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        assert!(new_cost > 0, EInvalidAmount);
        reward_template.points_cost = new_cost;
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"points_cost"),
        });
    }

    /// Update reward template image URL (merchant only)
    public entry fun update_reward_image(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_image_url: vector<u8>,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        reward_template.image_url = utf8(new_image_url);
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"image_url"),
        });
    }

    /// Add supply to reward template (merchant only)
    public entry fun add_reward_supply(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        additional_supply: u64,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        assert!(additional_supply > 0, EInvalidAmount);
        
        reward_template.total_supply = reward_template.total_supply + additional_supply;
        reward_template.remaining_supply = reward_template.remaining_supply + additional_supply;
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"supply"),
        });
    }

    /// Set reward template supply to a specific amount (merchant only)
    public entry fun set_reward_supply(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_supply: u64,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        
        // Calculate the difference between current and new supply
        let current_remaining = reward_template.remaining_supply;
        let redeemed_count = reward_template.total_supply - current_remaining;
        
        // Set the new total supply and calculate remaining supply
        reward_template.total_supply = new_supply;
        
        // Ensure remaining supply is not negative (can't have less than already redeemed)
        if (new_supply >= redeemed_count) {
            reward_template.remaining_supply = new_supply - redeemed_count;
        } else {
            reward_template.remaining_supply = 0;
        };
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"supply_set"),
        });
    }

    /// Delete reward template (merchant only) - marks as inactive instead of destroying
    public entry fun delete_reward_template(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        reward_template.is_active = false;
        
        event::emit(RewardDeleted {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
        });
    }

    /// Transfer points between users
    public entry fun transfer_points(
        from_account: &mut LoyaltyAccount,
        to_account: &mut LoyaltyAccount,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(from_account.owner == tx_context::sender(ctx), ENotAuthorized);
        assert!(from_account.points_balance >= amount, EInsufficientPoints);
        assert!(amount > 0, EInvalidAmount);
        
        from_account.points_balance = from_account.points_balance - amount;
        to_account.points_balance = to_account.points_balance + amount;
        to_account.lifetime_earned = to_account.lifetime_earned + amount;
    }

    // ===== View Functions =====
    
    public fun get_account_balance(account: &LoyaltyAccount): u64 {
        account.points_balance
    }
    
    public fun get_merchant_info(platform: &LoyaltyPlatform, merchant: address): &MerchantInfo {
        table::borrow(&platform.merchants, merchant)
    }
    
    public fun get_platform_stats(platform: &LoyaltyPlatform): (u64, u64) {
        (platform.total_points_issued, platform.total_points_redeemed)
    }
    
    public fun get_reward_info(reward: &RewardTemplate): (String, u64, u64) {
        (reward.name, reward.points_cost, reward.remaining_supply)
    }

    // ===== Admin Functions =====
    
    /// Withdraw platform fees (admin only)
    public entry fun withdraw_platform_fees(
        platform: &mut LoyaltyPlatform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
        
        let withdrawn = coin::take(&mut platform.platform_fee_balance, amount, ctx);
        transfer::public_transfer(withdrawn, platform.admin);
    }

    /// Deactivate a merchant (admin only)
    public entry fun deactivate_merchant(
        platform: &mut LoyaltyPlatform,
        merchant: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
        assert!(table::contains(&platform.merchants, merchant), ENotMerchant);
        
        let merchant_info = table::borrow_mut(&mut platform.merchants, merchant);
        merchant_info.is_active = false;
    }

    // ===== Test Helper Functions =====
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}