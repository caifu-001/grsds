import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

changes = 0

# ===== BUG 1: Header has extra <th>毛利率</th> before supplier cols, body misses it =====
# Current header: <th>产品</th><th>毛利率</th> + supplier cols (8 each)
# Current body: <td>产品名</td> + supplier cols (7 each due to missing one)
# Fix: remove the stray <th>毛利率</th> — it's per-supplier, not per-product

old_head_html = "var headHtml='<tr><th>\\u4ea7\\u54c1</th><th>\\u6bdb\\u5229\\u7387</th>';"
new_head_html = "var headHtml='<tr><th>\\u4ea7\\u54c1</th>';"

if old_head_html in c:
    c = c.replace(old_head_html, new_head_html)
    changes += 1
    print("FIX 1: removed stray <th>毛利率</th> from header")
else:
    # Try unicode direct
    alt_old = "var headHtml='<tr><th>\u4ea7\u54c1</th><th>\u6bdb\u5229\u7387</th>';"
    alt_new = "var headHtml='<tr><th>\u4ea7\u54c1</th>';"
    if alt_old in c:
        c = c.replace(alt_old, alt_new)
        changes += 1
        print("FIX 1 (unicode): removed stray <th>毛利率</th>")
    else:
        print("FAIL 1: old_head_html not found - checking variants")
        idx = c.find("headHtml='<tr>")
        if idx > 0:
            s = c[idx:idx+120]
            print(f"  Found: {repr(s)}")

# ===== BUG 2: colspan="6" should match number of cols per supplier (8) =====
old_colspan = 'colspan="6"'
new_colspan = 'colspan="8"'
if old_colspan in c:
    # Only replace the one in the compare table
    idx_compare = c.find("bodyHtml+='<td colspan")
    if idx_compare > 0:
        segment = c[idx_compare:idx_compare+60]
        if "colspan=\"6\"" in segment:
            old_exact = segment[:segment.index('"6"')+4]
            new_exact = old_exact.replace("colspan=\"6\"", "colspan=\"8\"")
            c = c.replace(old_exact, new_exact)
            changes += 1
            print("FIX 2: colspan 6 → 8")
        else:
            print("FAIL 2: colspan 6 in wrong context")
    else:
        # Try global replace (safe since the only other colspan is 13 in renderScouting)
        old_all = 'colspan=\\"6\\"'
        if old_all in c:
            c = c.replace(old_all, 'colspan=\\"8\\"')
            changes += 1
            print("FIX 2 (global): colspan 6 → 8")
        else:
            print("FAIL 2: colspan='6' not found anywhere")
else:
    print("FAIL 2: colspan 6 not found")

# ===== FEATURE: Add product selection checkboxes to scouting list =====
# In renderScouting, add a checkbox column at the start of each row
old_tr_start = "h+='<tr><td>'+escHtml(s.channel||'')+'</td><td><b>'"
new_tr_start = "h+='<tr><td><input type=\"checkbox\" class=\"sc-compare-cb\" data-id=\"'+s.id+'\" onchange=\"refreshScoutingCompare()\" title=\"加入对比\"></td><td>'+escHtml(s.channel||'')+'</td><td><b>'"

if old_tr_start in c:
    c = c.replace(old_tr_start, new_tr_start)
    changes += 1
    print("FIX 3: added compare checkboxes to scouting list rows")
else:
    print("FAIL 3: old_tr_start not found")

# ===== Also fix the empty state colspan in renderScouting (was 13, now 14) =====
old_colspan_13 = 'colspan="13" style="text-align:center'
new_colspan_14 = 'colspan="14" style="text-align:center'
if old_colspan_13 in c:
    c = c.replace(old_colspan_13, new_colspan_14)
    changes += 1
    print("FIX 4: empty state colspan 13 → 14")
else:
    print("FAIL 4: colspan 13 not found")

# ===== FIX 5: Also add "select all" button in toolbar area =====
# Find the scouting toolbar and add select all checkbox
old_toolbar = 'id="sc-filter-category"'
new_toolbar = 'id="sc-filter-compare" style="margin-left:8px;vertical-align:middle" title="仅对比已勾选"><label style="font-size:12px;margin-left:4px;cursor:pointer">对比已选</label>\u0026nbsp;\u0026nbsp;<button class="btn-xs" style="background:var(--surface);border:1px solid var(--border);cursor:pointer;border-radius:4px;padding:2px 8px;font-size:11px" onclick="toggleAllCompare()" title="全选/取消">全选</button>\n    \u0026nbsp;'
if old_toolbar in c:
    c = c.replace(old_toolbar, old_toolbar + new_toolbar)
    changes += 1
    print("FIX 5: added compare toggle toolbar")
else:
    print("FAIL 5: sc-filter-category not found in toolbar")

# ===== FIX 6: Update refreshScoutingCompare to filter by selected checkboxes =====
# Add compare-only mode after existing filters
old_apply_filters = "filtered.push(s);\n  }\n  // ====== Summary Cards ======"
new_apply_filters = "filtered.push(s);\n  }\n  // Compare-only mode: filter by checked boxes\n  var compCb=document.getElementById('sc-filter-compare');\n  var compOnly=compCb&&compCb.checked;\n  if(compOnly){\n    var checkedIds={};\n    var cbs=document.querySelectorAll('.sc-compare-cb:checked');\n    for(var cbi=0;cbi<cbs.length;cbi++){checkedIds[cbs[cbi].getAttribute('data-id')]=true;}\n    var compFiltered=[];\n    for(var fi2=0;fi2<filtered.length;fi2++){if(checkedIds[String(filtered[fi2].id)])compFiltered.push(filtered[fi2]);}\n    if(compFiltered.length)filtered=compFiltered;\n  }\n  // ====== Summary Cards ======"

if old_apply_filters in c:
    c = c.replace(old_apply_filters, new_apply_filters)
    changes += 1
    print("FIX 6: added compare-only filter to refreshScoutingCompare")
else:
    print("FAIL 6: old_apply_filters not found")

# ===== FIX 7: Add toggleAllCompare function =====
old_last_func = "async function deleteScouting(id){"
new_func_def = "function toggleAllCompare(){\n  var cbs=document.querySelectorAll('.sc-compare-cb');\n  if(!cbs.length)return;\n  var allChecked=cbs.length===document.querySelectorAll('.sc-compare-cb:checked').length;\n  var newState=!allChecked;\n  for(var i=0;i<cbs.length;i++)cbs[i].checked=newState;\n  refreshScoutingCompare();\n}\n\n"
if old_last_func in c:
    c = c.replace(old_last_func, new_func_def + old_last_func)
    changes += 1
    print("FIX 7: added toggleAllCompare function")
else:
    print("FAIL 7: deleteScouting not found")

# ===== FIX 8: Fix the scouting table header to include checkbox column =====
# Find the <thead> of scouting table
old_thead_first = "<th>渠道</th><th>产品名称</th>"
new_thead_first = "<th style=\"width:32px\">对比</th><th>渠道</th><th>产品名称</th>"
if old_thead_first in c:
    c = c.replace(old_thead_first, new_thead_first)
    changes += 1
    print("FIX 8: added checkbox column header")
else:
    print("FAIL 8: table header not found")
    idx = c.find("渠道</th><th>产品名称</th>")
    if idx > 0:
        print(f"  found at {idx}: {repr(c[idx-30:idx+30])}")
    else:
        print("  searching for scouting-tbody...")
        idx2 = c.find("scouting-tbody")
        if idx2 > 0:
            print(f"  scouting-tbody at {idx2}, checking nearby html")
            print(repr(c[idx2-200:idx2+100]))

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"\nDone. Changes: {changes}, Size: {size_kb:.1f} KB")
