module loyalty::MerchantRegistry {
    use sui::event;
    use std::string;

    struct Merchant has drop, store, copy { name: string::String }

    public fun register(name: vector<u8>) {
        let m = Merchant { name: string::utf8(name) };
        event::emit<Merchant>(m);
    }
}
