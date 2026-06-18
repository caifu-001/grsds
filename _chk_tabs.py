html=open(r'D:\1kaifa\grsds\index.html',encoding='utf-8').read()
lines=html.splitlines()
for i, l in enumerate(lines):
    lo = l.strip()
    if 'inv-subtabs' in lo or 'inv-transfers' in lo or 'inv-ledger' in lo:
        print(f'L{i+1}: {lo[:150]}')
