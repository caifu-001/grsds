import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# Fix tags formatting - use JSON.stringify instead of string concat
old = "tags:'{'+tags.map(function(t){return '\"'+t.replace(/\"/g,'\\\\\"')+'\"'}).join(',')+'}'"
new = "tags:JSON.stringify(tags)"
if old in f:
    f = f.replace(old, new)
    print('Tags fix applied')
else:
    # Try find the actual text
    idx = f.find("tags:'{'+")
    if idx > 0:
        print('Found at', idx, ':', repr(f[idx:idx+90]))
    else:
        print('tags pattern not found')

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as fh:
    fh.write(f)

# Verify
import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', f, re.DOTALL)
total = 0
for idx_s, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        print(f'Script {idx_s}: diff={d}')
        total += d
print(f'Brace diff: {total}')
print(f'Lines: {len(f.splitlines())}')
