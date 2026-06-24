import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Line numbers around lf-customer-type
i = h.find('id="lf-customer-type"')
print(f"lf-customer-type at byte {i}")
# Show 200 bytes around it
print(h[i:i+200])
print("---")
# Also show selectLeadCompany credit_code line
j = h.find('function selectLeadCompany')
fn = h[j:j+2000]
for line in fn.split('\n'):
    if 'credit_code' in line or 'customer-type' in line:
        print(f"  >> {line.strip()}")
