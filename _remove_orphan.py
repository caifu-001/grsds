import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Extra </div> at byte 100517
# Context: </div> (closes admin-tabs) then \n\n then extra </div>
# Remove the extra </div> + surrounding whitespace
# Find the exact position
extra = 100517
# Verify it's actually a </div>
print(f"Extra div at {extra}: {repr(h[extra:extra+6])}")
print(f"  ±30: {repr(h[extra-30:extra+30])}")

# The correct admin-tabs closing </div> is at h.find('</div>', admin-tabs)
# The orphan is right after it with just a newline
# Let's just remove it precisely
# Pattern: </div>\n\n  </div>\n\n  <!-- User Management -->
# We want: </div>\n\n  <!-- User Management -->

# Find admin-tabs closing
at = h.find('class="admin-tabs"')
d = 0; s = False; close_at = at
for i in range(at, len(h)):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        d += 1; s = True
    elif h[i:i+6].lower() == '</div>':
        d -= 1
    if s and d == 0:
        close_at = i + 6
        break

print(f"\nAdmin-tabs closes at {close_at}: {repr(h[close_at-20:close_at+20])}")

# The orphan is the next </div> after close_at
next_dc = h.find('</div>', close_at)
print(f"Next </div> at {next_dc}: {repr(h[next_dc-20:next_dc+20])}")

# Remove from close_at whitespace through the orphan </div>
remove_start = close_at
# Include whitespace
while remove_start < next_dc and h[remove_start] in ' \t\r\n':
    remove_start += 1
remove_end = next_dc + 6
# Include trailing whitespace
while remove_end < len(h) and h[remove_end] in ' \t\r\n':
    remove_end += 1

print(f"Removing [{remove_start}:{remove_end}]: {repr(h[remove_start:remove_end])}")
h = h[:remove_start] + '\n\n' + h[remove_end:]

# Now check balance
at2 = h.find('class="admin-tabs"')
mf2 = h.find('id="main-fab"')
o = 0; c = 0
depth = 0; bad = None
for i in range(at2, mf2):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        depth += 1; o += 1
    elif h[i:i+6].lower() == '</div>':
        depth -= 1; c += 1
    if depth < 0 and bad is None: bad = i

print(f"\nAfter fix: <div={o} </div>={c} net={o-c}")
if bad:
    print(f"  First negative at {bad}: {repr(h[max(0,bad-30):bad+30])}")
else:
    print("  No negative depth")

if o == c:
    with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
        f.write(h)
    print("✅ Saved")
else:
    print("❌ Still unbalanced - check other orphans")
