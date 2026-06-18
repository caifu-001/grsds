import re

html = open(r'D:\1kaifa\grsds\index.html', 'rb').read().decode('utf-8')

# Find fmtNum usage lines
lines = html.splitlines()
for i, l in enumerate(lines):
    if 'fmtNum(' in l and 'function' not in l:
        print(f"L{i+1}: {l.strip()[:150]}")

# Check if there's any similar function
for fn in ['formatNumber', 'fmtMoney', 'fmtAmount', 'formatMoney']:
    if html.count(fn) > 0:
        print(f"\n{fn} found: {html.count(fn)} occurrences")

# Also check sales_targets references
print("\n=== sales_targets refs ===")
for i, l in enumerate(lines):
    if 'sales_targets' in l.lower():
        print(f"L{i+1}: {l.strip()[:150]}")
