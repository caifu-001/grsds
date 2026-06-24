import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# 1. Check if onLeadTypeChange() call is present at end of selectLeadCompany
i = h.find('function selectLeadCompany')
d = 0; s = False; j = i
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
fn = h[i:j+1]
if 'onLeadTypeChange()' in fn:
    print("onLeadTypeChange() IS called from selectLeadCompany")
else:
    print("onLeadTypeChange() NOT called from selectLeadCompany!")
    print("Last 200 chars:", repr(fn[-200:]))

# 2. Show openProjectFormFromLead full function
opf = h.find('function openProjectFormFromLead')
d = 0; s = False; j = opf
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
print("\n=== openProjectFormFromLead ===")
print(h[opf:j+1])

# 3. Check the contacts query that 400s
# The error mentions: contacts?select=name%2Ctitle%2Cphone%2Cemail&client_id=eq.xxx
# 'title' column may not exist in contacts table
# Find all contacts queries with 'title'
for m in re.finditer(r'contacts.*title', h):
    pos = m.start()
    print(f"\ncontacts+title at {pos}: {h[max(0,pos-20):pos+120]}")
