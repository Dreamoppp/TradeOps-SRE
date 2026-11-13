#!/usr/bin/env python3
"""
TradeOps Safe Diagnostic Tool — Host Resource Investigation
"""
import psutil

def check_resources():
    print("=" * 50)
    print(" TradeOps System Resource Investigation ")
    print("=" * 50)
    
    # CPU
    cpu_pct = psutil.cpu_percent(interval=1.0)
    cpu_count = psutil.cpu_count(logical=True)
    print(f"[*] CPU Utilization: {cpu_pct}% ({cpu_count} logical cores)")
    if cpu_pct > 85:
        print("[!] WARNING: CPU utilization exceeds 85% threshold")
        
    # Memory
    mem = psutil.virtual_memory()
    total_mb = round(mem.total / (1024 * 1024), 1)
    used_mb = round(mem.used / (1024 * 1024), 1)
    print(f"[*] Memory Utilization: {mem.percent}% ({used_mb}MB / {total_mb}MB)")
    if mem.percent > 90:
        print("[!] WARNING: Memory utilization exceeds 90% threshold")

    # Disk
    disk = psutil.disk_usage("/")
    disk_total_gb = round(disk.total / (1024 * 1024 * 1024), 1)
    disk_used_gb = round(disk.used / (1024 * 1024 * 1024), 1)
    print(f"[*] Disk Utilization: {disk.percent}% ({disk_used_gb}GB / {disk_total_gb}GB)")

    # Top processes by memory
    print("\n[*] Top 5 Processes by Memory Usage:")
    processes = []
    for p in psutil.process_iter(['pid', 'name', 'memory_percent', 'cpu_percent']):
        try:
            processes.append(p.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass
    
    top_procs = sorted(processes, key=lambda x: x.get('memory_percent') or 0, reverse=True)[:5]
    for p in top_procs:
        print(f"    PID {p['pid']:<6} | {p['name'][:20]:<20} | Mem: {p['memory_percent']:.1f}% | CPU: {p['cpu_percent']:.1f}%")

if __name__ == "__main__":
    check_resources()

