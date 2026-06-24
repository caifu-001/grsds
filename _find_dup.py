import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Count occurrences
print(f"renderWorkflowTemplates occurrences: {h.count('renderWorkflowTemplates')}")
print(f"async async occurrences: {h.count('async async')}")

# Find all positions
import re
for m in re.finditer('function renderWorkflowTemplates', h):
    pos = m.start()
    print(f"\nAt {pos}: {h[pos:pos+60]}")
    # Show context before
    print(f"  Before: {h[max(0,pos-30):pos]}")
