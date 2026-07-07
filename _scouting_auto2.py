#!/usr/bin/env python3
"""Add company directory autocomplete - fix: use literal \\uXXXX in replacements."""
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

changes = []

# The modal HTML uses literal \uXXXX escape sequences in the file.
# Replacements must match these literal sequences.

# ── 1. supplier field: add autocomplete ──
old1 = '\\u4f9b\\u5e94\\u5546</label><input id="sc-supplier" placeholder="\\u4f9b\\u5e94\\u5546\\u540d\\u79f0">'
new1 = '\\u4f9b\\u5e94\\u5546 <span style="font-size:11px;color:var(--text-secondary);font-weight:400">\\u2014 \\u652f\\u6301\\u4f01\\u4e1a\\u540d\\u5f55\\u81ea\\u52a8\\u5339\\u914d</span></label><div style="position:relative"><input id="sc-supplier" placeholder="\\u4f9b\\u5e94\\u5546\\u540d\\u79f0" autocomplete="off" oninput="onScoutingSupplierInput()" onfocus="onScoutingSupplierInput()" onkeydown="onScoutingSupplierKeydown(event)"><div class="name-suggestions hidden" id="sc-supplier-suggestions"></div></div>'
if old1 in c:
    c = c.replace(old1, new1)
    changes.append("1. supplier autocomplete OK")
else:
    changes.append("1. FAILED")

# ── 2. channel: select → input+datalist ──
old2 = '<select id="sc-channel"><option value="">\\u8bf7\\u9009\\u62e9</option><option value="1688">1688</option><option value="\\u4e49\\u4e4c">\\u4e49\\u4e4c</option><option value="\\u4e9a\\u9a6c\\u900a">\\u4e9a\\u9a6c\\u900a</option><option value="TikTok Shop">TikTok Shop</option><option value="\\u62fc\\u591a\\u591a">\\u62fc\\u591a\\u591a</option><option value="\\u6dd8\\u5b9d">\\u6dd8\\u5b9d</option><option value="\\u4eac\\u4e1c">\\u4eac\\u4e1c</option><option value="\\u5176\\u4ed6">\\u5176\\u4ed6</option></select>'
new2 = '<input id="sc-channel" placeholder="\\u5982\\uff1a1688\\u3001\\u4e49\\u4e4c..." list="sc-channel-list" autocomplete="off"><datalist id="sc-channel-list"><option value="1688"><option value="\\u4e49\\u4e4c"><option value="\\u4e9a\\u9a6c\\u900a"><option value="TikTok Shop"><option value="\\u62fc\\u591a\\u591a"><option value="\\u6dd8\\u5b9d"><option value="\\u4eac\\u4e1c"><option value="\\u5176\\u4ed6"></datalist>'
if old2 in c:
    c = c.replace(old2, new2)
    changes.append("2. channel select→input OK")
else:
    changes.append("2. FAILED")

# ── 3. Fix editScouting renderScParams call ──
old3 = '  renderScParams();\n  // Categories\n  var cats=[];'
if old3 in c:
    new3 = '  renderScParams();\n  updateScoutingDatalists();\n  // Categories\n  var cats=[];'
    c = c.replace(old3, new3)
    changes.append("3. editScouting datalists OK")
else:
    changes.append("3. FAILED")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
