#!/usr/bin/env bash
# TradeOps Diagnostic Script — Linux Host Resource Inspection
set -eo pipefail

echo "==============================================="
echo " TradeOps Host Resource Diagnostic (Linux)    "
echo "==============================================="

echo "[*] Memory Usage:"
free -h || vmstat

echo -e "\n[*] Disk Space:"
df -h /

echo -e "\n[*] CPU Load Average:"
uptime

echo -e "\n[*] Top 5 CPU Consuming Processes:"
ps aux --sort=-%cpu | head -n 6

