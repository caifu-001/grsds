#!/usr/bin/env python3
"""Fix scouting: switchTab default + inv-subtabs visibility + status in modal."""
import os

base = r"D:\1kaifa\grsds"
with open(os.path.join(base, "index.html"), "r", encoding="utf-8") as f:
    c = f.read()

changes = []

# ── 1. switchTab('inventory') → switchResTab('scouting') instead of 'inventory' ──
old1 = "    switchResTab('inventory');\n  }else if(tab==='suppliers'){"
new1 = "    switchResTab('scouting');\n  }else if(tab==='suppliers'){"
if old1 in c:
    c = c.replace(old1, new1)
    changes.append("1. switchTab default→scouting OK")
else:
    changes.append("1. FAILED switchTab")

# ── 2. Add status field to scouting modal ──
# Insert status dropdown after has-sample checkbox, before compliance
old2 = '<div class="form-group" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="sc-has-sample" style="width:auto"><label style="margin:0">\\u5df2\\u62ff\\u6837\\u54c1</label></div><div class="form-group" style="grid-column:1/-1"><label>\\u5408\\u89c4\\u8981\\u6c42</label>'
new2 = '<div class="form-group" style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="sc-has-sample" style="width:auto"><label style="margin:0">\\u5df2\\u62ff\\u6837\\u54c1</label></div><div class="form-group"><label>\\u72b6\\u6001</label><select id="sc-status"><option value="pending">\\u5f85\\u8bc4\\u4f30</option><option value="approved">\\u5df2\\u901a\\u8fc7</option><option value="rejected">\\u5df2\\u5426\\u51b3</option><option value="ordered">\\u5df2\\u91c7\\u8d2d</option></select></div><div class="form-group" style="grid-column:1/-1"><label>\\u5408\\u89c4\\u8981\\u6c42</label>'
if old2 in c:
    c = c.replace(old2, new2)
    changes.append("2. status field in modal OK")
else:
    changes.append("2. FAILED modal status")

# ── 3. saveScouting: read status from form ──
old3 = "    status:'pending',"
new3 = "    status:document.getElementById('sc-status').value||'pending',"
if old3 in c:
    c = c.replace(old3, new3)
    changes.append("3. saveScouting reads status OK")
else:
    changes.append("3. FAILED saveScouting status")

# ── 4. editScouting: set status in form ──
old4 = "  document.getElementById('sc-supplier').value=s.supplier_name||'';\n  document.getElementById('sc-supplier').dataset.supplierId=s.supplier_id||'';"
new4 = "  document.getElementById('sc-supplier').value=s.supplier_name||'';\n  document.getElementById('sc-supplier').dataset.supplierId=s.supplier_id||'';\n  document.getElementById('sc-status').value=s.status||'pending';"
if old4 in c:
    c = c.replace(old4, new4)
    changes.append("4. editScouting status OK")
else:
    changes.append("4. FAILED editScouting status")

# ── 5. openScoutingForm: reset status to pending ──
old5 = "  document.getElementById('sc-supplier').value='';"
new5 = "  document.getElementById('sc-supplier').value='';\n  document.getElementById('sc-status').value='pending';"
if old5 in c:
    c = c.replace(old5, new5)
    changes.append("5. openScoutingForm reset status OK")
else:
    # Try alternate
    old5b = "  document.getElementById('sc-supplier').value='';\n  scTempParams=[];"
    new5b = "  document.getElementById('sc-supplier').value='';\n  document.getElementById('sc-status').value='pending';\n  scTempParams=[];"
    if old5b in c:
        c = c.replace(old5b, new5b)
        changes.append("5b. openScoutingForm reset status OK")
    else:
        changes.append("5. FAILED openScoutingForm reset status")

with open(os.path.join(base, "index.html"), "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
