import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Fix each of the 8 functions: prepend 'async ' if missing
fixes = [
    ('function setupCompanyAutocomplete(', 'async function setupCompanyAutocomplete('),
    ('function convertQuoteToOrder(', 'async function convertQuoteToOrder('),
    ('function confirmDeleteQuote(', 'async function confirmDeleteQuote('),
    ('function toggleContractArchive(', 'async function toggleContractArchive('),
    ('function confirmDeleteContract(', 'async function confirmDeleteContract('),
    ('function confirmDeletePayment(', 'async function confirmDeletePayment('),
    ('function renderClient360Overview(', 'async function renderClient360Overview('),
    ('function openProjectFormFromLead(', 'async function openProjectFormFromLead('),
]

# But be careful: only fix if NOT already 'async'
for old, new in fixes:
    # Find all occurrences and check if already preceded by 'async '
    pos = 0
    while True:
        idx = h.find(old, pos)
        if idx < 0:
            break
        # Check if 'async ' is already before it
        prefix = h[max(0, idx-10):idx]
        if 'async ' in prefix:
            print(f"SKIP {old[:40]}... (already async)")
        else:
            print(f"FIX {old[:40]}... -> async")
            h = h[:idx] + new + h[idx+len(old):]
        pos = idx + len(new)

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h)

print("Done, verifying...")

# Verify no more non-async await functions
func_pattern = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
issues = []
for m in func_pattern.finditer(h):
    name = m.group(2)
    is_async = m.group(1) is not None
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    body = h[m.start():j+1]
    if 'await ' in body and not is_async:
        line_num = h[:m.start()].count('\n') + 1
        issues.append(f"Line {line_num}: {name}")
if issues:
    print(f"\nREMAINING: {len(issues)}")
    for i in issues[:5]:
        print(f"  {i}")
else:
    print("\nAll async/await issues fixed!")
