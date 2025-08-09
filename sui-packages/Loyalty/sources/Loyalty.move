module loyalty::Loyalty {
    use std::string;

    public fun hello(): string::String {
        string::utf8(b"hello loyalty")
    }
}
