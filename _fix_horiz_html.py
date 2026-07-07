import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# The exact old block: the compare table div + its parent closing
old_block = '''<div style="overflow-x:auto">
      <table class="check-table" id="scouting-compare-table">
       <thead id="scouting-compare-head"></thead>
       <tbody id="scouting-compare-body"></tbody>
      </table>
     </div>
    </div>
    <!-- Tax Rate Row -->
    <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;font-weight:600;white-space:nowrap">\u05e3\u06e9 \u0421\u0427\u7a0e\u7387\u8bbe\u7f6e</span>
      <span style="font-size:12px;color:var(--text-secondary)">\u0421\u0427\u589e\u503c\u7a0e\u7387</span>
      <input id="sc-tax-rate" type="number" step="1" min="0" max="30" value="13" style="width:64px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center" onchange="refreshScoutingCompare()">
      <span style="font-size:12px;color:var(--text-secondary)">%</span>
      <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">\u0421\u0427\u6bdb\u5229\u7387 = (\u0421\u0427\u542b\u7a0e\u552e\u4ef7/(1+\u0421\u0427\u7a0e\u7387) - \u0421\u0427\u91c7\u8d2d\u4ef7) / (\u0421\u0427\u542b\u7a0e\u552e\u4ef7/(1+\u0421\u0427\u7a0e\u7387)) \u04170%</span>
    </div>'''

# Let me try a different approach - find by unique marker
idx = c.find("scouting-compare-table")
if idx > 0:
    # Find the enclosing section: start of this subsection
    # Go back to find <h4> or previous div
    s = c.rfind("<h4", idx - 800, idx)
    # The block starts from the compare table div's parent
    block_start = c.rfind("<!-- Compare Table -->", idx - 500, idx)
    if block_start < 0:
        block_start = c.rfind("<div style=\"overflow-x:auto\">", idx - 100, idx)
    
    # Now find the end: after the tax rate row
    # The tax rate row ends with </div> and then the chart rows start
    chart_start = c.find("<!-- Price & Margin Charts", idx)
    if chart_start < 0:
        chart_start = c.find("scouting-charts-row-1", idx)
    
    if block_start > 0 and chart_start > 0:
        old_block = c[block_start:chart_start]
        print(f"Old block length: {len(old_block)}")
        print(f"Old block start: {repr(old_block[:80])}")
        print(f"Old block end: {repr(old_block[-80:])}")
        
        new_block = '''<!-- Compare Filter Bar -->
    <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:16px">
     <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <span style="font-weight:600;font-size:14px">📋 供应商横向对比</span>
      <span style="color:var(--text-secondary);font-size:12px">筛选产品：</span>
      <input id="sc-cmp-filter-name" placeholder="产品名称" style="width:140px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px" oninput="refreshScoutingCompare()">
      <select id="sc-cmp-filter-cat" style="width:110px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px" onchange="refreshScoutingCompare()">
       <option value="">全部分类</option>
      </select>
      <select id="sc-cmp-filter-status" style="width:100px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px" onchange="refreshScoutingCompare()">
       <option value="">全部状态</option><option value="pending">待评估</option><option value="approved">已通过</option><option value="rejected">已否决</option><option value="ordered">已采购</option>
      </select>
      <label style="font-size:12px;cursor:pointer;display:flex;align-items:center;gap:4px"><input type="checkbox" id="sc-cmp-ignore-noprice" onchange="refreshScoutingCompare()"> 隐藏无报价</label>
     </div>
    </div>
    <!-- Tax Rate Row -->
    <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <span style="font-size:13px;font-weight:600;white-space:nowrap">🧮 税率设置</span>
      <span style="font-size:12px;color:var(--text-secondary)">增值税率</span>
      <input id="sc-tax-rate" type="number" step="1" min="0" max="30" value="13" style="width:64px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center" onchange="refreshScoutingCompare()">
      <span style="font-size:12px;color:var(--text-secondary)">%</span>
      <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">毛利率 = (含税售价/(1+税率) - 采购价) / (含税售价/(1+税率)) \u00d7100%</span>
    </div>
    <!-- Product Compare Tables -->
    <div id="scouting-compare-container" style="display:flex;flex-direction:column;gap:16px;margin-bottom:16px"></div>
    <!-- Price & Margin Charts -->'''
        
        if old_block in c:
            c = c.replace(old_block, new_block)
            print("STEP 1: HTML replaced successfully")
        else:
            print("FAIL: old_block not in c (but block_start to chart_start was found)")
            # Try with block_start including parent tag
            old_block2 = c[block_start-4:chart_start]  # include the <!-- comment
            if "<!-- Compare Table -->" in old_block2:
                # The old block starts from there
                real_start = c.find("<!-- Compare Table -->", idx - 500, idx)
                old_block3 = c[real_start:chart_start]
                if old_block3 in c:
                    # Prepend the marker comment to new_block
                    new_block3 = "<!-- Compare Table -->" + new_block
                    c = c.replace(old_block3, new_block3)
                    print("STEP 1 (alt): HTML replaced with comment marker")
                else:
                    print(f"FAIL alt: still not found. Real start: {real_start}")
                    print(f"  old_block3 head: {repr(old_block3[:80])}")
                    print(f"  old_block3 tail: {repr(old_block3[-80:])}")
    else:
        print(f"block_start={block_start}, chart_start={chart_start}")
else:
    print("scouting-compare-table not found at all")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

import os
print(f"Size: {os.path.getsize(p)/1024:.1f} KB")
