#!/usr/bin/env bash
# TradeOps Diagnostic Script — Log Error Summary
set -eo pipefail

API_BASE="${1:-http://127.0.0.1:8000}"
echo "[*] Fetching error summary from TradeOps API at $API_BASE..."

curl -s "$API_BASE/api/logs/stats" | python3 -m json.tool || echo "[-] Log endpoint unavailable"

