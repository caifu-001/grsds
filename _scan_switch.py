import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

i = h.find('function switchAdminTab')
j = i
d = 0
s = 0
while j < len(h):
    if h[j] == '{':
        d += 1
        s = 1
    elif h[j] == '}':
        d -= 1
    if s and d == 0:
        break
    j += 1

body = h[i:j+1]
print(f"switchAdminTab: {i} to {j} ({len(body)} chars)")
print("=== Last 300 chars ===")
print(body[-300:])
