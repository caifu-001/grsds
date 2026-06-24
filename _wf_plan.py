import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# 1. Find where global data is initialized (near start of main script)
# Look for loadData, initApp, or Supabase fetch calls
print("=== initApp / loadAll ===")
for kw in ['function initApp', 'function loadAll', 'loadClients()', 'loadCompanies()', 'allClients =', 'let allLeads']:
    idx = h.find(kw)
    if idx >= 0:
        print(f"  {kw} at char {idx}: ...{h[idx:idx+100].strip()[:100]}...")

# 2. Find saveProject to add template_id
print("\n=== saveProject ===")
idx = h.find('function saveProject')
if idx >= 0:
    snippet = h[idx:idx+1000]
    # Find the sb.from('projects') part
    upsert = h.find("from('projects')", idx)
    if upsert >= 0:
        print(f"  upsert at char {upsert}: ...{h[upsert:upsert+300].strip()[:300]}...")

# 3. Find project form open (template selector needed)
print("\n=== Project Form HTML ===")
idx = h.find('id="opp-form-modal"')
if idx >= 0:
    print(f"  modal at char {idx}")
    print(f"  snippet: ...{h[idx:idx+600]}...")

# 4. Find renderWorkbench  
print("\n=== renderWorkbench ===")
idx = h.find('function renderWorkbench')
if idx >= 0:
    # Find where it reads WORKFLOW_STEPS
    for m in re.finditer(r'WORKFLOW_STEPS', h[idx:idx+3000]):
        print(f"  WORKFLOW_STEPS ref at +{m.start()}")

# 5. Find initWorkflow
print("\n=== initWorkflow ===")
idx = h.find('function initWorkflow')
if idx >= 0:
    print(f"  at char {idx}")
    print(f"  {h[idx:idx+400]}")

# 6. Check for super admin tabs/UI
print("\n=== existing admin tabs ===")
idx = h.find('adm-tabs')
if idx >= 0:
    print(f"  at char {idx}")
    
# 7. Find where project creation happens
print("\n=== saveProject OR insert project ===")
for m in re.finditer(r"from\('projects'\)", h):
    ctx = h[max(0,m.start()-100):m.start()+200]
    if 'insert' in ctx.lower() or 'upsert' in ctx.lower():
        print(f"  char {m.start()}: ...{ctx.strip()[:200]}...")
