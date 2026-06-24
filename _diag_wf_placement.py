import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Split into HTML-only
parts = re.split(r'</?script[^>]*>', h, flags=re.IGNORECASE)
html_only = ''
for i, p in enumerate(parts):
    if i % 2 == 0:
        html_only += p

# Find admin-view div boundaries
av = html_only.find('id="admin-view"')
div_start = html_only.rfind('<div', 0, av)

# Track to close
d = 1; i = div_start + 4
while i < len(html_only) and d > 0:
    if html_only[i:i+4] == '<div' and (html_only[i+4:i+5] in (' ', '>')):
        d += 1
    elif html_only[i:i+6] == '</div>':
        d -= 1
        if d == 0:
            admin_close_in_html = i + 6
            break
    i += 1

# Show what's around admin-view close
ctx = html_only[max(0,admin_close_in_html-300):admin_close_in_html+200]
print("=== Admin-view close context ===")
for line in ctx.split('\n'):
    s = line.strip()
    if s: print(f'  {s[:140]}')

# Now find admin-workflows in HTML
wf = html_only.find('id="admin-workflows"')
print(f'\nadmin-workflows at HTML offset {wf}')
if wf > 0:
    print(f'Distance from admin-view close: {wf - admin_close_in_html}')
    ctx2 = html_only[max(0,wf-200):wf+300]
    print("\n=== admin-workflows context ===")
    for line in ctx2.split('\n'):
        s = line.strip()
        if s: print(f'  {s[:140]}')

# Find the matching div structure
# admin-workflows is at a depth of what?
# Count backwards
search_start = html_only.rfind('<div', 0, wf)
print(f'\nWF parent <div at {search_start}: ...{html_only[search_start:search_start+100]}...')
