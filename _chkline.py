import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    lines = f.readlines()

# Show around line 10855
start = max(0, 10855 - 20)
end = min(len(lines), 10855 + 10)
for i in range(start, end):
    marker = '>>>' if i == 10854 else '   '
    print(f"{marker} {i+1}: {lines[i].rstrip()}")
