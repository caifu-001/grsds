import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Extract full refreshScoutingCompare function
idx = c.find("function refreshScoutingCompare")
# Find the function end by tracking braces
depth = 0
started = False
end = idx
for i in range(idx, len(c)):
    ch = c[i]
    if ch == "\n":
        continue
    if ch == "{":
        depth += 1
        started = True
    elif ch == "}":
        depth -= 1
        if started and depth == 0:
            end = i + 1
            break

fn = c[idx:end]
print(f"Function length: {len(fn)} chars")

# Check key variables
checks = ["filtered", "allScouting", "cmpContainer", "containerHtml"]
for var in checks:
    count = fn.count(var)
    print(f"'{var}' mentions: {count}")

# Check if filtered is defined (var filtered = ...)
if "var filtered" in fn or "let filtered" in fn or "const filtered" in fn:
    print("OK: filtered is locally defined")
else:
    # Check if filtered comes from outer scope
    print("filtered NOT locally defined - must come from outer scope")
    # Find where filtered was originally defined
    prev = c[:idx]
    last_def = prev.rfind("filtered")
    if last_def > 0:
        ctx = c[last_def-50:last_def+50]
        print(f"Last mention before function: ...{ctx}...")

# Also check the renderScouting function for similar issues
rsc_idx = c.find("function renderScouting(")
if rsc_idx > 0:
    depth = 0
    started = False
    end2 = rsc_idx
    for i in range(rsc_idx, len(c)):
        ch = c[i]
        if ch == "\n":
            continue
        if ch == "{":
            depth += 1
            started = True
        elif ch == "}":
            depth -= 1
            if started and depth == 0:
                end2 = i + 1
                break
    rsc_fn = c[rsc_idx:end2]
    print(f"\nrenderScouting length: {len(rsc_fn)} chars")
    for var in ["filtered", "allScouting", "scoutingList"]:
        print(f"'{var}' mentions: {rsc_fn.count(var)}")
