import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# === Find and remove the extra </div> at byte ~100517 ===
# The admin-tabs div closes at 100516 (depth 1→0)
# Then there's an extra </div> at 100517 (depth 0→-1)
# Locate it precisely

at = h.find('class="admin-tabs"')
# Find the admin-tabs closing </div>
d = 0; s = False
for i in range(at, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0:
        admin_tabs_close = i + 6
        break

# Now find the NEXT </div> which is the orphan
next_close = h.find('</div>', admin_tabs_close)
# Show context
ctx_start = max(0, admin_tabs_close - 40)
ctx_end = next_close + 100
print("=== Context around orphan ===")
print(repr(h[ctx_start:ctx_end]))
print()

# Count: the extra </div> should be right after admin-tabs closes
gap = h[admin_tabs_close:next_close].strip()
print(f"Gap between admin-tabs close and next </div>: {repr(gap)}")

# Remove the orphan — including whitespace/newlines between them
# Find the </div> that's the orphan (the one right after admin-tabs close)
# Calculate exact range to remove
remove_start = admin_tabs_close
# Include whitespace between them
while remove_start < next_close and h[remove_start] in ' \t\r\n':
    remove_start += 1
remove_end = next_close + 6  # include the </div>
# Include trailing whitespace
while remove_end < len(h) and h[remove_end] in ' \t\r\n':
    remove_end += 1

print(f"Removing from byte {remove_start} to {remove_end}")
print(f"Content to remove: {repr(h[remove_start:remove_end])}")

h = h[:remove_start] + h[remove_end:]

# === Verify div balance ===
at = h.find('class="admin-tabs"')
mf = h.find('id="main-fab"')
section = h[at:mf]

opens = 0; closes = 0; neg = 0; depth = 0
for i in range(len(section)):
    if section[i:i+4].lower() == '<div' and section[i:i+5].lower() != '</div':
        depth += 1
        if depth > opens: opens = depth
    elif section[i:i+6].lower() == '</div>':
        depth -= 1
        if depth < neg: neg = depth

print(f"\nadmin-tabs→main-fab: opens={opens} closes(highest depth={opens}, lowest={neg})")
# Count total
total_open = 0; total_close = 0
for i in range(len(section)):
    if section[i:i+4].lower() == '<div' and section[i:i+5].lower() != '</div':
        total_open += 1
    elif section[i:i+6].lower() == '</div>':
        total_close += 1
print(f"Total: <div={total_open} </div>={total_close} net={total_open-total_close}")

if total_open == total_close:
    print("✅ DIV BALANCED")
    # Save
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h)
    print("Saved")
else:
    print("❌ STILL UNBALANCED")
