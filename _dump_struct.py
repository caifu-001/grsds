import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Dump raw bytes around key positions
for label, pos in [("admin-security start", h.find('id="admin-security"')),
                    ("admin-security end", None)]:
    pass

# Find admin-security and count divs properly
sec = h.find('id="admin-security"')
print(f"admin-security starts at byte {sec}")

# Show what div it is
prev = h.rfind('<div', 0, sec)
print(f"  preceded by <div at {prev}: ...{h[prev:prev+60]}...")

# Now count from the div that opens admin-security
d = 0
sec_start_tag = h.rfind('<div', 0, sec + 20)
for i in range(sec_start_tag, len(h)):
    # <div (start tag, not </div)
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        d += 1
    elif h[i:i+6].lower() == '</div>':
        d -= 1
        if d == 0:
            print(f"admin-security closing </div> at byte {i}")
            print(f"  content before: ...{h[max(0,i-100):i]}...")
            print(f"  content after: ...{h[i:i+100]}...")
            break

# Now find admin-workflows and check if it's before or after
wf = h.find('id="admin-workflows"')
print(f"\nadmin-workflows starts at byte {wf}")
print(f"  {'INSIDE' if wf < i else 'OUTSIDE'} admin-security")

# Show full context from line 1535 to 1570
lines = h.split('\n')
for li in range(1534, min(len(lines), 1570)):
    marker = ''
    if 'admin-workflows' in lines[li]:
        marker = ' <-- WF'
    if 'admin-security' in lines[li]:
        marker = ' <-- SEC'
    if 'main-fab' in lines[li]:
        marker = ' <-- FAB'
    print(f"{'>>>' if marker else '   '} {li+1}: {lines[li].rstrip()}{marker}")
