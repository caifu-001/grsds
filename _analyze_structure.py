import sys
sys.stdout.reconfigure(encoding='utf-8')

# Read the CURRENT broken file
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# ================================================================
# FIX 1: Restore the lost </div> and remove the wrongly added </div>
# ================================================================
# The broken patch removed "</div>" that closes the data-security card div,
# and added a spurious "</div>" + empty line after admin-workflows

# Find the broken area
# Broken: lines around admin-workflows
wf_start = h.find('<!-- Workflow Templates -->')
# Find admin-workflows closing
d = 0; s = False; j = h.find('id="admin-workflows"')
while j < len(h):
    if h[j:j+4].lower() == '<div' and not h[j:j+5].lower() == '</div':
        d += 1; s = True
    elif h[j:j+6].lower() == '</div>':
        d -= 1
    if s and d == 0: break
    j += 1

wf_block = h[wf_start:j+6]
print(f"WF block: {len(wf_block)} chars from {wf_start} to {j+6}")

# Show area before wf_block
pre_wf = h[max(0, wf_start - 200):wf_start]
post_wf = h[j+6:j+6 + 200]

print(f"\n=== BEFORE wf_block ===")
print(repr(pre_wf[-100:]))

print(f"\n=== WF BLOCK ===")
print(repr(wf_block[:100]))

print(f"\n=== AFTER wf_block ===")
print(repr(post_wf[:80]))

# Check what the CORRECT structure should be
# The data-security panel has:
#   <div class="admin-panel">  ...  </div>   <- this is the data-security content
#   </div>                                    <- this closes the card wrapping
#
# admin-workflows should be INSIDE the card wrapping, after data-security's admin-panel div closes
# So the structure should be:
#   ...
#   </div>  <- closes admin-security content
#   <!-- Workflow Templates -->
#   <div id="admin-workflows" ...> ... </div>
#   </div>  <- closes the card outer wrapper
