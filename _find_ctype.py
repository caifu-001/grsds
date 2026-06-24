import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find the lead form where lf-customer-type select is defined
i = h.find('id="lf-customer-type"')
print(f"lf-customer-type at: {i}")
print(h[max(0,i-300):i+500])
