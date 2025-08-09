module loyalty::Reward {
    use std::string;

    struct Reward has drop, store, copy { description: string::String, points: u64 }

    public fun create(description: vector<u8>, points: u64): Reward {
        Reward { description: string::utf8(description), points }
    }
}
