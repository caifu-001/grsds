import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find selectLeadCompany - the credit_code fill logic
slc = h.find('function selectLeadCompany')
d = 0; s = False
for i in range(slc, len(h)):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: slc_end = i+1; break

fn_slc = h[slc:slc_end]
print("=== selectLeadCompany function ===")
print(fn_slc)

# Find the lead form credit_code field
print("\n=== Lead form credit code field ===")
lf = h.find('id="lf-credit-code"')
if lf > 0:
    ctx = h[max(0,lf-100):lf+200]
    for line in ctx.split('\n'):
        if 'credit' in line.lower() or '信用' in line:
            print(line.strip()[:180])

# Check if saveLead includes credit_code
print("\n=== saveLead credit_code in payload ===")
sv = h.find('function saveLead')
d = 0; s = False
for i in range(sv, len(h)):
    if h[i] == '{': d += 1; s = True
    elif h[i] == '}': d -= 1
    if s and d == 0: sv_end = i+1; break
fn_sv = h[sv:sv_end]
idx = fn_sv.find('credit_code')
while idx >= 0:
    line_start = fn_sv.rfind('\n', 0, idx) + 1
    line_end = fn_sv.find('\n', idx)
    print(fn_sv[line_start:line_end].strip()[:200])
    idx = fn_sv.find('credit_code', idx+1)
