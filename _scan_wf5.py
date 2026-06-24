import re, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Find WORKFLOW_STEPS
m = re.search(r'var\s+WORKFLOW_STEPS\s*=\s*\[', h)
if m:
    depth = 1
    i = m.end()
    while i < len(h) and depth > 0:
        if h[i] == '[':
            depth += 1
        elif h[i] == ']':
            depth -= 1
        i += 1
    end_semi = h.index(';', i)
    arr_text = h[m.end():i]
    
    # Count steps properly
    ids = re.findall(r'seq:\s*(\d+)', arr_text)
    names = re.findall(r"name:\s*'([^']*)'", arr_text)
    phases = re.findall(r"phase:\s*'([^']*)'", arr_text)
    decisions = re.findall(r'decision:\s*true', arr_text)
    
    print(f"Steps: {len(ids)}")
    for j, (sid, name, phase) in enumerate(zip(ids, names, phases)):
        d = "⍟" if f"seq:{sid}" in arr_text and f"'name':'{name}'" not in arr_text else ""
        dec = ""
        # check decision
        pat = f"seq:{sid},phase:'{phase}'"
        dec = "⚡" if re.search(re.escape(pat) + r".*?decision:\s*true", arr_text) else ""
        end = "⏹" if re.search(re.escape(pat) + r".*?end:\s*true", arr_text) else ""
        print(f"  {sid:3s} {dec}{end} | {phase:16s} | {name}")
    print(f"\nTotal: {len(ids)} steps, {len(decisions)} decision nodes")
    
    # Render step list function
    start = h.find('var WORKFLOW_STEPS')
    print(f"\nWORKFLOW_STEPS at char {start}")
    
    # Find renderWorkbench / renderStepList
    rwb = h.find('function renderWorkbench')
    print(f"renderWorkbench at char {rwb}")
    
    # Check projects table for workflow/template columns
    print("\nSearching for template concept...")
    for mm in re.finditer(r'(?i)template|workflow_?template|WORKFLOW_TEMPLATE', h):
        ctx = h[max(0,mm.start()-40):mm.end()+40]
        print(f"  char {mm.start()}: ...{ctx.replace(chr(10),' ')}...")
    
    # Check projects table structure
    print("\n=== projects table refs ===")
    for mm in re.finditer(r'workflow|current_step|total_steps', h):
        if mm.start() > start and mm.start() < start + 5000:
            pass  # skip the data definition
    for mm in re.finditer(r'from\(\'projects\'\)', h):
        ctx = h[mm.start():mm.start()+200]
        print(f"  ...{ctx[:200]}...")
        print()
