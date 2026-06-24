import sys
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Verify JS syntax
import re
script_start = h.find('<script>')
script_end = h.rfind('</script>')
if script_start >= 0 and script_end >= 0:
    # Find the tag close
    tg = h.find('>', script_start)
    js = h[tg+1:script_end]
    try:
        eval(f'async function _test() {{ 1 }}')  # warm up
        compile(js, 'index.html', 'exec')
        print('✅ JS syntax OK')
    except SyntaxError as e:
        print(f'❌ JS syntax error: {e.msg} at line {e.lineno}')
        
        # Show the problematic line
        lines = js.split('\n')
        if e.lineno and e.lineno <= len(lines):
            for i in range(max(0, e.lineno-3), min(len(lines), e.lineno+2)):
                marker = '>>>' if i == e.lineno - 1 else '   '
                print(f'{marker} {i+1}: {lines[i][:120]}')

# Also check for the specific issues
print(f'\n--- Key checks ---')
print(f'admin-workflows has hidden: {"hidden" in h[h.find("admin-workflows"):h.find("admin-workflows")+80]}')
print(f'renderWorkflowTemplates async: {"async function renderWorkflowTemplates" in h}')

# Credit code chain
slc = h.find('function selectLeadCompany')
if slc > 0:
    # find function body
    d=0; s=False
    for i in range(slc, len(h)):
        if h[i]=='{': d+=1; s=True
        elif h[i]=='}': d-=1
        if s and d==0: slc_end=i+1; break
    slc_body = h[slc:slc_end]
    has_credit = 'credit_code' in slc_body
    has_type_change = 'onLeadTypeChange' in slc_body
    print(f'selectLeadCompany: credit_code={has_credit}, onLeadTypeChange={has_type_change}')

# Check div leakage
ms = h.find('id="main-screen"')
if ms > 0:
    d=0;s=False;extra_at=None
    for i in range(ms, len(h)):
        t4=h[i:i+4].lower();t6=h[i:i+6].lower()
        if t4=='<div' and t6!='</div': d+=1;s=True
        elif t6=='</div>': d-=1
        if s and d==-1: extra_at=i; break
    
    if extra_at:
        line = h[:extra_at].count('\n')+1
        ctx_start = max(0, extra_at-80)
        ctx = h[ctx_start:extra_at+100]
        print(f'\n⚠️ Extra </div> at byte {extra_at} (line ~{line})')
        print(f'Context: ...{ctx}...')
