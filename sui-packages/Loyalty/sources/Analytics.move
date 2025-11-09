/// Analytics module for comprehensive loyalty platform insights
/// Provides time-series data, user engagement tracking, and revenue analytics
module loyalty::analytics {
    use std::string::{String, utf8};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::vec_map::{Self, VecMap};
    use std::vector;

    // ===== Error Codes =====
    const ENotAuthorized: u64 = 2000;

    // ===== Core Analytics Structures =====

    /// Main analytics registry - shared object for all analytics data
    struct AnalyticsRegistry has key {
        id: UID,
        admin: address,
        daily_snapshots: Table<String, DailySnapshot>,
        merchant_analytics: Table<address, MerchantAnalytics>,
        user_engagement: Table<address, UserEngagement>,
        revenue_tracking: RevenueTracking,
        platform_metrics: PlatformMetrics,
        created_at: u64,
    }

    /// Daily platform snapshot for time-series analysis
    struct DailySnapshot has store, drop {
        date: String, // Format: YYYY-MM-DD
        total_transactions: u64,
        points_issued: u64,
        points_redeemed: u64,
        unique_active_users: u64,
        new_users_registered: u64,
        new_merchants_registered: u64,
        total_revenue: u64,
        merchant_count: u64,
        user_count: u64,
        timestamp: u64,
    }

    /// Merchant-specific analytics data
    struct MerchantAnalytics has store {
        merchant_address: address,
        merchant_name: String,
        total_customers_served: u64,
        lifetime_points_issued: u64,
        lifetime_points_redeemed: u64,
        revenue_generated: u64,
        active_rewards_count: u64,
        average_points_per_transaction: u64,
        customer_retention_rate: u64, // Percentage
        top_rewards: VecMap<String, RewardAnalytics>,
        daily_metrics: Table<String, MerchantDailyMetrics>,
        created_at: u64,
        last_updated: u64,
    }

    /// Individual reward performance analytics
    struct RewardAnalytics has store, copy, drop {}

    /// Daily metrics per merchant
    struct MerchantDailyMetrics has store {}

    /// User engagement tracking
    struct UserEngagement has store {
        user_address: address,
        first_transaction_date: String,
        last_transaction_date: String,
        total_sessions: u64,
        total_session_duration: u64, // In minutes
        lifetime_transactions: u64,
        favorite_merchants: VecMap<address, u64>, // merchant -> interaction count
        user_tier: String, // "bronze", "silver", "gold", "platinum"
        engagement_score: u64, // Calculated based on activity
        last_active: u64,
    }

    /// Platform revenue tracking
    struct RevenueTracking has store {
        total_merchant_fees: u64,
        total_transaction_fees: u64,
        total_premium_features: u64,
        daily_revenue: Table<String, DailyRevenue>,
        monthly_projections: Table<String, u64>, // month -> projected revenue
    }

    /// Daily revenue breakdown
    struct DailyRevenue has store, drop {
        date: String,
        merchant_fees: u64,
        transaction_fees: u64,
        premium_features: u64,
        total: u64,
    }

    /// Overall platform metrics
    struct PlatformMetrics has store {
        total_users: u64,
        total_merchants: u64,
        total_transactions: u64,
        total_rewards_created: u64,
        total_rewards_redeemed: u64,
        platform_growth_rate: u64, // Monthly percentage
        user_retention_rate: u64, // Monthly percentage  
        average_session_duration: u64, // Minutes
        top_performing_merchants: VecMap<address, u64>, // merchant -> performance score
    }

    // ===== Enhanced Analytics Events =====

    struct DailySnapshotCreated has copy, drop {
        date: String,
        total_transactions: u64,
        points_issued: u64,
        points_redeemed: u64,
        unique_users: u64,
        revenue: u64,
        timestamp: u64,
    }

    struct UserEngagementUpdated has copy, drop {
        user: address,
        engagement_score: u64,
        user_tier: String,
        total_sessions: u64,
        timestamp: u64,
    }

    struct MerchantPerformanceSnapshot has copy, drop {
        merchant: address,
        period: String,
        customers_served: u64,
        points_issued: u64,
        revenue: u64,
        growth_rate: u64,
        timestamp: u64,
    }

    struct RevenueAnalyticsUpdated has copy, drop {
        date: String,
        total_revenue: u64,
        merchant_fees: u64,
        transaction_fees: u64,
        premium_features: u64,
        timestamp: u64,
    }

    struct UserTierUpgrade has copy, drop {
        user: address,
        old_tier: String,
        new_tier: String,
        engagement_score: u64,
        timestamp: u64,
    }

    struct PlatformMilestone has copy, drop {
        milestone_type: String, // "users", "merchants", "transactions", "revenue"
        milestone_value: u64,
        current_value: u64,
        timestamp: u64,
    }

    // ===== Initialization =====

    /// Initialize analytics registry (called by platform admin)
    public fun initialize_analytics(clock: &Clock, ctx: &mut TxContext) {
        let registry = AnalyticsRegistry {
            id: object::new(ctx),
            admin: tx_context::sender(ctx),
            daily_snapshots: table::new(ctx),
            merchant_analytics: table::new(ctx),
            user_engagement: table::new(ctx),
            revenue_tracking: RevenueTracking {
                total_merchant_fees: 0,
                total_transaction_fees: 0,
                total_premium_features: 0,
                daily_revenue: table::new(ctx),
                monthly_projections: table::new(ctx),
            },
            platform_metrics: PlatformMetrics {
                total_users: 0,
                total_merchants: 0,
                total_transactions: 0,
                total_rewards_created: 0,
                total_rewards_redeemed: 0,
                platform_growth_rate: 0,
                user_retention_rate: 0,
                average_session_duration: 0,
                top_performing_merchants: vec_map::empty(),
            },
            created_at: clock::timestamp_ms(clock),
        };

        transfer::share_object(registry);
    }

    // ===== Analytics Tracking Functions =====

    /// Create or update daily snapshot
    public fun update_daily_snapshot(
        registry: &mut AnalyticsRegistry,
        date: vector<u8>,
        transactions_count: u64,
        points_issued: u64,
        points_redeemed: u64,
        unique_users: u64,
        new_users: u64,
        new_merchants: u64,
        revenue: u64,
        merchant_count: u64,
        user_count: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        
        let date_string = utf8(date);
        let snapshot = DailySnapshot {
            date: date_string,
            total_transactions: transactions_count,
            points_issued,
            points_redeemed,
            unique_active_users: unique_users,
            new_users_registered: new_users,
            new_merchants_registered: new_merchants,
            total_revenue: revenue,
            merchant_count,
            user_count,
            timestamp: clock::timestamp_ms(clock),
        };

        if (table::contains(&registry.daily_snapshots, date_string)) {
            let _old_snapshot = table::remove(&mut registry.daily_snapshots, date_string);
        };
        
        table::add(&mut registry.daily_snapshots, date_string, snapshot);

        event::emit(DailySnapshotCreated {
            date: date_string,
            total_transactions: transactions_count,
            points_issued,
            points_redeemed,
            unique_users,
            revenue,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Initialize or update merchant analytics
    public fun update_merchant_analytics(
        registry: &mut AnalyticsRegistry,
        merchant: address,
        merchant_name: vector<u8>,
        customers_served: u64,
        points_issued: u64,
        points_redeemed: u64,
        revenue: u64,
        active_rewards: u64,
        avg_points_per_tx: u64,
        retention_rate: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        
        let timestamp = clock::timestamp_ms(clock);
        
        if (table::contains(&registry.merchant_analytics, merchant)) {
            let analytics = table::borrow_mut(&mut registry.merchant_analytics, merchant);
            analytics.total_customers_served = customers_served;
            analytics.lifetime_points_issued = points_issued;
            analytics.lifetime_points_redeemed = points_redeemed;
            analytics.revenue_generated = revenue;
            analytics.active_rewards_count = active_rewards;
            analytics.average_points_per_transaction = avg_points_per_tx;
            analytics.customer_retention_rate = retention_rate;
            analytics.last_updated = timestamp;
        } else {
            let analytics = MerchantAnalytics {
                merchant_address: merchant,
                merchant_name: utf8(merchant_name),
                total_customers_served: customers_served,
                lifetime_points_issued: points_issued,
                lifetime_points_redeemed: points_redeemed,
                revenue_generated: revenue,
                active_rewards_count: active_rewards,
                average_points_per_transaction: avg_points_per_tx,
                customer_retention_rate: retention_rate,
                top_rewards: vec_map::empty(),
                daily_metrics: table::new(ctx),
                created_at: timestamp,
                last_updated: timestamp,
            };
            table::add(&mut registry.merchant_analytics, merchant, analytics);
        };

        event::emit(MerchantPerformanceSnapshot {
            merchant,
            period: utf8(b"current"),
            customers_served,
            points_issued,
            revenue,
            growth_rate: 0, // Calculate separately
            timestamp,
        });
    }

    /// Track user engagement metrics
    public fun update_user_engagement(
        registry: &mut AnalyticsRegistry,
        user: address,
        session_duration: u64,
        transactions_count: u64,
        favorite_merchant: address,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        
        let timestamp = clock::timestamp_ms(clock);
        let current_date = format_date(timestamp);
        
        if (table::contains(&registry.user_engagement, user)) {
            let engagement = table::borrow_mut(&mut registry.user_engagement, user);
            engagement.last_transaction_date = current_date;
            engagement.total_sessions = engagement.total_sessions + 1;
            engagement.total_session_duration = engagement.total_session_duration + session_duration;
            engagement.lifetime_transactions = engagement.lifetime_transactions + transactions_count;
            engagement.last_active = timestamp;
            
            // Update favorite merchant count
            if (vec_map::contains(&engagement.favorite_merchants, &favorite_merchant)) {
                let count = vec_map::get_mut(&mut engagement.favorite_merchants, &favorite_merchant);
                *count = *count + 1;
            } else {
                vec_map::insert(&mut engagement.favorite_merchants, favorite_merchant, 1);
            };
            
            // Recalculate engagement score and tier
            let new_score = calculate_engagement_score(engagement);
            engagement.engagement_score = new_score;
            
            let old_tier = engagement.user_tier;
            let new_tier = determine_user_tier(new_score);
            engagement.user_tier = new_tier;
            
            if (old_tier != new_tier) {
                event::emit(UserTierUpgrade {
                    user,
                    old_tier,
                    new_tier,
                    engagement_score: new_score,
                    timestamp,
                });
            };
            
        } else {
            let favorite_merchants = vec_map::empty();
            vec_map::insert(&mut favorite_merchants, favorite_merchant, 1);
            
            let engagement_score = calculate_initial_engagement_score(session_duration, transactions_count);
            let user_tier = determine_user_tier(engagement_score);
            
            let engagement = UserEngagement {
                user_address: user,
                first_transaction_date: current_date,
                last_transaction_date: current_date,
                total_sessions: 1,
                total_session_duration: session_duration,
                lifetime_transactions: transactions_count,
                favorite_merchants,
                user_tier,
                engagement_score,
                last_active: timestamp,
            };
            table::add(&mut registry.user_engagement, user, engagement);
        };

        let engagement = table::borrow(&registry.user_engagement, user);
        event::emit(UserEngagementUpdated {
            user,
            engagement_score: engagement.engagement_score,
            user_tier: engagement.user_tier,
            total_sessions: engagement.total_sessions,
            timestamp,
        });
    }

    /// Update revenue analytics
    public fun update_revenue_analytics(
        registry: &mut AnalyticsRegistry,
        date: vector<u8>,
        merchant_fees: u64,
        transaction_fees: u64,
        premium_fees: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        
        let date_string = utf8(date);
        let total = merchant_fees + transaction_fees + premium_fees;
        let timestamp = clock::timestamp_ms(clock);
        
        // Update daily revenue
        let daily_revenue = DailyRevenue {
            date: date_string,
            merchant_fees,
            transaction_fees,
            premium_features: premium_fees,
            total,
        };
        
        if (table::contains(&registry.revenue_tracking.daily_revenue, date_string)) {
            let _old_revenue = table::remove(&mut registry.revenue_tracking.daily_revenue, date_string);
        };
        table::add(&mut registry.revenue_tracking.daily_revenue, date_string, daily_revenue);
        
        // Update totals
        registry.revenue_tracking.total_merchant_fees = 
            registry.revenue_tracking.total_merchant_fees + merchant_fees;
        registry.revenue_tracking.total_transaction_fees = 
            registry.revenue_tracking.total_transaction_fees + transaction_fees;
        registry.revenue_tracking.total_premium_features = 
            registry.revenue_tracking.total_premium_features + premium_fees;

        event::emit(RevenueAnalyticsUpdated {
            date: date_string,
            total_revenue: total,
            merchant_fees,
            transaction_fees,
            premium_features: premium_fees,
            timestamp,
        });
    }

    /// Update platform-wide metrics
    public fun update_platform_metrics(
        registry: &mut AnalyticsRegistry,
        users: u64,
        merchants: u64,
        transactions: u64,
        rewards_created: u64,
        rewards_redeemed: u64,
        growth_rate: u64,
        retention_rate: u64,
        avg_session: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == registry.admin, ENotAuthorized);
        
        let old_users = registry.platform_metrics.total_users;
        let old_merchants = registry.platform_metrics.total_merchants;
        
        registry.platform_metrics.total_users = users;
        registry.platform_metrics.total_merchants = merchants;
        registry.platform_metrics.total_transactions = transactions;
        registry.platform_metrics.total_rewards_created = rewards_created;
        registry.platform_metrics.total_rewards_redeemed = rewards_redeemed;
        registry.platform_metrics.platform_growth_rate = growth_rate;
        registry.platform_metrics.user_retention_rate = retention_rate;
        registry.platform_metrics.average_session_duration = avg_session;

        // Check for milestones
        check_and_emit_milestones(old_users, users, utf8(b"users"), clock);
        check_and_emit_milestones(old_merchants, merchants, utf8(b"merchants"), clock);
    }

    // ===== Helper Functions =====

    fun calculate_engagement_score(engagement: &UserEngagement): u64 {
        let base_score = engagement.total_sessions * 10;
        let transaction_bonus = engagement.lifetime_transactions * 5;
        let recency_bonus = if (engagement.last_active > 0) { 50 } else { 0 };
        let merchant_diversity = vec_map::length(&engagement.favorite_merchants) * 15;
        
        base_score + transaction_bonus + recency_bonus + (merchant_diversity as u64)
    }

    fun calculate_initial_engagement_score(session_duration: u64, transactions: u64): u64 {
        let base_score = 10; // Base score for new user
        let duration_bonus = session_duration / 60; // 1 point per minute
        let transaction_bonus = transactions * 5;
        
        base_score + duration_bonus + transaction_bonus
    }

    fun determine_user_tier(engagement_score: u64): String {
        if (engagement_score >= 500) {
            utf8(b"platinum")
        } else if (engagement_score >= 300) {
            utf8(b"gold")
        } else if (engagement_score >= 150) {
            utf8(b"silver")
        } else {
            utf8(b"bronze")
        }
    }

    fun format_date(_timestamp_ms: u64): String {
        // Simplified date formatting - in production, use proper date library
        // For demo purposes, return a formatted string
        utf8(b"2024-01-01") // Placeholder - should implement proper date formatting
    }

    fun check_and_emit_milestones(old_value: u64, new_value: u64, milestone_type: String, clock: &Clock) {
        let milestones = vector[100, 500, 1000, 5000, 10000, 25000, 50000, 100000];
        let i = 0;
        let len = vector::length(&milestones);
        
        while (i < len) {
            let milestone = *vector::borrow(&milestones, i);
            if (old_value < milestone && new_value >= milestone) {
                event::emit(PlatformMilestone {
                    milestone_type,
                    milestone_value: milestone,
                    current_value: new_value,
                    timestamp: clock::timestamp_ms(clock),
                });
            };
            i = i + 1;
        };
    }

    // ===== View Functions =====

    public fun get_daily_snapshot(registry: &AnalyticsRegistry, date: String): &DailySnapshot {
        table::borrow(&registry.daily_snapshots, date)
    }

    public fun get_merchant_analytics(registry: &AnalyticsRegistry, merchant: address): &MerchantAnalytics {
        table::borrow(&registry.merchant_analytics, merchant)
    }

    public fun get_user_engagement(registry: &AnalyticsRegistry, user: address): &UserEngagement {
        table::borrow(&registry.user_engagement, user)
    }

    public fun get_platform_metrics(registry: &AnalyticsRegistry): &PlatformMetrics {
        &registry.platform_metrics
    }

    public fun get_revenue_tracking(registry: &AnalyticsRegistry): &RevenueTracking {
        &registry.revenue_tracking
    }

    // ===== Test Functions =====
    #[test_only]
    public fun init_analytics_for_testing(clock: &Clock, ctx: &mut TxContext) {
        initialize_analytics(clock, ctx);
    }
}