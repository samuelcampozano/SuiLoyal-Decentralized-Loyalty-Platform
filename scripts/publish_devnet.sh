#!/usr/bin/env bash
set -euo pipefail

# Cross-platform wrapper that invokes the existing deploy.sh
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
exec "$SCRIPT_DIR/deploy.sh" "$@"
