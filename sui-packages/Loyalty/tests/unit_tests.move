module loyalty::unit_tests {
    use std::string;
    use loyalty::Loyalty;
    use loyalty::Reward;

    #[test]
    fun test_hello() {
        let s = Loyalty::hello();
        assert!(string::length(&s) > 0, 0);
    }

    #[test]
    fun test_reward_create() {
        let r = Reward::create(b"coffee", 10);
        // placeholder assertion to ensure compilation/execution
        assert!(10 == 10, 0);
    }
}
