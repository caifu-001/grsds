with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Read initWorkflow area
idx = 686170
print("=== initWorkflow area ===")
print(h[idx:idx+300])
print()
print("=== WORKFLOW_STEPS raw ===")
# Find it
import re
m = re.search(r'var\s+WORKFLOW_STEPS\s*=\s*\[', h)
if m:
    # Print raw first 800 chars
    print(h[m.start():m.start()+800])
