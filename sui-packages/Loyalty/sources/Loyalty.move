module loyalty::loyalty_system {
    use std::string::{String, utf8};
    use std::option::{Self, Option};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::sui::SUI;
    use sui::object::{Self, ID, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
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
        // Analytics integration
        analytics_registry: Option<ID>,
        daily_transaction_count: u64,
        last_analytics_update: u64,
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
        // Analytics fields
        session_count: u64,
        last_activity: u64,
        favorite_merchant: address,
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
        // Enhanced analytics fields
        transaction_fee: u64,
        merchant_fee: u64,
        customer_tier: String,
        transaction_source: String,
    }

    struct PointsRedeemed has copy, drop {
        customer: address,
        merchant: address,
        amount: u64,
        reward_id: ID,
        reward_name: String,
        reward_template_id: ID,
        timestamp: u64,
        // Enhanced analytics fields
        customer_tier: String,
        session_duration: u64,
        is_repeat_customer: bool,
    }

    // ===== New Analytics Events =====

    struct UserAccountCreated has copy, drop {
        user: address,
        timestamp: u64,
        onboarding_source: String,
    }

    struct UserSessionStarted has copy, drop {
        user: address,
        session_id: u64,
        timestamp: u64,
        platform_source: String,
    }

    struct UserSessionEnded has copy, drop {
        user: address,
        session_id: u64,
        session_duration: u64,
        actions_performed: u64,
        timestamp: u64,
    }

    struct TransactionAnalytics has copy, drop {
        transaction_type: String,
        merchant: Option<address>,
        user: address,
        amount: u64,
        fee_collected: u64,
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
            analytics_registry: option::none(),
            daily_transaction_count: 0,
            last_analytics_update: 0,
        };
        
        transfer::share_object(platform);
    }

    // ===== Merchant Functions =====
    
    /// Register as a merchant on the platform
    public fun register_merchant(
        platform: &mut LoyaltyPlatform,
        name: vector<u8>,
        description: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ): MerchantCap {
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
        
        // transfer::transfer(merchant_cap, sender); // Removed direct transfer
        
        event::emit(MerchantRegistered {
            merchant: sender,
            name: utf8(name),
            timestamp: clock::timestamp_ms(clock),
        });

        merchant_cap // Return the MerchantCap
    }

    /// Create or get user loyalty account
    public fun create_loyalty_account(
        clock: &Clock,
        ctx: &mut TxContext
    ): LoyaltyAccount {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        let account = LoyaltyAccount {
            id: object::new(ctx),
            owner: sender,
            points_balance: 0,
            lifetime_earned: 0,
            lifetime_redeemed: 0,
            merchant_balances: table::new(ctx),
            created_at: timestamp,
            // Initialize analytics fields
            session_count: 0,
            last_activity: timestamp,
            favorite_merchant: @0x0,
        };
        
        // Emit enhanced analytics event
        event::emit(UserAccountCreated {
            user: sender,
            timestamp,
            onboarding_source: utf8(b"web_platform"),
        });
        
        // transfer::transfer(account, sender); // Removed direct transfer
        account // Return the LoyaltyAccount
    }

    /// Issue points to a customer (merchant only)
    public fun issue_points(
        platform: &mut LoyaltyPlatform,
        merchant_cap: &MerchantCap,
        account: &mut LoyaltyAccount,
        amount: u64,
        clock: &Clock,
        _ctx: &mut TxContext
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
        
        // Update account analytics
        account.session_count = account.session_count + 1;
        account.last_activity = clock::timestamp_ms(clock);
        account.favorite_merchant = merchant_cap.merchant_address;
        
        // Update platform analytics
        platform.daily_transaction_count = platform.daily_transaction_count + 1;
        
        // Calculate and collect fees for analytics
        let transaction_fee = amount / 1000; // 0.1% transaction fee
        let merchant_fee = amount / 200; // 0.5% merchant fee
        
        // Note: Fee collection would require proper Balance<SUI> operations
        // For now, track fees in events for analytics
        
        // Determine customer tier based on lifetime earned
        let customer_tier = if (account.lifetime_earned >= 10000) {
            utf8(b"platinum")
        } else if (account.lifetime_earned >= 5000) {
            utf8(b"gold")
        } else if (account.lifetime_earned >= 1000) {
            utf8(b"silver")
        } else {
            utf8(b"bronze")
        };

        event::emit(PointsIssued {
            merchant: merchant_cap.merchant_address,
            customer: account.owner,
            amount,
            timestamp: clock::timestamp_ms(clock),
            // Enhanced analytics fields
            transaction_fee,
            merchant_fee,
            customer_tier,
            transaction_source: utf8(b"merchant_issued"),
        });

        // Emit analytics event
        event::emit(TransactionAnalytics {
            transaction_type: utf8(b"points_issued"),
            merchant: option::some(merchant_cap.merchant_address),
            user: account.owner,
            amount,
            fee_collected: transaction_fee + merchant_fee,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Issue points for a payment (automatic conversion)
    public fun issue_points_for_payment(
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
        let _merchant_amount = payment_amount - fee_amount;
        
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
    public fun create_reward_template(
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
    public fun redeem_reward(
        platform: &mut LoyaltyPlatform,
        account: &mut LoyaltyAccount,
        reward_template: &mut RewardTemplate,
        clock: &Clock,
        ctx: &mut TxContext
    ): RewardNFT {
        // Verify conditions
        assert!(reward_template.is_active, ERewardNotFound);
        assert!(reward_template.remaining_supply > 0, ERewardOutOfStock);
        assert!(account.points_balance >= reward_template.points_cost, EInsufficientPoints);
        
        // Deduct points
        account.points_balance = account.points_balance - reward_template.points_cost;
        account.lifetime_redeemed = account.lifetime_redeemed + reward_template.points_cost;
        
        // Update platform stats
        platform.total_points_redeemed = platform.total_points_redeemed + reward_template.points_cost;
        platform.daily_transaction_count = platform.daily_transaction_count + 1;
        
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
        
        // Update user analytics for redemption
        account.session_count = account.session_count + 1;
        account.last_activity = clock::timestamp_ms(clock);
        let session_duration = 15; // Average session duration in minutes
        
        // Check if repeat customer for this merchant
        let is_repeat = if (table::contains(&account.merchant_balances, reward_template.merchant)) {
            *table::borrow(&account.merchant_balances, reward_template.merchant) > 0
        } else { false };
        
        // Determine customer tier
        let customer_tier = if (account.lifetime_earned >= 10000) {
            utf8(b"platinum")
        } else if (account.lifetime_earned >= 5000) {
            utf8(b"gold")
        } else if (account.lifetime_earned >= 1000) {
            utf8(b"silver")
        } else {
            utf8(b"bronze")
        };

        event::emit(PointsRedeemed {
            customer: account.owner,
            merchant: reward_template.merchant,
            amount: reward_template.points_cost,
            reward_id,
            reward_name: reward_template.name,
            reward_template_id: object::id(reward_template),
            timestamp: clock::timestamp_ms(clock),
            // Enhanced analytics fields
            customer_tier,
            session_duration,
            is_repeat_customer: is_repeat,
        });

        // Emit analytics event
        event::emit(TransactionAnalytics {
            transaction_type: utf8(b"points_redeemed"),
            merchant: option::some(reward_template.merchant),
            user: account.owner,
            amount: reward_template.points_cost,
            fee_collected: 0, // No fees on redemptions
            timestamp: clock::timestamp_ms(clock),
        });
        
        // transfer::transfer(reward_nft, tx_context::sender(ctx)); // Removed direct transfer
        reward_nft // Return the RewardNFT
    }

    /// Update reward template name (merchant only)
    public fun update_reward_name(
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
    public fun update_reward_description(
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
    public fun update_reward_cost(
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
    public fun update_reward_image(
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
    public fun add_reward_supply(
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

    /// Set reward template remaining supply directly (merchant only)
    public fun set_reward_supply(
        merchant_cap: &MerchantCap,
        reward_template: &mut RewardTemplate,
        new_remaining_supply: u64,
    ) {
        assert!(reward_template.merchant == merchant_cap.merchant_address, ENotAuthorized);
        
        // Calculate how many items have been redeemed
        let current_remaining = reward_template.remaining_supply;
        let redeemed_count = reward_template.total_supply - current_remaining;
        
        // Set the remaining supply directly to what the user specified
        reward_template.remaining_supply = new_remaining_supply;
        
        // Update total supply to reflect the new remaining + already redeemed
        reward_template.total_supply = new_remaining_supply + redeemed_count;
        
        event::emit(RewardUpdated {
            reward_id: object::id(reward_template),
            merchant: merchant_cap.merchant_address,
            updated_field: utf8(b"supply_set"),
        });
    }

    /// Delete reward template (merchant only) - marks as inactive instead of destroying
    public fun delete_reward_template(
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
    public fun transfer_points(
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

    // ===== Analytics Integration Functions =====
    
    /// Link analytics registry to platform (admin only)
    public fun link_analytics_registry(
        platform: &mut LoyaltyPlatform,
        registry_id: ID,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
        platform.analytics_registry = option::some(registry_id);
    }
    
    /// Start user session for analytics tracking
    public fun start_user_session(
        account: &mut LoyaltyAccount,
        session_id: u64,
        platform_source: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(account.owner == tx_context::sender(ctx), ENotAuthorized);
        let timestamp = clock::timestamp_ms(clock);
        
        account.session_count = account.session_count + 1;
        account.last_activity = timestamp;
        
        event::emit(UserSessionStarted {
            user: account.owner,
            session_id,
            timestamp,
            platform_source: utf8(platform_source),
        });
    }
    
    /// End user session for analytics tracking
    public fun end_user_session(
        account: &mut LoyaltyAccount,
        session_id: u64,
        session_duration: u64,
        actions_performed: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(account.owner == tx_context::sender(ctx), ENotAuthorized);
        let timestamp = clock::timestamp_ms(clock);
        
        account.last_activity = timestamp;
        
        event::emit(UserSessionEnded {
            user: account.owner,
            session_id,
            session_duration,
            actions_performed,
            timestamp,
        });
    }

    // ===== Admin Functions =====
    
    /// Withdraw platform fees (admin only)
    public fun withdraw_platform_fees(
        platform: &mut LoyaltyPlatform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, ENotAuthorized);
        
        let withdrawn = coin::take(&mut platform.platform_fee_balance, amount, ctx);
        transfer::public_transfer(withdrawn, platform.admin);
    }

    /// Deactivate a merchant (admin only)
    public fun deactivate_merchant(
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