import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

def extract_fn(name):
    idx = c.find(f"function {name}(")
    if idx < 0:
        print(f"MISSING: {name}")
        return ""
    depth = 0; started = False; end = idx
    for i in range(idx, min(idx + 15000, len(c))):
        ch = c[i]
        if ch == "\n": continue
        if ch == "{": depth += 1; started = True
        elif ch == "}": depth -= 1
        if started and depth == 0: end = i + 1; break
    return c[idx:end]

# switchAnalyticsTab
fn = extract_fn("switchAnalyticsTab")
print(f"=== switchAnalyticsTab ({len(fn)} chars) ===")
print(fn[:2000])
print("\n...truncated...\n")

# switchProjectTab
fn2 = extract_fn("switchProjectTab")
print(f"=== switchProjectTab ({len(fn2)} chars) ===")
# Find list handler
for kw in ["'list'", "'overview'", "'detail'"]:
    idx2 = fn2.find(kw)
    if idx2 > 0:
        print(f"  ...near '{kw}': {fn2[max(0,idx2-20):idx2+100]}...")
print()

# switchServiceTab
fn3 = extract_fn("switchServiceTab")
print(f"=== switchServiceTab ({len(fn3)} chars) ===")
print(fn3[:1000])

# switchCollabTab
fn4 = extract_fn("switchCollabTab")
print(f"\n=== switchCollabTab ({len(fn4)} chars) ===")
print(fn4[:1000])
