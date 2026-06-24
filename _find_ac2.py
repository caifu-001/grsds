import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find all places where allClients is lazily loaded
idx = 0
found = 0
while True:
    idx = h.find('allClients', idx)
    if idx < 0: break
    # Show context ±80 chars
    ctx = h[max(0,idx-80):idx+80]
    if 'select' in ctx or 'from(' in ctx or '.eq' in ctx:
        found += 1
        print(f"\n=== allClients lazy load #{found} at byte {idx} ===")
        # Expand context to get the full select
        ctx2 = h[max(0,idx-300):idx+300]
        # Find the .select(... pattern
        sel = ctx2.find('.select(')
        if sel >= 0:
            end = ctx2.find(')', sel+8)
            print(f"  select: {ctx2[sel:end+1]}")
        else:
            # might be from()
            fr = ctx2.find('.from(')
            if fr >= 0:
                end = ctx2.find(')', fr+6)
                print(f"  from: {ctx2[fr:end+1]}")
    idx += 11
