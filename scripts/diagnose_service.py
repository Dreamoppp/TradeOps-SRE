#!/usr/bin/env python3
"""
TradeOps Safe Diagnostic Tool — Service Health Check
Usage: python diagnose_service.py [http://127.0.0.1:8000/health]
"""
import sys
import time
import json
import urllib.request
import urllib.error

def diagnose_url(url: str):
    print(f"[*] Probing service health at: {url}")
    start = time.perf_counter()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TradeOps-Diagnostic-Agent/1.0"})
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
            body = resp.read().decode("utf-8")
            print(f"[+] Status Code: {resp.status} OK")
            print(f"[+] Latency: {elapsed_ms} ms")
            try:
                data = json.loads(body)
                print(f"[+] Payload: {json.dumps(data, indent=2)}")
            except Exception:
                print(f"[+] Raw Body: {body[:200]}")
            return 0
    except urllib.error.HTTPError as e:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        print(f"[-] HTTP Error: {e.code} {e.reason} ({elapsed_ms} ms)")
        return 1
    except urllib.error.URLError as e:
        elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
        print(f"[-] Connection Error: {e.reason} ({elapsed_ms} ms)")
        return 2

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/health"
    sys.exit(diagnose_url(target))

