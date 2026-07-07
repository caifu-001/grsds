import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# count usages
print('id="wf-props-panel":', len(re.findall(r'id="wf-props-panel"', c)))
print('class="wf-props-panel":', len(re.findall(r'class="wf-props-panel"', c)))
print("id='wf-props-panel':", len(re.findall(r"id='wf-props-panel'", c)))
print()

# show context
for kw in ['id="wf-props-panel"', 'class="wf-props-panel"']:
    print(f'=== {kw} context ===')
    for m in re.finditer(kw, c):
        pos = m.start()
        print(c[max(0, pos - 100):pos + 200].replace('\n', ' '))
        print()
