import re
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# Find actual lines with '' inside onclick in single-quoted strings
lines=f.splitlines()
for i,l in enumerate(lines):
    if "deleteEngagement(''" in l:
        print('L{}'.format(i+1))
    if "confirmDeleteTicket(''" in l and 'h+=' in l:
        print('L{}: ticket'.format(i+1))
    if "confirmDeleteVisit(''" in l and 'h+=' in l:
        print('L{}: visit'.format(i+1))
    if "confirmDeleteWarranty(''" in l and 'h+=' in l:
        print('L{}: warranty'.format(i+1))
