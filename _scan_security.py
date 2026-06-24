import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find security button and panel
b = h.find('id="admin-tab-security"')
p = h.find('id="admin-security"')
print(f"security btn: {b}, panel: {p}")

# Show context around security button
if b > 0:
    print(f"=== Button context ===")
    print(h[b-50:b+100])
    
# Show context around security panel 
if p > 0:
    print(f"=== Panel start ===")
    print(h[p:p+300])

# Find the end of security panel div
if p > 0:
    d = 1
    j = p + len('id="admin-security"')
    while d > 0 and j < len(h):
        if h[j:j+4] == '<div': d += 1
        elif h[j:j+6] == '</div>': d -= 1
        j += 1
    print(f"=== Panel end at {j} ===")
    print(h[j-100:j+50])
