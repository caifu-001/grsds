with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: The garbled line in setUserRole - "break;\n    case'grants':renderGrantsPanel();break;}}"
# This was wrongly inserted. Fix back to original.
bad = "break;\n    case'grants':renderGrantsPanel();break;}}"
good = "break;}}"
if bad in c:
    c = c.replace(bad, good)
    print('[1] Fixed garbled setUserRole')
else:
    print('[1] Bad pattern not found, searching variants...')
    # Try to find the problematic area
    idx = c.find("case'grants':renderGrantsPanel();break;")
    if idx > 0:
        snippet = c[max(0,idx-80):idx+80]
        print(f'  found at {idx}: ...{snippet}...')
        # Remove it
        c = c.replace("case'grants':renderGrantsPanel();break;", "")
        print('  removed')

# Fix 2: Ensure the proper grants case is in switchAdminTab
# Find switchAdminTab function and look for the workflows case
sw_idx = c.find('async function switchAdminTab(tab){')
if sw_idx > 0:
    # Find the workflows case inside this function
    wf_case = c.find("tab==='workflows'", sw_idx)
    # find the closing of the function
    # The function ends with "\n}" after the workflows case
    after_wf = c[wf_case:]
    # Find the end of the workflows line (it's an async IIFE on one logical line)
    # The pattern is: else if(tab==='workflows'){...})();}
    end_wf = after_wf.find('})();}\n}')
    if end_wf > 0 and end_wf < 1000:
        insert_pos = wf_case + end_wf + len('})();}')
        # Insert grants case before the closing }
        grants_case = '\n  else if(tab===\'grants\'){var gr=document.getElementById(\'admin-grants\');gr.classList.remove(\'hidden\');subs[13].classList.add(\'active\');renderGrantsPanel();}'
        c = c[:insert_pos] + grants_case + c[insert_pos:]
        print('[2] Proper grants case added in switchAdminTab')
    else:
        # Try alternate: find the closing } after the ...workflows...})();}  pattern
        after_wf2 = c[wf_case:]
        m = c.find('renderWorkflowTemplates();})();}', wf_case)
        if m > 0:
            insert_pos = m + len('renderWorkflowTemplates();})();}')
            grants_case2 = '\n  else if(tab===\'grants\'){var gr=document.getElementById(\'admin-grants\');gr.classList.remove(\'hidden\');subs[13].classList.add(\'active\');renderGrantsPanel();}'
            c = c[:insert_pos] + grants_case2 + c[insert_pos:]
            print('[2b] Proper grants case added in switchAdminTab')
        else:
            print('[2] Could not find insert position for grants case')
else:
    print('[2] switchAdminTab not found')

# Verify
for fn in ['renderGrantsPanel', 'loadMemberGrantsPanel', 'saveMemberGrants', 'onGrantCheck']:
    count = c.count(f'function {fn}')
    print(f'  {fn}: {count}')

# Check bad case'grants' is gone
bad_count = c.count("case'grants'")
print(f'  case grants occurrences: {bad_count}')

divs = c.count('<div') - c.count('</div>')
curls = c.count('{') - c.count('}')
print(f'balance: div={divs} curly={curls}')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('done')
