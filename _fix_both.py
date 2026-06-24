import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    h = f.read()

fixes = 0

# Fix 1: Remove orphan </div> after invite modal (line ~1395)
# Pattern: </div></div>\n  </div>\n\n  <!-- Free Agent Pool -->
# The "  </div>" after invite modal is an orphan that closes admin-view too early
old1 = '  </div></div>\n  </div>\n\n  <!-- Free Agent Pool -->'
new1 = '  </div></div>\n\n  <!-- Free Agent Pool -->'
if old1 in h:
    h = h.replace(old1, new1, 1)
    fixes += 1
    print("Fix 1: Removed orphan </div> after invite modal")
else:
    print("Fix 1: Pattern not found")
    # Try alternate
    idx = h.find('</div></div>')
    around = h[idx:idx+60].replace('\n', '\\n')
    print(f"  Around invite close: {repr(around)}")

# Fix 2: Remove orphan </div> after admin-security (line ~1543)
# admin-security closes, then empty line, then another </div>
# Look for: </div>\n\n<!-- Workflow Templates -->
# But there might be an extra </div> between them
idx2 = h.find('id="admin-security"')
# Find closing of admin-security
d = 0; s = False
for i in range(idx2, len(h)):
    t4 = h[i:i+4].lower(); t6 = h[i:i+6].lower()
    if t4 == '<div' and t6 != '</div': d += 1; s = True
    elif t6 == '</div>': d -= 1
    if s and d == 0:
        sec_close = i + 6
        break

wf_start = h.find('id="admin-workflows"')
between = h[sec_close:wf_start]
print(f"\nFix 2: Between admin-security close and admin-workflows:")
print(f"  {repr(between[:200])}")

# Count </div> in between
extra_divs = between.count('</div>')
if extra_divs > 0:
    # Remove the first </div> found
    first_div = between.find('</div>')
    if first_div >= 0:
        div_start = sec_close + first_div
        div_end = div_start + 6
        # Include surrounding whitespace
        while div_start > 0 and h[div_start - 1] in ' \t\r\n':
            div_start -= 1
        while div_end < len(h) and h[div_end] in ' \t\r\n':
            div_end += 1
        print(f"  Removing orphan at byte {div_start}-{div_end}")
        print(f"  Content: {repr(h[div_start:div_end])}")
        h = h[:div_start] + '\n' + h[div_end:]
        fixes += 1
else:
    print("  No extra </div> found")

# Verify
av = h.find('id="admin-view"')
mf = h.find('id="main-fab"')
o = 0; c = 0; d = 0
for i in range(av, mf):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        d += 1; o += 1
    elif h[i:i+6].lower() == '</div>':
        d -= 1; c += 1

print(f"\nFinal: <div={o} </div>={c} net={o-c} {'✅ BALANCED' if o==c else '❌'}")

if o == c:
    with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
        f.write(h)
    print(f"Saved ({fixes} fixes)")
