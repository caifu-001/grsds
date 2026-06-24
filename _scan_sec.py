import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find end of admin-security div
i = h.find('id="admin-security"')
j = i
d = 0
s = False
while j < len(h):
    if h[j:j+4] == '<div':
        d += 1
        s = True
    elif h[j:j+6] == '</div>':
        d -= 1
    if s and d == 0:
        break
    j += 1

print(f"panel end: {j+6}")
after = h[j+6:j+206]
print("--- AFTER ---")
print(repr(after)[:300])
