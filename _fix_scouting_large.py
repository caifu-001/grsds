import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

changes = 0

# ====== FIX 1: Fix chart titles "按分类" → "按产品" ======
for old_title, new_title in [
    ("价格对比分析（按分类）", "价格对比分析（按产品）"),
    ("佣金分析（按分类）", "佣金分析（按产品）"),
    ("MOQ 对比分析（按分类）", "MOQ 对比分析（按产品）"),
]:
    if old_title in c:
        c = c.replace(old_title, new_title)
        changes += 1
        print(f"  FIX title: {old_title} -> {new_title}")

# ====== FIX 2: Restructure analytics layout with tax rate + margin chart ======
# The current layout has 2 col grids for channels/status, price/commission, moq/category
# Replace the whole analytics block with a cleaner layout

old_analytics = (
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-1">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">🏪 渠道分布</h4>\n'
    '      <div id="sc-channel-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📋 状态统计</h4>\n'
    '      <div id="sc-status-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n'
    '     </div>\n'
    '    </div>\n'
    '    <!-- Price & Commission Charts -->\n'
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-2">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">💰 价格对比分析（按产品）</h4>\n'
    '      <canvas id="sc-price-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📊 佣金分析（按产品）</h4>\n'
    '      <canvas id="sc-margin-chart" style="width:100%;height:240px"></canvas>\n'
    '      <canvas id="sc-commission-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '    </div>\n'
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-3">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📦 MOQ 对比分析（按产品）</h4>\n'
    '      <canvas id="sc-moq-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📈 分类产品数量分布</h4>\n'
    '      <canvas id="sc-category-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '    </div>'
)

new_analytics = (
    '    <!-- Tax Rate Row -->\n'
    '    <div style="background:var(--card);border-radius:12px;padding:14px;margin-bottom:16px;display:flex;align-items:center;gap:12px">\n'
    '      <span style="font-size:13px;font-weight:600;white-space:nowrap">🧮 税率设置</span>\n'
    '      <span style="font-size:12px;color:var(--text-secondary)">增值税率</span>\n'
    '      <input id="sc-tax-rate" type="number" step="1" min="0" max="30" value="13" style="width:64px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center" onchange="refreshScoutingCompare()">\n'
    '      <span style="font-size:12px;color:var(--text-secondary)">%</span>\n'
    '      <span style="font-size:11px;color:var(--text-secondary);margin-left:4px">毛利率 = (含税售价/(1+税率) - 采购价) / (含税售价/(1+税率)) ×100%</span>\n'
    '    </div>\n'
    '    <!-- Price & Margin Charts as 1-row 2-col -->\n'
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-1">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">💰 供应商价格对比</h4>\n'
    '      <canvas id="sc-price-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📊 税后毛利率对比</h4>\n'
    '      <canvas id="sc-margin-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '    </div>\n'
    '    <!-- Commission & MOQ Charts -->\n'
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-2">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">💸 达人佣金对比</h4>\n'
    '      <canvas id="sc-commission-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📦 起订量(MOQ)对比</h4>\n'
    '      <canvas id="sc-moq-chart" style="width:100%;height:240px"></canvas>\n'
    '     </div>\n'
    '    </div>\n'
    '    <!-- Channels & Status -->\n'
    '    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-3">\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">🏪 渠道分布</h4>\n'
    '      <div id="sc-channel-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n'
    '     </div>\n'
    '     <div style="background:var(--card);border-radius:12px;padding:16px">\n'
    '      <h4 style="margin:0 0 12px;font-size:14px">📋 状态统计</h4>\n'
    '      <div id="sc-status-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n'
    '     </div>\n'
    '    </div>'
)

if old_analytics in c:
    c = c.replace(old_analytics, new_analytics)
    changes += 1
    print("  FIX: analytics layout restructured with tax rate row")
else:
    print("  FAIL: analytics layout not matched")
    # Try to find it partially
    if "scouting-charts-row-1" in c:
        pos = c.find("scouting-charts-row-1")
        print(f"    found at {pos}: {repr(c[pos-50:pos+80])}")

# ====== FIX 3: Update chart data functions to use tax rate for margin ======
# Find drawScoutingCategoryCharts and update margin calculation
idx_chart = c.find("function drawScoutingCategoryCharts(")
if idx_chart > 0:
    end_chart = c.find("\n}\n\n// === Company Directory Cascade", idx_chart)
    if end_chart < 0:
        end_chart = c.find("\n}\n\n// === Company Directory", idx_chart)
    if end_chart < 0:
        end_chart = c.find("\n// === Company Directory", idx_chart)
    
    old_func = c[idx_chart:end_chart + 2]  # include the closing }
    
    new_func = '''function drawScoutingCategoryCharts(data){
  var taxEl=document.getElementById("sc-tax-rate");
  var taxRate=parseFloat((taxEl&&taxEl.value)||13)||0;
  var byProd={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var key=(d.product_name||"未命名").substring(0,12);
    if(!byProd[key])byProd[key]={count:0,prices:[],sellPrices:[],margins:[],commissions:[],moqs:[],channels:new Set()};
    byProd[key].count++;
    var pp=parseFloat(d.purchase_price)||0;
    var sp=parseFloat(d.selling_price)||0;
    if(pp>0)byProd[key].prices.push(pp);
    if(sp>0){byProd[key].sellPrices.push(sp);}
    // Post-tax margin: (selling/(1+taxRate/100) - purchase) / (selling/(1+taxRate/100)) * 100
    if(sp>0&&pp>0){
      var netPrice=sp/(1+taxRate/100);
      var margin=Math.round((netPrice-pp)/netPrice*100);
      byProd[key].margins.push(margin);
    }
    var cm=parseFloat(d.influencer_commission)||0;if(cm>0)byProd[key].commissions.push(cm);
    var mq=parseInt(d.moq)||0;if(mq>0)byProd[key].moqs.push(mq);
    if(d.channel)byProd[key].channels.add(d.channel);
  }
  var keys=Object.keys(byProd).sort();if(!keys.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0;}

  // Price comparison chart (grouped: purchase vs selling per product)
  var priceData=[];var pmax=0;
  for(var p=0;p<keys.length;p++){var prod=byProd[keys[p]];var avp=avg(prod.prices),avs=avg(prod.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:keys[p],groups:[{value:avp,color:"#e74c3c"},{value:avs,color:"#27ae60"}]});}
  drawGroupedBarChart("sc-price-chart",priceData,{maxValue:pmax,groupLabels:["平均采购价","平均销售价"],groupColors:["#e74c3c","#27ae60"],labelWidth:80});

  // Post-tax margin chart per product
  var marginData=[];var mxmax=0;
  for(var m0=0;m0<keys.length;m0++){var mv=avg(byProd[keys[m0]].margins);mxmax=Math.max(mxmax,Math.abs(mv));marginData.push({label:keys[m0],value:mv,color:mv>=0?"#27ae60":"#e74c3c"});}
  drawBarChart("sc-margin-chart",marginData,{maxValue:mxmax||10,valueFormatter:function(v){return v+"%"},labelWidth:80});

  // Commission chart per product
  var commData=[];var cmax=0;
  for(var c2=0;c2<keys.length;c2++){var cv=avg(byProd[keys[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:keys[c2],value:cv,color:"#e67e22"});}
  drawBarChart("sc-commission-chart",commData,{maxValue:cmax||10,valueFormatter:function(v){return v+"%"},labelWidth:80});

  // MOQ chart per product
  var moqData=[];var mmax=0;
  for(var m=0;m<keys.length;m++){var mqv=avg(byProd[keys[m]].moqs);mmax=Math.max(mmax,mqv);moqData.push({label:keys[m],value:mqv,color:"#8e44ad"});}
  drawBarChart("sc-moq-chart",moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+"件"},labelWidth:80});
}'''

    if old_func in c:
        c = c.replace(old_func, new_func)
        changes += 1
        print("  FIX: chart functions updated with tax rate margin calc")
    else:
        print("  FAIL: chart function not matched")
        print(f"    old_func first 100: {repr(old_func[:100])}")

# ====== FIX 4: Update compare table margin calc with tax rate ======
# Find the margin calculation in refreshScoutingCompare body
old_margin_calc = "var itSp=parseFloat(it.selling_price)||0,itPp=parseFloat(it.purchase_price)||0,itMargin=itSp>0?Math.round((itSp-itPp)/itSp*100):0;"
new_margin_calc = "var itSp=parseFloat(it.selling_price)||0,itPp=parseFloat(it.purchase_price)||0;var _taxEl=document.getElementById('sc-tax-rate');var _taxRate=parseFloat((_taxEl&&_taxEl.value)||13)||0;var itNetPrice=itSp>0?itSp/(1+_taxRate/100):0;var itMargin=itNetPrice>0?Math.round((itNetPrice-itPp)/itNetPrice*100):0;"

if old_margin_calc in c:
    c = c.replace(old_margin_calc, new_margin_calc)
    changes += 1
    print("  FIX: compare table margin uses tax rate")
else:
    print("  FAIL: margin calc not found in compare table")

# ====== FIX 5: Add price interval breakdown to summary cards for better supplier comparison ======
old_cards_start = "var total=filtered.length;"
new_cards_start = "var total=filtered.length;var supSet=new Set();for(var vi=0;vi<filtered.length;vi++){if(filtered[vi].supplier_name)supSet.add(filtered[vi].supplier_name.trim().toLowerCase());}var supplierCount=supSet.size;"

if old_cards_start in c:
    c = c.replace(old_cards_start, new_cards_start)
    # Also update the total card to show supplier count
    old_total_card = "匹配选品数</div>"
    new_total_card = "匹配选品数</div></div><div style=\"background:var(--card);border-radius:10px;padding:14px;text-align:center\"><div style=\"font-size:24px;font-weight:700;color:#e67e22\">'+supplierCount+'</div><div style=\"font-size:12px;color:var(--text-secondary);margin-top:4px\">🏭 涉及供应商</div>"
    if old_total_card in c:
        c = c.replace(old_total_card, new_total_card)
        changes += 1
        print("  FIX: summary cards add supplier count")
    else:
        print("  WARN: total card not found for supplier count")

# ====== FIX 6: Save tax rate to localStorage & restore ======
# Add to refreshScoutingCompare: save on change
# Find the function start and add restore at beginning
idx_rc = c.find("function refreshScoutingCompare(){")
if idx_rc > 0:
    rc_start = "function refreshScoutingCompare(){"
    rc_new_start = "function refreshScoutingCompare(){\n  // Restore saved tax rate\n  var _tr=document.getElementById('sc-tax-rate');if(_tr&&!_tr.dataset.loaded){var _saved=localStorage.getItem('sc_tax_rate');if(_saved!==null)_tr.value=_saved;_tr.dataset.loaded='1';\n    _tr.addEventListener('change',function(){localStorage.setItem('sc_tax_rate',this.value)});}"
    if rc_start in c:
        c = c.replace(rc_start, rc_new_start)
        changes += 1
        print("  FIX: tax rate localStorage persistence added")
    else:
        print("  FAIL: refreshScoutingCompare start not matched")

print(f"\nTotal changes: {changes}")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"File size: {size_kb:.1f} KB")
