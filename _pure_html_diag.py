import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Find the EXACT HTML structure of admin-view (ignoring JS string content)
# Split by <script> tags
parts = re.split(r'</?script[^>]*>', h, flags=re.IGNORECASE)

# Concatenate only HTML parts (odd indices in split)
html_only = parts[0]
for i, p in enumerate(parts):
    if i % 2 == 0:
        html_only += '\n' if not html_only.endswith('\n') else ''
        html_only += p

# Now count divs in pure HTML
o = 0; c = 0
for m in re.finditer(r'<div(?:\s|>)', html_only):
    o += 1
for m in re.finditer(r'</div', html_only):
    c += 1
print(f'Pure HTML div balance: {o} open, {c} close, net={o-c}')

# Find admin-view boundaries in pure HTML
av = html_only.find('id="admin-view"')
if av > 0:
    # Find the <div that has this id
    div_start = html_only.rfind('<div', 0, av)
    
    # Track depth from this div
    d = 1; i = div_start + 4; s = True
    admin_html = ''
    extra_at = None
    
    while i < len(html_only) and d > 0:
        if html_only[i:i+4] == '<div' and (html_only[i+4:i+5] in (' ', '>')):
            d += 1
        elif html_only[i:i+6] == '</div>':
            d -= 1
            if d == 0:
                admin_close = i + 6
                break
        i += 1
    
    admin_html = html_only[div_start:admin_close] if d == 0 else html_only[div_start:i]
    print(f'\nAdmin-view inner HTML: {len(admin_html)} bytes')
    
    # Check for admin-workflows INSIDE admin-view
    wf_inner = admin_html.find('id="admin-workflows"')
    print(f'admin-workflows inside admin-view: {wf_inner > 0}')
    
    # List all admin-panel IDs in order
    panels = re.findall(r'id="(admin-\w+)"', admin_html)
    print(f'Panels: {panels}')
    
    # Check for extra/unbalanced </div> inside admin-view
    # Count within admin-view
    inner_o = len(re.findall(r'<div(?:\s|>)', admin_html))
    inner_c = len(re.findall(r'</div', admin_html))
    print(f'Inner div balance: {inner_o} open, {inner_c} close, net={inner_o-inner_c}')

# Now look at switchAdminTab function
sw = h.find('function switchAdminTab')
if sw > 0:
    d = 0; s = False
    for i in range(sw, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            sw_body = h[sw:i+1]
            break
    print(f'\n=== switchAdminTab ===')
    print(sw_body[:500])
    
# Check selectLeadCompany 
slc = h.find('async function selectLeadCompany')
if slc > 0:
    d = 0; s = False
    for i in range(slc, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0:
            slc_body = h[slc:i+1]
            break
    # Find credit_code lines
    for line in slc_body.split('\n'):
        if 'credit' in line.lower() or 'LeadType' in line:
            print(f'  SLC: {line.strip()[:120]}')
