import re
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Find WORKFLOW_STEPS
m = re.search(r'var\s+WORKFLOW_STEPS\s*=\s*\[', h)
if m:
    depth = 1
    i = m.end()
    while i < len(h) and depth > 0:
        if h[i] == '[':
            depth += 1
        elif h[i] == ']':
            depth -= 1
        i += 1
    end_idx = h.index(';', i)
    wk = h[m.start():end_idx+1]
    print(f"WORKFLOW_STEPS: char {m.start()}-{end_idx+1}, length {len(wk)}")
    print()
    # Count steps
    steps = re.findall(r'\{id:\s*(\d+)', wk)
    print(f"Total steps: {len(steps)}")
    print(f"Step IDs: {steps}")
else:
    print("WORKFLOW_STEPS not found")
    # Search more broadly
    ms = list(re.finditer(r'WORKFLOW_STEPS', h))
    print(f"WORKFLOW_STEPS mentions: {len(ms)}")
    for m in ms:
        print(f"  char {m.start()}: ...{h[max(0,m.start()-20):m.start()+80]}...")

# Find workflow-related DOM / state
print("\n\n=== workflow references ===")
for m in re.finditer(r'current_?[Ww]orkflow', h):
    print(f"  char {m.start()}: ...{h[max(0,m.start()-30):m.end()+50]}...")

print("\n\n=== switchProjectTab workflow ===")
ms = list(re.finditer(r'workflow', h, re.IGNORECASE))
print(f"Total 'workflow' mentions: {len(ms)}")
