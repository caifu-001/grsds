import re

html = open(r'D:\1kaifa\grsds\index.html', 'rb').read().decode('utf-8')

# Extract all script content
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
all_js = '\n'.join(scripts)

# Find all function declarations
funcs = re.findall(r'function\s+(\w+)\s*\(', all_js)
# Also find var funcName = function / let funcName = function / async function
funcs2 = re.findall(r'(?:var|let|const)\s+(\w+)\s*=\s*(?:async\s+)?function', all_js)
funcs3 = re.findall(r'async\s+function\s+(\w+)\s*\(', all_js)

all_funcs = set(funcs + funcs2 + funcs3)
print(f"Total unique functions: {len(all_funcs)}")

# The 8 dead functions from earlier summary: escHtml, showToast, ...
# Let's check each function usage count
for fn in ['escHtml', 'showToast', 'closeLeadForm', 'openLeadForm', 'renderLeadPool', 'renderFollowups', 'renderAdminPerms', 'openRoleEdit', 'h', 'fmtNum', 'fmtDate', 'confirmDialog']:
    decl = fn in all_js  # check if function is defined
    # Count references excluding the definition itself
    refs = len(re.findall(r'\b' + re.escape(fn) + r'\s*\(', all_js))
    # Count function definitions
    defs = len(re.findall(r'(?:async\s+)?function\s+' + re.escape(fn) + r'\s*\(', all_js))
    defs += len(re.findall(r'(?:var|let|const)\s+' + re.escape(fn) + r'\s*=\s*(?:async\s+)?function', all_js))
    usage = refs - defs
    status = "DEAD?" if usage == 0 else f"used {usage}x"
    print(f"  {fn}: {defs} defs, {refs} refs total => {status}")
