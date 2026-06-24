import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find showWtModal function boundaries
i = h.find('function showWtModal')
j = i
d = 0
s = False
while j < len(h):
    if h[j] == '{':
        d += 1
        s = True
    elif h[j] == '}':
        d -= 1
    if s and d == 0:
        break
    j += 1

print(f"showWtModal: {i} to {j+1}, {j+1-i} chars")

# Find saveWt function boundaries
i2 = h.find('function saveWt(')
j2 = i2
d = 0
s = False
while j2 < len(h):
    if h[j2] == '{':
        d += 1
        s = True
    elif h[j2] == '}':
        d -= 1
    if s and d == 0:
        break
    j2 += 1

print(f"saveWt: {i2} to {j2+1}, {j2+1-i2} chars")

# Find deleteWt function boundaries
i3 = h.find('function deleteWt(')
j3 = i3
d = 0
s = False
while j3 < len(h):
    if h[j3] == '{':
        d += 1
        s = True
    elif h[j3] == '}':
        d -= 1
    if s and d == 0:
        break
    j3 += 1

print(f"deleteWt: {i3} to {j3+1}, {j3+1-i3} chars")

# Show the full showWtModal function
print("\n=== showWtModal ===")
print(h[i:j+1])

print("\n=== saveWt ===")
print(h[i2:j2+1])
