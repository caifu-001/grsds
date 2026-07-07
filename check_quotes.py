import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

idx = c.find('function wfShowProps')
end = c.find('\nfunction wfSetApproval', idx)
section = c[idx:end]

# count onchange with escaped quotes (\\')
# in raw HTML source, the literal sequence is: onchange="wfSetProp(NUM,\'KEY\',this.value)"
count_esc = section.count("\\'")
print("Count of escaped quote in wfShowProps body:", count_esc)
print()

# Sample first onchange with wfSetProp
import re
# Look for onchange=\"...wfSetProp...\\'...\"
ms = re.findall(r'onchange="[^"]*wfSetProp[^"]*"', section)
print('Sample wfSetProp onchange strings:')
for m in ms[:5]:
    print(' ', m)
    print()
print('---')
ms2 = re.findall(r'onchange="[^"]*wfSetApproval[^"]*"', section)
print('Sample wfSetApproval onchange strings:')
for m in ms2[:5]:
    print(' ', m)
    print()
