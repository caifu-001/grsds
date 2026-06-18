import sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
html=open(r'D:\1kaifa\grsds\index.html','rb').read().decode('utf-8')
lines=html.splitlines()
print('allDepts:', html.count('allDepts'))
print('allDepartments:', html.count('allDepartments'))
# Check toast-container
for i,l in enumerate(lines):
    if 'toast-container' in l:
        print('toast-container L'+str(i+1)+': '+l.strip()[:100])
        break
else:
    print('toast-container: MISSING')
# Check key functions
for fn in ['saveLead','createLead','submitLead','doDeleteOrder','loadOrders']:
    found=fn in html
    print(fn+': '+('FOUND' if found else 'MISSING'))
# Check lead form elements
for el in ['lead-form','lf-name','lf-contact-name']:
    found=el in html
    print('lead elem '+el+': '+('FOUND' if found else 'MISSING'))
