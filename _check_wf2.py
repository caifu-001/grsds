import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# renderWorkflowTemplates full
rwt = h.find('function renderWorkflowTemplates')
d = 0; s = False; j = rwt
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
print("=== renderWorkflowTemplates ===")
print(h[rwt:j+1])

# loadTemplates
lt = h.find('function loadTemplates')
d = 0; s = False; j = lt
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
print("\n=== loadTemplates ===")
print(h[lt:j+1])
