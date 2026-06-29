import subprocess, re, os, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

os.chdir(r'D:\1kaifa\grsds')

result = subprocess.run(['git', 'show', 'd5a9684:index.html'], capture_output=True)
prev = result.stdout.decode('utf-8', errors='replace')

with open('index.html', 'r', encoding='utf-8') as f:
    cur = f.read()

# 1. Extract home-view block
home_start = prev.find('<div id="home-view">')
home_end = prev.find('<div id="client-view"', home_start)
home_block = prev[home_start:home_end]
print(f'home-view block: {len(home_block)} chars')

# 2. Extract tab-home button
tab_match = re.search(r'<button[^>]*id="tab-home"[^>]*>[^<]*</button>', prev)
tab_home = tab_match.group(0) if tab_match else ''
print(f'tab-home button: found={bool(tab_match)}')

# 3. Extract switchTab home branch from previous
st_idx = prev.find('function switchTab(')
body_start = prev.find('{', st_idx) + 1
d = 1; p = body_start
while d > 0 and p < len(prev):
    if prev[p] == '{': d += 1
    elif prev[p] == '}': d -= 1
    p += 1
sw_body_prev = prev[body_start:p]

home_br_start = sw_body_prev.find("if(tab==='home')")
tmp = sw_body_prev[home_br_start:]
cs = tmp.find('{')
dd = 1; ep = cs + 1
while dd > 0 and ep < len(tmp):
    if tmp[ep] == '{': dd += 1
    elif tmp[ep] == '}': dd -= 1
    ep += 1
after = tmp[ep:]
em = after.lstrip()
if em.startswith('else'):
    ep += len(after) - len(em) + 4
home_branch = tmp[:ep]
print(f'home branch: {len(home_branch)} chars')

# Now apply
# 4. Inject home-view HTML before client-view
client_idx = cur.find('<div id="client-view"')
assert client_idx >= 0
cur = cur[:client_idx] + home_block + '\n ' + cur[client_idx:]

# 5. Inject tab-home button before tab-clients
tc_idx = cur.find('id="tab-clients"')
btn_start = cur.rfind('<button', 0, tc_idx)
cur = cur[:btn_start] + tab_home + '\n   ' + cur[btn_start:]

# 6. Modify switchTab
st_idx = cur.find('function switchTab(')
body_start = cur.find('{', st_idx) + 1
d = 1; p = body_start
while d > 0 and p < len(cur):
    if cur[p] == '{': d += 1
    elif cur[p] == '}': d -= 1
    p += 1
sw_body = cur[body_start:p]

# Add hv to allViews
all_views = sw_body.find('var allViews=[')
all_views_end = sw_body.find(']', all_views) + 1
sw_body = sw_body[:all_views_end-1] + ',hv' + sw_body[all_views_end-1:]

# Add thm to allTabs
all_tabs = sw_body.find('var allTabs=[')
all_tabs_end = sw_body.find(']', all_tabs) + 1
sw_body = sw_body[:all_tabs_end-1] + ',thm' + sw_body[all_tabs_end-1:]

# Add var declarations
first_if = sw_body.find("if(tab==='")
var_decl = "var hv=document.getElementById('home-view');\n  var thm=document.getElementById('tab-home');\n  "
sw_body = sw_body[:first_if] + var_decl + sw_body[first_if:]

# Insert home branch before analytics
analytics_if = sw_body.find("if(tab==='analytics')")
sw_body = sw_body[:analytics_if] + home_branch + '\n  else\n  ' + sw_body[analytics_if:]

cur = cur[:body_start] + sw_body + cur[p:]

# Change default landing
cur = cur.replace("switchTab('analytics');", "switchTab('home');")

# Syntax check
try:
    # Extract JS block
    script_start = cur.find('<script>')
    script_end = cur.find('</script>', script_start)
    script = cur[script_start+8:script_end]
    compile(script, 'index.html', 'exec')
    print('JS Syntax: OK')
except SyntaxError as e:
    print(f'JS Syntax error: {e}')

d_open = len(re.findall(r'<div\b', cur))
d_close = len(re.findall(r'</div>', cur))
print(f'Div balance: {d_open} open / {d_close} close (diff={d_open - d_close})')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(cur)
print(f'Written {len(cur)} bytes')
