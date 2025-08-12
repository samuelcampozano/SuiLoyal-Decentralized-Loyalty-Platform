#[test_only]
module loyalty::loyalty_tests {
    use loyalty::loyalty_system::{Self, LoyaltyPlatform, LoyaltyAccount, MerchantCap, RewardTemplate};
    use sui::test_scenario::{Self, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self};
    use sui::sui::SUI;
    use std::string::{utf8};

    const ADMIN: address = @0xAD;
    const MERCHANT: address = @0xBEEF;
    const CUSTOMER: address = @0xCAFE;
    const CUSTOMER2: address = @0xFACE;

    fun setup_test(scenario: &mut Scenario) {
        // Initialize platform
        test_scenario::next_tx(scenario, ADMIN);
        {
            loyalty_system::init_for_testing(test_scenario::ctx(scenario));
            let clock = clock::create_for_testing(test_scenario::ctx(scenario));
            clock::share_for_testing(clock);
        };
    }

    #[test]
    fun test_merchant_registration() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Register merchant
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::register_merchant(
                &mut platform,
                b"Coffee Shop",
                b"Best coffee in town",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Verify merchant cap was received
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            assert!(test_scenario::has_most_recent_for_sender<MerchantCap>(&scenario), 0);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_loyalty_account() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Create customer account
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::create_loyalty_account(
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(clock);
        };

        // Verify account was created
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            assert!(test_scenario::has_most_recent_for_sender<LoyaltyAccount>(&scenario), 0);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            assert!(loyalty_system::get_account_balance(&account) == 0, 1);
            test_scenario::return_to_sender(&scenario, account);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_issue_points() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Register merchant
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::register_merchant(
                &mut platform,
                b"Test Merchant",
                b"Description",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Create customer account
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            loyalty_system::create_loyalty_account(&clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(clock);
        };

        // Issue points
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let merchant_cap = test_scenario::take_from_sender<MerchantCap>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, MERCHANT);
            loyalty_system::issue_points(
                &mut platform,
                &merchant_cap,
                &mut account,
                100,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(loyalty_system::get_account_balance(&account) == 100, 2);
            
            test_scenario::return_to_address(CUSTOMER, account);
            test_scenario::return_to_sender(&scenario, merchant_cap);
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_create_and_redeem_reward() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Setup merchant and customer
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::register_merchant(
                &mut platform,
                b"Reward Shop",
                b"Great rewards",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Create reward template
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let merchant_cap = test_scenario::take_from_sender<MerchantCap>(&scenario);
            
            loyalty_system::create_reward_template(
                &merchant_cap,
                b"Free Coffee",
                b"Redeem for a free coffee",
                50,
                b"https://example.com/coffee.png",
                10,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_sender(&scenario, merchant_cap);
        };

        // Create customer account and get points
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            loyalty_system::create_loyalty_account(&clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(clock);
        };

        // Issue points to customer
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let merchant_cap = test_scenario::take_from_sender<MerchantCap>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, MERCHANT);
            loyalty_system::issue_points(
                &mut platform,
                &merchant_cap,
                &mut account,
                100,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_address(CUSTOMER, account);
            test_scenario::return_to_sender(&scenario, merchant_cap);
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Redeem reward
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            let reward_template = test_scenario::take_shared<RewardTemplate>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::redeem_reward(
                &mut platform,
                &mut account,
                &mut reward_template,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            // Check points were deducted
            assert!(loyalty_system::get_account_balance(&account) == 50, 3);
            
            test_scenario::return_to_sender(&scenario, account);
            test_scenario::return_shared(platform);
            test_scenario::return_shared(reward_template);
            test_scenario::return_shared(clock);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_transfer_points() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Create accounts for both customers
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            loyalty_system::create_loyalty_account(&clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(clock);
        };

        test_scenario::next_tx(&mut scenario, CUSTOMER2);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            loyalty_system::create_loyalty_account(&clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(clock);
        };

        // Setup merchant and issue points to CUSTOMER
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::register_merchant(
                &mut platform,
                b"Test Shop",
                b"Description",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let merchant_cap = test_scenario::take_from_sender<MerchantCap>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, MERCHANT);
            loyalty_system::issue_points(
                &mut platform,
                &merchant_cap,
                &mut account,
                100,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_address(CUSTOMER, account);
            test_scenario::return_to_sender(&scenario, merchant_cap);
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Transfer points from CUSTOMER to CUSTOMER2
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let from_account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER2);
            let to_account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER);
            loyalty_system::transfer_points(
                &mut from_account,
                &mut to_account,
                30,
                test_scenario::ctx(&mut scenario)
            );
            
            assert!(loyalty_system::get_account_balance(&from_account) == 70, 4);
            assert!(loyalty_system::get_account_balance(&to_account) == 30, 5);
            
            test_scenario::return_to_address(CUSTOMER, from_account);
            test_scenario::return_to_address(CUSTOMER2, to_account);
        };

        test_scenario::end(scenario);
    }

    #[test]
    fun test_platform_stats() {
        let scenario = test_scenario::begin(ADMIN);
        setup_test(&mut scenario);

        // Register merchant and issue points
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            loyalty_system::register_merchant(
                &mut platform,
                b"Stats Shop",
                b"Testing stats",
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        // Create customer account
        test_scenario::next_tx(&mut scenario, CUSTOMER);
        {
            let clock = test_scenario::take_shared<Clock>(&scenario);
            loyalty_system::create_loyalty_account(&clock, test_scenario::ctx(&mut scenario));
            test_scenario::return_shared(clock);
        };

        // Issue points and check stats
        test_scenario::next_tx(&mut scenario, MERCHANT);
        {
            let platform = test_scenario::take_shared<LoyaltyPlatform>(&scenario);
            let merchant_cap = test_scenario::take_from_sender<MerchantCap>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            
            test_scenario::next_tx(&mut scenario, CUSTOMER);
            let account = test_scenario::take_from_sender<LoyaltyAccount>(&scenario);
            
            test_scenario::next_tx(&mut scenario, MERCHANT);
            loyalty_system::issue_points(
                &mut platform,
                &merchant_cap,
                &mut account,
                200,
                &clock,
                test_scenario::ctx(&mut scenario)
            );
            
            let (issued, redeemed) = loyalty_system::get_platform_stats(&platform);
            assert!(issued == 200, 6);
            assert!(redeemed == 0, 7);
            
            test_scenario::return_to_address(CUSTOMER, account);
            test_scenario::return_to_sender(&scenario, merchant_cap);
            test_scenario::return_shared(platform);
            test_scenario::return_shared(clock);
        };

        test_scenario::end(scenario);
    }
}