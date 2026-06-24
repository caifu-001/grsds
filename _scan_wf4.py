import re, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Find WORKFLOW_STEPS
m = re.search(r'var\s+WORKFLOW_STEPS\s*=\s*\[', h)
if m:
    start = m.start()
    depth = 1
    i = m.end()
    while i < len(h) and depth > 0:
        if h[i] == '[':
            depth += 1
        elif h[i] == ']':
            depth -= 1
        i += 1
    end_semi = h.index(';', i)
    
    # Extract just the array text
    arr_text = h[m.end():i]
    
    # Count top-level objects by {id: 
    ids = re.findall(r'\{[^}]*id:\s*(\d+)', arr_text)
    print(f"Steps found: {len(ids)}")
    for sid in ids:
        print(f"  id={sid}")
    
    # Check the structure
    print(f"\nFirst 500 chars of array:\n{arr_text[:500]}")
    print(f"\nLast 500 chars of array:\n{arr_text[-500:]}")
