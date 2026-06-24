import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

i = h.find('id="admin-workflows"')
if i > 0:
    ctx = h[i-200:i+600]
    print(f"Found at {i}")
    print(ctx)
else:
    print("NOT FOUND")
