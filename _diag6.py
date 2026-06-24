import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find ALL occurrences of openProjectFormFromLead
for m in re.finditer(r'function openProjectFormFromLead[^I]', h):
    pos = m.start()
    d = 0; s = False; j = pos
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    print(f"\n=== openProjectFormFromLead at {pos} ({j-pos} chars) ===")
    print(h[pos:j+1])

# Find contacts queries with select
for m in re.finditer(r"contacts\?select=", h):
    pos = m.start()
    print(f"\ncontact query at {pos}: {h[pos:pos+150]}")

# Also check the contacts table columns from SQL files
for m in re.finditer(r'CREATE TABLE.*contacts', h):
    pos = m.start()
    print(f"\ncontacts CREATE at {pos}: {h[pos:pos+400]}")
