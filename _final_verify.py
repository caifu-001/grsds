import re,io,sys
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()
scripts=re.findall(r'<script[^>]*>(.*?)</script>', f, re.DOTALL)
total=sum(1 for s in scripts if s.count('{')!=s.count('}'))
print(f'JS scripts with brace imbalance: {total}')
print(f'Lines: {len(f.splitlines())}')

# Verify helper functions exist
for fn in ['confirmDeleteTicket','confirmDeleteVisit','confirmDeleteWarranty','confirmDeleteMaintenance','confirmDeleteKB']:
    print(f'  {fn}: {fn in f}')

# Check allDepts vs allDepartments
print(f'\nallDepts occurrences: {f.count("allDepts")}')
print(f'allDepartments occurrences: {f.count("allDepartments")}')

# Check for any remaining ''+ inside h+='  in after-sales
start=f.find('AFTER-SALES')
end=f.find('INVENTORY')
section=f[start:end]
broken=0
for line in section.splitlines():
    if "''+" in line and 'onclick' in line:
        broken+=1
        print(f'  BROKEN: {line.strip()[:120]}')
print(f'Remaining broken h+ quotes: {broken}')
