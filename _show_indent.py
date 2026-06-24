import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Show lines 1388-1408 with indentation markers
lines = h.split('\n')
for i in range(1385, 1410):
    stripped = lines[i].rstrip()
    indent = len(lines[i]) - len(lines[i].lstrip())
    print('%d (indent %d): %s' % (i+1, indent, stripped[:130]))
