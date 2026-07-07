import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c_or = c

# Check these patterns in raw text
checks = [
    ('oninput="onFWClientInput', '拜访input oninput'),
    ('onkeydown="onFWClientKey', '拜访input onkeydown'),
    ('fw-vm-client-list" class="name-suggestions hidden', '拜访list hidden class'),
    ('onblur="setTimeout', '拜访input onblur'),
]
all_ok = True
for pat, name in checks:
    if pat in c:
        print(f"OK: {name}")
    else:
        print(f"FAIL: {name}")
        all_ok = False

# Bracket check - count properly, BOM is already stripped by utf-8-sig
opens = c.count("{")
closes = c.count("}")
print(f"\nBraces: {{ {opens} / }} {closes}")
if opens != closes:
    diff = opens - closes
    print(f"MISMATCH: {diff}")
    # Find the area
    depth = 0
    lines = c.split("\n")
    for i, line in enumerate(lines):
        for ch in line:
            if ch == "{": depth += 1
            elif ch == "}": depth -= 1
        if depth < -10 or depth > 1000:
            print(f"  Extreme depth at line {i+1}: {depth}")
    
    if not all_ok:
        print("Some HTML checks failed too")

print("\nAll checks passed:", all_ok and opens == closes)
