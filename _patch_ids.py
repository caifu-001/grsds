# -*- coding: utf-8 -*-
import re, sys

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Rename old lead-grid/lead-empty in sales-leads-panel (1st occurrence)
old_panel_start = content.find('id="sales-leads-panel"')
old_panel_end = content.find('id="sales-quotations-panel"', old_panel_start)
old_panel = content[old_panel_start:old_panel_end]
old_panel_new = old_panel.replace('id="lead-grid"', 'id="sales-lead-grid"')
old_panel_new = old_panel_new.replace('id="lead-empty"', 'id="sales-lead-empty"')
if old_panel_new != old_panel:
    content = content[:old_panel_start] + old_panel_new + content[old_panel_end:]
    changes += 1
    print("OK: renamed old lead-grid/lead-empty")
else:
    print("SKIP: old lead-grid/lead-empty not found")

# 2. Remove id="lead-btn-freeze" from all buttons (12 copies, toggleLeadFrozen undefined)
btn_pattern = '<button id="lead-btn-freeze" class="btn-sm btn-sm-muted hidden" onclick="toggleLeadFrozen()">'
replacement = '<button class="btn-sm btn-sm-muted hidden" onclick="toggleLeadFrozen()">'
n = content.count(btn_pattern)
if n > 0:
    content = content.replace(btn_pattern, replacement)
    changes += 1
    print(f"OK: removed id from {n} lead-btn-freeze buttons")
else:
    print("SKIP: no lead-btn-freeze found")

# 3. Check and fix lead-btn-delete duplicates  
count = content.count('id="lead-btn-delete"')
print(f"INFO: lead-btn-delete occurrences: {count}")
if count > 1:
    # Keep first, remove id from rest
    first = True
    result = []
    i = 0
    while i < len(content):
        idx = content.find('id="lead-btn-delete"', i)
        if idx < 0:
            result.append(content[i:])
            break
        result.append(content[i:idx])
        if first:
            result.append('id="lead-btn-delete"')
            first = False
        else:
            result.append('class="dummy-btn-delete"')
            changes += 1
        i = idx + len('id="lead-btn-delete"')
    content = ''.join(result)
    print("OK: deduplicated lead-btn-delete")
else:
    print("INFO: no lead-btn-delete dedup needed")

# 4. Check lead-form-title duplicates
count = content.count('id="lead-form-title"')
print(f"INFO: lead-form-title occurrences: {count}")
if count > 1:
    first = True
    result = []
    i = 0
    while i < len(content):
        idx = content.find('id="lead-form-title"', i)
        if idx < 0:
            result.append(content[i:])
            break
        result.append(content[i:idx])
        if first:
            result.append('id="lead-form-title"')
            first = False
        else:
            result.append('class="dummy-form-title"')
            changes += 1
        i = idx + len('id="lead-form-title"')
    content = ''.join(result)
    print("OK: deduplicated lead-form-title")
else:
    print("INFO: no lead-form-title dedup needed")

if changes == 0:
    print("WARNING: No changes applied!")
    sys.exit(1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"Total changes: {changes}")
