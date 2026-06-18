import re
from collections import Counter
content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()
ids = re.findall(r'id="([^"]+)"', content)
dups = {k: v for k, v in Counter(ids).items() if v > 1}
if dups:
    for k, v in dups.items():
        print(f'  DUPLICATE: {k} ({v}x)')
else:
    print('  No duplicate IDs')
