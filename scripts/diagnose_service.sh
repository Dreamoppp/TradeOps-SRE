#!/usr/bin/env bash
# TradeOps Diagnostic Script — Service Health Check
set -eo pipefail

TARGET_URL="${1:-http://127.0.0.1:8000/health}"
echo "[*] Checking service availability: $TARGET_URL"

START=$(date +%s%N)
HTTP_CODE=$(curl -s -o /tmp/tradeops_health.json -w "%{http_code}" --max-time 5 "$TARGET_URL" || echo "000")
END=$(date +%s%N)
ELAPSED_MS=$(( (END - START) / 1000000 ))

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "[+] Service is HEALTHY. Response code: $HTTP_CODE (${ELAPSED_MS}ms)"
  cat /tmp/tradeops_health.json
  exit 0
else
  echo "[-] Service UNHEALTHY. Response code: $HTTP_CODE (${ELAPSED_MS}ms)"
  exit 1
fi

