import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    lines = f.readlines()

# Show around line 10855
start, end = max(0, 10850), min(len(lines), 10870)
for i in range(start, end):
    marker = '>>>' if i == 10854 else '   '
    txt = lines[i].rstrip()
    if 'renderWorkflowTemplates' in txt or 'async' in txt:
        marker = '***'
    print(f"{marker} {i+1}: {txt}")
