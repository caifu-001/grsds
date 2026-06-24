with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

# Extract WORKFLOW_STEPS definition
import re
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
    wk = h[m.start():end_semi+1]
    print(f"WORKFLOW_STEPS: {len(wk)} chars")
    
    # Parse dicts manually
    pieces = re.split(r'\},\s*\{', wk[wk.index('[')+1:wk.rindex(']')])
    steps = []
    for p in pieces:
        p = p.strip('{} ')
        id_m = re.search(r'id:\s*(\d+)', p)
        name_m = re.search(r"name:\s*'([^']*)'", p)
        phase_m = re.search(r"phase:\s*'([^']*)'", p)
        judge_m = re.search(r'judge:\s*(true|false)', p)
        if id_m:
            steps.append({
                'id': int(id_m.group(1)),
                'name': name_m.group(1) if name_m else '?',
                'phase': phase_m.group(1) if phase_m else '?',
                'judge': judge_m.group(1) if judge_m else 'false'
            })
    
    for s in steps:
        print(f"  {s['id']:3d} | {s['judge']:5s} | {s['phase']:20s} | {s['name']}")
    print(f"\nTotal: {len(steps)} steps")

# Also find the workflow template / renderStepList / showWorkflow
print("\n=== renderStepList ===")
ms = re.findall(r'renderStepList|renderWorkflow|showWorkflow|currentWorkflowStep|WORKFLOW_TEMPLATE', h)
for m in set(ms):
    print(f"  {m}: {len(re.findall(m, h))} refs")
  
# Find where project.current_step or current_step is used 
print("\n=== current_step ===")
for m in re.finditer(r'current_?step|currentStep', h):
    ctx = h[max(0,m.start()-40):m.end()+40]
    print(f"  char {m.start()}: ...{ctx.strip()}...")

# Find existing template concept
print("\n=== template ===")
for m in re.finditer(r'template|模板', h):
    ctx = h[max(0,m.start()-30):m.end()+40]
    if 'workflow' in ctx.lower() or 'project' in ctx.lower() or '流程' in ctx:
        print(f"  char {m.start()}: ...{ctx.strip()}...")
