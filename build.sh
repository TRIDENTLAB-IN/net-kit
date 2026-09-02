#!/usr/bin/env bash
#
# Build NetKit for production: frontend + Go binary.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="$ROOT/bin/netkit"

echo "==> Building frontend..."
(cd "$ROOT/frontend" && npm run build)

echo "==> Building Go binary..."
(cd "$ROOT" && go build -o "$BIN" .)

echo "==> Done. Run with: $BIN"
