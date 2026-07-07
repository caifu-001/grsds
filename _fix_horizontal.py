import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

changes = 0

# === STEP 1: Replace the compare table area HTML ===
# Current: one big scrolling table. New: filter bar + product sections with horizontal tables.

old_compare_html = '''    <!-- Compare Table -->
    <div style="background:var(--card);border-radius:12px;padding:16px;margin-bottom:16px">
     <h4 style="margin:0 0 12px;font-size:14px">📋 供应商报价单对比</h4>
     <div style="overflow-x:auto">
      <table class="check-table" id="scouting-compare-table">
       <thead id="scouting-compare-head"></thead>
       <tbody id="scouting-compare-body"></tbody>
      </table>
     </div>
    </div>'''

new_compare_html = '''    <!-- Compare Filter Bar -->
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
      <span style="font-size:11px;color:var(--text-secondary)">(同行中最低采购价<span style="color:#27ae60;font-weight:600">绿色高亮</span>)</span>
     </div>
    </div>
    <!-- Product Compare Tables -->
    <div id="scouting-compare-container" style="display:flex;flex-direction:column;gap:16px;margin-bottom:16px"></div>'''

if old_compare_html in c:
    c = c.replace(old_compare_html, new_compare_html)
    changes += 1
    print("STEP 1: Compare HTML replaced with horizontal layout")
else:
    print("FAIL 1: old_compare_html not found")
    idx = c.find("scouting-compare-table")
    if idx > 0:
        print(f"  scouting-compare-table at {idx}")

# === STEP 2: Rewrite the compare table body part of refreshScoutingCompare ===
# Find the old compare table section and replace it entirely

old_compare_start = "  // ====== Compare Table ======"
old_compare_end = "  body.innerHTML=bodyHtml;\n}"

idx_start = c.find(old_compare_start)
idx_end = c.find(old_compare_end, idx_start)
if idx_start < 0:
    # Try without spaces
    old_compare_start2 = "  // ====== Compare Table ======".replace("  ", "")
    idx_start = c.find(old_compare_start2)
    if idx_start > 0:
        old_compare_start = old_compare_start2

if idx_start > 0 and idx_end > 0:
    old_compare_section = c[idx_start:idx_end + len(old_compare_end)]
    
    new_compare_section = '''  // ====== Compare Table (Horizontal: suppliers as rows per product) ======
  var cmpContainer=document.getElementById('scouting-compare-container');
  if(!cmpContainer)return;
  
  // Populate compare filter dropdowns from all scouting data
  (function(){
    var catSel=document.getElementById('sc-cmp-filter-cat');
    if(catSel&&!catSel.dataset.built){
      var cats={};for(var ci=0;ci<allScouting.length;ci++){var cc=allScouting[ci].product_category;if(cc)cats[cc]=1;}
      var opts='<option value="">全部分类</option>';
      var cks=Object.keys(cats).sort();for(var ck=0;ck<cks.length;ck++)opts+='<option value="'+escHtml(cks[ck])+'">'+escHtml(cks[ck])+'</option>';
      catSel.innerHTML=opts;catSel.dataset.built='1';
    }
  })();
  
  // Apply compare filters
  var cfName=(document.getElementById('sc-cmp-filter-name')||{}).value||'';
  var cfCat=(document.getElementById('sc-cmp-filter-cat')||{}).value||'';
  var cfStatus=(document.getElementById('sc-cmp-filter-status')||{}).value||'';
  var cfNoPrice=document.getElementById('sc-cmp-ignore-noprice')&&document.getElementById('sc-cmp-ignore-noprice').checked;
  cfName=cfName.trim().toLowerCase();
  
  var cmpFiltered=[];
  for(var fi=0;fi<filtered.length;fi++){
    var f=filtered[fi];
    if(cfName&&(f.product_name||'').toLowerCase().indexOf(cfName)<0)continue;
    if(cfCat&&f.product_category!==cfCat)continue;
    if(cfStatus&&f.status!==cfStatus)continue;
    if(cfNoPrice&&parseFloat(f.purchase_price)<=0)continue;
    cmpFiltered.push(f);
  }
  
  if(!cmpFiltered.length){
    cmpContainer.innerHTML='<div style="text-align:center;padding:32px;color:var(--text-secondary);background:var(--card);border-radius:12px">📭 无匹配的对比数据</div>';
    return;
  }
  
  // Group by product name
  var prodGroups={};
  for(var gi=0;gi<cmpFiltered.length;gi++){
    var s=cmpFiltered[gi];
    var key=(s.product_name||'未命名').trim().toLowerCase();
    if(!prodGroups[key])prodGroups[key]={name:s.product_name||'未命名',category:s.product_category||'未分类',items:[]};
    prodGroups[key].items.push(s);
  }
  var pkeys=Object.keys(prodGroups).sort();
  
  // Get tax rate
  var taxEl=document.getElementById('sc-tax-rate');
  var taxRate=parseFloat((taxEl&&taxEl.value)||13)||0;
  
  var containerHtml='';
  for(var pi=0;pi<pkeys.length;pi++){
    var grp=prodGroups[pkeys[pi]];
    var items=grp.items;
    // Sort by purchase price ascending
    items.sort(function(a,b){return parseFloat(a.purchase_price||0)-parseFloat(b.purchase_price||0)});
    var minPrice=parseFloat(items[0].purchase_price)||Infinity;
    
    // Product header
    var prodTitle=escHtml(grp.name);
    if(grp.category&&grp.category!=='未分类')prodTitle+=' <span style="font-size:11px;color:var(--text-secondary);font-weight:400">['+escHtml(grp.category)+']</span>';
    prodTitle+=' <span style="font-size:11px;color:var(--text-secondary);font-weight:400">('+items.length+'家供应商)</span>';
    
    containerHtml+='<div style="background:var(--card);border-radius:12px;padding:16px"><h4 style="margin:0 0 10px;font-size:14px;border-bottom:1px solid var(--border);padding-bottom:8px">📦 '+prodTitle+'</h4><div style="overflow-x:auto"><table class="check-table" style="width:100%;min-width:800px"><thead><tr><th>供应商</th><th>渠道</th><th>采购价(¥)</th><th>销售价(¥)</th><th>税后毛利率</th><th>达人佣金</th><th>MOQ</th><th>样品</th><th>合规要求</th><th>产品参数</th><th>状态</th></tr></thead><tbody>';
    
    for(var si=0;si<items.length;si++){
      var it=items[si];
      var itPp=parseFloat(it.purchase_price)||0;
      var itSp=parseFloat(it.selling_price)||0;
      var itNetPrice=itSp>0?itSp/(1+taxRate/100):0;
      var itMargin=itNetPrice>0?Math.round((itNetPrice-itPp)/itNetPrice*100):0;
      var cheapest=itPp===minPrice&&minPrice>0&&items.length>1;
      var bg=cheapest?' style="background:#e8f5e9"':'';
      
      // Parse params
      var params=it.product_params;
      try{if(typeof params==='string')params=JSON.parse(params)}catch(e){params={}}
      if(!params||typeof params!=='object')params={};
      var pstr='';
      var pks=Object.keys(params);
      for(var pk=0;pk<Math.min(pks.length,3);pk++){
        var kv=String(params[pks[pk]]||'');
        // Skip internal fields
        if(pks[pk]==='MOQ'||pks[pk]==='有无样品'||pks[pk]==='渠道'||pks[pk]==='合规要求'||pks[pk]==='产品分类'||pks[pk]==='moq')continue;
        pstr+=escHtml(pks[pk])+':'+escHtml(kv.substring(0,20))+(pk<Math.min(pks.length,3)-1?'<br>':'');
      }
      
      var statusMap={pending:'⏳待评估',approved:'✅已通过',rejected:'❌已否决',ordered:'📦已采购'};
      var stCls={pending:'#f0ad4e',approved:'var(--success)',rejected:'var(--danger)',ordered:'var(--primary)'};
      var st=it.status||'pending';
      
      containerHtml+='<tr>'+
        '<td'+bg+'><b>'+escHtml(it.supplier_name||'-')+'</b></td>'+
        '<td'+bg+'>'+escHtml(it.channel||'-')+'</td>'+
        '<td'+(cheapest?' style="background:#e8f5e9;font-weight:700;color:var(--success)"':'')+'>'+(itPp>0?'¥'+fmtNum(itPp):'-')+'</td>'+
        '<td'+bg+'>'+(itSp>0?'¥'+fmtNum(itSp):'-')+'</td>'+
        '<td style="font-weight:600;color:'+(itMargin>=0?'var(--success)':'var(--danger)')+''+bg+'">'+(itSp>0?itMargin+'%':'N/A')+'</td>'+
        '<td'+bg+'>'+(parseFloat(it.influencer_commission)||0)+'%</td>'+
        '<td'+bg+'>'+(it.moq||'-')+'</td>'+
        '<td'+bg+'>'+(it.has_sample?'✅':'❌')+'</td>'+
        '<td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'+bg+'" title="'+escHtml(it.compliance_requirements||'')+'">'+escHtml((it.compliance_requirements||'-').substring(0,30))+'</td>'+
        '<td style="font-size:11px'+bg+'">'+(pstr||'-')+'</td>'+
        '<td'+bg+'><span style="font-size:11px;padding:2px 6px;border-radius:4px;background:'+(stCls[st]||'#999')+';color:#fff;white-space:nowrap">'+statusMap[st]+'</span></td>'+
        '</tr>';
    }
    containerHtml+='</tbody></table></div></div>';
  }
  cmpContainer.innerHTML=containerHtml;'''

    if old_compare_section in c:
        c = c.replace(old_compare_section, new_compare_section)
        changes += 1
        print("STEP 2: Compare table body replaced with horizontal layout")
    else:
        print(f"FAIL 2: old_compare_section not matched")
        # Debug
        print(f"  old start idx: {idx_start}, end idx: {idx_end}")
        print(f"  old start content: {repr(c[idx_start:idx_start+50])}")
        print(f"  old end content: {repr(c[idx_end-20:idx_end+20])}")
else:
    print(f"FAIL 2: compare table section not found (start={idx_start}, end={idx_end})")

# === STEP 3: Update buildScCatFilterDropdown to also populate compare filter ===
# No need - the compare filter populates itself in the new code above.

# === STEP 4: Remove the old summary cards supplier count fix that failed ===
# Already done in previous run, skip.

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"\nDone. Changes: {changes}, Size: {size_kb:.1f} KB")
