import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Show the exact area around admin-workflows
idx = h.find('id="admin-workflows"')
print(f"admin-workflows at {idx}")

# Show 500 chars before and 600 after
start = max(0, idx - 500)
end = min(len(h), idx + 600)
print(h[start:end])

print("\n\n=== Checking div structure ===")
# Count divs in this section
section = h[start:end]
opens = section.count('<div')
closes = section.count('</div>')
print(f"<div count: {opens}, </div> count: {closes}")
print(f"Net: {opens - closes}")
