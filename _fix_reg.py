import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the exact three-screen block
reg_start = html.index('<div id="company-reg-screen"')
# Find where pending-screen ends (its own </div> is the last before <!-- Performance View -->)
perf_start = html.index('<!-- Performance View -->')
# Search backward from perf_start for the closing pattern
# pending-screen structure: <div id="pending-screen"> ... </div> </div>
# We need to find the </div> that closes pending-screen itself
pend_region = html[html.index('<!-- Pending Approval -->'):perf_start]
# Count <div> and </div> in this region to find where pending-screen really closes
depth = 0
pend_close = html.index('<!-- Pending Approval -->')
pos = pend_close
while pos < perf_start:
    next_open = html.find('<div', pos + 1)
    next_close = html.find('</div>', pos + 1)
    if next_close == -1: break
    if next_close >= perf_start: break
    if next_open != -1 and next_open < next_close:
        depth += 1
        pos = next_open
    else:
        if depth == 0:
            pend_close = next_close
        depth -= 1
        pos = next_close

# pending-screen closes at pend_close, but there's also its parent wrapper
# The pattern is: </div>\n </div>\n\n<!-- Performance View -->
# Find the full block end
block_end = html.index('</div>\n </div>\n\n<!-- Performance View -->') + 6 + 8  # length of </div>\n </div>
if block_end < perf_start:
    block_end = perf_start  # fallback

# Actually let me be more precise. Between the three screens and performance-view:
# Let me read the raw HTML around that area
around = html[110400:112000]
print(around[:500])
print('---')
print(around[-500:])
