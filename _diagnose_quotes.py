import re

f = open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8').read()

# Strategy: Replace inline confirmDialog/delete calls with helper functions
# This avoids all the quote-escaping hell

fixes = 0

# 1. Replace ticket delete inline callback → confirmDeleteTicket(id)
old = """<button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog('确定删除该工单？',async function(){await sb.from('service_tickets').delete().eq('id',\\''+t.id+'\\');loadTickets()})">删除</button>"""
old2 = """<button class="btn-lead-danger" onclick="event.stopPropagation();confirmDialog(\\'确定删除该工单？\\',async function(){await sb.from(\\'service_tickets\\').delete().eq(\\'id\\',\\\\''+t.id+'\\\\');loadTickets()})">删除</button>"""
# Try to find what's actually in the file
idx = f.find("confirmDialog('确定删除该工单")
if idx >= 0:
    print('Found confirmDialog for ticket at', idx)
    # Find the full button
    start = f.rfind('<button', 0, idx)
    end = f.find('</button>', idx) + len('</button>')
    actual = f[start:end]
    print('Actual:', actual[:200])
    print('Repr:', repr(actual[:200]))

# Check for ''+ patterns in the after-sales section
after_idx = f.find('═══════════ AFTER-SALES')
inv_idx = f.find('═══════════ INVENTORY')
section = f[after_idx:inv_idx]
problematic = []
for i, line in enumerate(section.splitlines()):
    if "''+" in line and ('onclick' in line or 'confirm' in line):
        problematic.append(line.strip()[:200])

print(f'\n=== {len(problematic)} problematic lines with ""+" ===')
for p in problematic[:10]:
    print('  ', p[:150])
