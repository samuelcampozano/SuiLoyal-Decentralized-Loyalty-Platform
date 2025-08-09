#!/usr/bin/env bash
set -euo pipefail

# Publishes the Move package to Sui Devnet.
# Requires Sui CLI logged in and pointing to devnet: `sui client switch --env devnet`
# Optionally, provide SUI_MNEMONIC via env and import before publishing.

PKG_DIR="$(cd "$(dirname "$0")/../sui-packages/Loyalty" && pwd)"
cd "$PKG_DIR"

echo "Building package..."
sui move build

echo "Publishing to devnet..."
sui client publish --gas-budget 100000000 || {
  echo "Publish failed. Ensure your wallet has devnet SUI and is configured."; exit 1;
}
