import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find the end of switchAdminTab 
i = h.find('function switchAdminTab')
d = 0
s = False
j = i
while j < len(h):
    c = h[j]
    if c == '{':
        d += 1
        s = True
    elif c == '}':
        d -= 1
    if s and d == 0:
        break
    j += 1

end = j + 1
print(f"switchAdminTab ends at {end}")
# Show last 200 chars
print(h[end-200:end])
