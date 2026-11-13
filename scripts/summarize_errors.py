#!/usr/bin/env python3
"""
TradeOps Safe Diagnostic Tool — Log Error Analysis & Summarization
"""
import sys
import json
import urllib.request

def summarize_errors(api_url: str):
    print(f"[*] Querying TradeOps centralized logs at: {api_url}")
    try:
        req = urllib.request.Request(f"{api_url}/api/logs/stats")
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            stats = json.loads(resp.read().decode("utf-8"))
            print("=" * 45)
            print(" TradeOps Error Frequency Analysis ")
            print("=" * 45)
            print(f"[*] Total Buffered Logs: {stats.get('total_logs', 0)}")
            print("[*] Log Counts by Severity:")
            for sev, cnt in stats.get("severities", {}).items():
                print(f"    - {sev:<10}: {cnt}")
            print("[*] Log Counts by Service:")
            for svc, cnt in stats.get("services", {}).items():
                print(f"    - {svc:<25}: {cnt}")

        # Fetch recent ERROR logs
        req_errors = urllib.request.Request(f"{api_url}/api/logs?severity=ERROR&limit=5")
        with urllib.request.urlopen(req_errors, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"\n[*] Recent ERROR Events ({len(data.get('logs', []))} shown):")
            for l in data.get("logs", []):
                print(f"    [{l.get('timestamp', '')[:19]}] [{l.get('service_name', '')}] {l.get('message', '')}")
        return 0
    except Exception as e:
        print(f"[-] Could not query log analytics API: {e}")
        return 1

if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    sys.exit(summarize_errors(base))

