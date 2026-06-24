import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    h = f.read()

# Find the orphan </div> at line 1384 (approx byte 106518)
# Context: ...</div>\n  </div>\n  <!-- Invite by email modal -->...
# We want: ...</div>\n  <!-- Invite by email modal -->...

# Find invite modal comment
invite_comment = h.find('<!-- Invite by email modal -->')
# Find the </div> right before it (with newlines)
before = h[:invite_comment]
last_div_close = before.rfind('</div>')
# Get the full section
chunk = h[last_div_close-50:invite_comment+30]
print("=== Context around invite modal ===")
for i, line in enumerate(chunk.split('\n')):
    print(f"  {repr(line)}")

# The orphan is the second </div> in the pattern:
#   </div></div>   <- first div closes invite-modal, no problem
#   </div>         <- ORPHAN: closes admin-employees prematurely
#
# So we need to remove line 1384: "  </div>"
print(f"\nInvite comment at byte {invite_comment}")
print(f"Last </div> before invite at byte {last_div_close}")

# Strategy: find "   </div></div>\n  </div>" and remove the second </div>
# The line with the orphan
start = h.find('  </div></div>')
if start > 0:
    # Find next newline  
    nl = h.index('\n', start + 14)
    orphan_start = nl + 1
    orphan_end = h.index('\n', orphan_start + 1)
    orphan_line = h[orphan_start:orphan_end]
    print(f"Orphan line: {repr(orphan_line)}")
    
    # Remove the orphan line + trailing whitespace
    cut_start = orphan_start
    while cut_start > 0 and h[cut_start - 1] in ' \t\r\n':
        cut_start -= 1
    cut_end = orphan_end
    while cut_end < len(h) and h[cut_end] in ' \t\r\n':
        cut_end += 1
    
    # Replace with a single newline
    h = h[:cut_start] + '\n' + h[cut_end:]
    print(f"Removed orphan: {repr(h[cut_start-5:cut_start+5])} → {repr(h[max(0,cut_start-5):cut_start+5])}")

# Now verify balance
av = h.find('id="admin-view"')
mf = h.find('id="main-fab"')
o = 0; c = 0; d = 0
for i in range(av, mf):
    if h[i:i+4].lower() == '<div' and h[i:i+5].lower() != '</div':
        d += 1; o += 1
    elif h[i:i+6].lower() == '</div>':
        d -= 1; c += 1
    if d < 0:
        print(f"\n❌ Still negative at byte {i}")

print(f"\nadmin-view → main-fab: <div={o} </div>={c} net={o-c} {'✅' if o==c else '❌'}")

if o == c:
    with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
        f.write(h)
    print("Saved")
