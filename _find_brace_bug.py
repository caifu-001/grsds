import re
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# Remove all string literals and regex for accurate brace counting
# Simple approach: find AFTER-SALES section, count braces methodically
start = f.find('═══════════ AFTER-SALES')
end = f.find('═══════════ INVENTORY')
section = f[start:end]

# Count braces line by line, tracking depth
lines = section.splitlines()
depth = 0
for i, l in enumerate(lines):
    delta = l.count('{') - l.count('}')
    depth += delta

print(f'AFTER-SALES section: total depth = {depth}')
print(f'Raw opens={section.count("{")}, closes={section.count("}")}')

# Now check the full JS script 3
scripts = list(re.finditer(r'<script[^>]*>(.*?)</script>', f, re.DOTALL))
for idx, m in enumerate(scripts):
    content = m.group(1)
    # Count only outside string literals (simplistic)
    d = content.count('{') - content.count('}')
    if d != 0:
        print(f'\nScript {idx}: raw diff={d}, length={len(content)}')
        # Find the approximate location
        pos = m.start()
        lines_before = f[:pos].count('\n')
        print(f'Starts at line ~{lines_before+1}')
        
        # Split into function blocks and find imbalance
        funcs = re.split(r'(?=async function|function |var \w+=function)', content)
        depth = 0
        for fi, fc in enumerate(funcs):
            dd = fc.count('{') - fc.count('}')
            depth += dd
            if dd != 0 and len(fc) > 100:
                # Get first line as name
                fl = fc.strip().split('\n')[0][:80]
                print(f'  Function block {fi} (d={dd}): {fl}')
