import sys, re
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find all function declarations with their async status
issues = []

# Check for double async
for m in re.finditer(r'async\s+async', h):
    line_num = h[:m.start()].count('\n') + 1
    issues.append(f"Line {line_num}: double async")

# Check for 'function function'
if 'function function' in h:
    issues.append("double function keyword found")

# Check renderWorkflowTemplates specifically
for m in re.finditer(r'(async\s+)?function\s+renderWorkflowTemplates', h):
    is_async = 'async' in h[m.start():m.start()+30]
    line_num = h[:m.start()].count('\n') + 1
    print(f"renderWorkflowTemplates at line {line_num}: async={is_async}")
    print(f"  {h[m.start():m.start()+60]}")

# Check all functions with 'await' but not 'async'
func_pattern = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
for m in func_pattern.finditer(h):
    name = m.group(2)
    is_async = m.group(1) is not None
    # find body
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    body = h[m.start():j+1]
    await_count = body.count('await ')
    if await_count > 0 and not is_async:
        line_num = h[:m.start()].count('\n') + 1
        issues.append(f"Line {line_num}: {name}() has {await_count} await(s) but is NOT async")

# Check script block boundaries
script_starts = [m.end() for m in re.finditer(r'<script[^>]*>', h)]
script_ends = [m.start() for m in re.finditer(r'</script>', h)]
if len(script_starts) != len(script_ends):
    issues.append(f"Script tag mismatch: {len(script_starts)} open, {len(script_ends)} close")

# Check for stray + that could break parsing
# The historical issue at line 9175
stray_plus = 0
for m in re.finditer(r'\+\s*\n\s*<', h):
    line_num = h[:m.start()].count('\n') + 1
    stray_plus += 1
    if stray_plus <= 3:
        issues.append(f"Line {line_num}: possible stray + before HTML tag")

if issues:
    print(f"\n{len(issues)} issues found:")
    for i in issues:
        print(f"  - {i}")
else:
    print("No issues found!")
