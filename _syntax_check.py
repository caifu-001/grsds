import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Extract all function declarations and check for 'async' without 'function'
# Also check for 'await' inside non-async functions
import re

# Find all function declarations
funcs = []
for m in re.finditer(r'(async\s+)?function\s+(\w+)', h):
    is_async = m.group(1) is not None
    name = m.group(2)
    funcs.append((m.start(), is_async, name))

# Find all await usage in non-async context
# First extract each function body
for idx, (pos, is_async, name) in enumerate(funcs):
    d = 0; s = False; j = pos
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    body = h[pos:j+1]
    if 'await ' in body and not is_async:
        print(f"ISSUE: {name}() has 'await' but is NOT async (at {pos})")

# Also find all standalone 'await' not inside async function
# Check for odd patterns
if 'function function' in h:
    print("ISSUE: double function keyword")

# Check line 10855 area again precisely
lines = h.split('\n')
lnum = 0
for i, line in enumerate(lines):
    if 'renderWorkflowTemplates' in line and 'function' in line:
        lnum = i + 1
        print(f"\nrenderWorkflowTemplates declaration at line {lnum}:")
        print(f"  {line.strip()}")

if not lnum:
    print("renderWorkflowTemplates NOT FOUND")

print("\n=== Other potential issues ===")
# Check for double 'async' preceded by whitespace
for m in re.finditer(r'\basync\s+async\b', h):
    print(f"  double async at {m.start()}: ...{h[m.start()-20:m.start()+30]}...")
