import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find the main loadClients or where allClients is populated
# Search for 'function loadClients' or 'allClients =' or 'allClients=data'
patterns = ['function loadClients', 'allClients =', 'allClients=', 'window.allClients']
for pat in patterns:
    idx = h.find(pat)
    if idx >= 0:
        print(f"\n=== Found '{pat}' at byte {idx} ===")
        # Show ±200 chars
        ctx = h[max(0,idx-50):idx+250]
        for line in ctx.split('\n'):
            line = line.strip()
            if line:
                print(f"  {line[:150]}")
