#!/usr/bin/env python3
"""
选品调研大改：分类管理 + 分类筛选 + Canvas 分析图表
1. 工具栏 + 分类管理按钮 + 分类筛选下拉
2. 弹窗中 <input+datalist> → <select> + 管理面板
3. 分类管理函数 (localStorage)
4. renderScouting 分类筛选
5. refreshScoutingCompare 分类筛选 + Canvas 图表
6. openScoutingForm/editScouting 适配 select
"""
import os, re

base = r"D:\1kaifa\grsds"
with open(os.path.join(base, "index.html"), "r", encoding="utf-8") as f:
    c = f.read()

changes = []

def replace(old, new, label):
    global c
    if old in c:
        c = c.replace(old, new)
        changes.append(f"OK: {label}")
    else:
        changes.append(f"FAIL: {label}")
        # Try to show context
        idx = -1
        for i in range(0, len(old)):
            frag = old[:len(old)//2]
            if frag in c:
                idx = c.index(frag)
                break
        if idx >= 0:
            print(f"  Found partial at pos {idx}: ...{c[idx-20:idx+80]}...")

# ── 1. Toolbar: add category filter between status and flex spacer ──
old1 = '<select id="sc-filter-status" onchange="renderScouting()" style="width:100px"><option value="">全部状态</option><option value="pending">待评估</option><option value="approved">已通过</option><option value="rejected">已否决</option><option value="ordered">已采购</option></select>\n    <div style="flex:1"></div>'
new1 = '<select id="sc-filter-status" onchange="renderScouting()" style="width:100px"><option value="">全部状态</option><option value="pending">待评估</option><option value="approved">已通过</option><option value="rejected">已否决</option><option value="ordered">已采购</option></select>\n    <select id="sc-filter-category" onchange="renderScouting()" style="width:120px"><option value="">全部分类</option></select>\n    <button class="btn-xs" style="background:var(--surface);border:1px solid var(--border);color:var(--text);padding:4px 8px;border-radius:6px;cursor:pointer" onclick="toggleScCatManage()">📂 类别</button>\n    <div style="flex:1"></div>'
replace(old1, new1, "1. toolbar: +category filter +mgmt button")

# ── 2. Modal: category <input>+<datalist> → <select> + management panel ──
old2 = '<div class=\"form-group\"><label>\\u4ea7\\u54c1\\u5206\\u7c7b</label><input id=\"sc-product-category\" placeholder=\"\\u5982\\uff1a\\u7535\\u5b50\\u3001\\u670d\\u9970\" list=\"sc-cat-list\"><datalist id=\"sc-cat-list\"></datalist></div>'
new2 = '<div class=\"form-group\"><label>\\u4ea7\\u54c1\\u5206\\u7c7b <button class=\"btn-xs\" style=\"background:var(--surface);border:1px solid var(--border);color:var(--text);margin-left:4px;cursor:pointer;padding:2px 6px;border-radius:4px\" onclick=\"event.stopPropagation();toggleScCatManage()\" title=\"\\u7ba1\\u7406\\u5206\\u7c7b\">\\ud83d\\udcc2</button></label><select id=\"sc-product-category\"><option value=\"\">\\u9009\\u62e9\\u5206\\u7c7b</option></select><div id=\"sc-cat-manage\" class=\"hidden\" style=\"grid-column:1/-1;background:var(--surface);border-radius:8px;padding:10px\"><div style=\"font-size:12px;color:var(--text-secondary);margin-bottom:6px\">\\u5206\\u7c7b\\u7ba1\\u7406</div><div id=\"sc-cat-tags\" style=\"display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px\"></div><div style=\"display:flex;gap:6px\"><input id=\"sc-cat-new\" placeholder=\"\\u65b0\\u5206\\u7c7b\\u540d\\u79f0\" style=\"flex:1\" onkeydown=\"if(event.key===\\'Enter\\')addScCat()\"><button class=\"btn-sm\" style=\"background:var(--primary);color:#fff\" onclick=\"addScCat()\">\\u6dfb\\u52a0</button></div></div></div>'
replace(old2, new2, "2. modal: category select + manage panel")

# ── 3. Analytics section: replace charts row with canvas charts ──
old3 = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px" id="scouting-charts-row">\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">🏪 渠道分布</h4>\n      <div id="sc-channel-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n     </div>\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">📋 状态统计</h4>\n      <div id="sc-status-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n     </div>\n    </div>'
new3 = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-1">\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">🏪 渠道分布</h4>\n      <div id="sc-channel-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n     </div>\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">📋 状态统计</h4>\n      <div id="sc-status-chart" style="display:flex;flex-direction:column;gap:8px"></div>\n     </div>\n    </div>\n    <!-- Price & Commission Charts -->\n    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-2">\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">💰 价格对比分析（按分类）</h4>\n      <canvas id="sc-price-chart" style="width:100%;height:240px"></canvas>\n     </div>\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">📊 佣金分析（按分类）</h4>\n      <canvas id="sc-commission-chart" style="width:100%;height:240px"></canvas>\n     </div>\n    </div>\n    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" id="scouting-charts-row-3">\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">📦 MOQ 对比分析（按分类）</h4>\n      <canvas id="sc-moq-chart" style="width:100%;height:240px"></canvas>\n     </div>\n     <div style="background:var(--card);border-radius:12px;padding:16px">\n      <h4 style="margin:0 0 12px;font-size:14px">📈 分类产品数量分布</h4>\n      <canvas id="sc-category-chart" style="width:100%;height:240px"></canvas>\n     </div>\n    </div>'
replace(old3, new3, "3. chart area: +canvas charts")

# ── 4. renderScouting: add category filter + build filter dropdown ──
# Add fct variable after fst
old4 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';\n  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();"
new4 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';\n  var fct=(document.getElementById('sc-filter-category')||{}).value||'';\n  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();"
replace(old4, new4, "4a. renderScouting: add category filter var")

# Add filter check after fst
old4b = "    if(fst&&s.status!==fst)continue;\n    filtered.push(s);"
new4b = "    if(fst&&s.status!==fst)continue;\n    if(fct&&s.product_category!==fct)continue;\n    filtered.push(s);"
replace(old4b, new4b, "4b. renderScouting: add category filter condition")

# Build category filter dropdown in renderScouting (after channel filter build)
old4c = "  // Update channel filter dropdown\n  var chSel=document.getElementById('sc-filter-channel');"
new4c = "  // Update category filter dropdown\n  var ctSel=document.getElementById('sc-filter-category');\n  if(ctSel){\n    var cts={},ctprev=ctSel.value;\n    for(var cti=0;cti<allScouting.length;cti++){var ct2=allScouting[cti].product_category;if(ct2&&!cts[ct2])cts[ct2]=1;}\n    var ctOpt='<option value=\"\">全部分类</option>';\n    var ctKeys=Object.keys(cts).sort();\n    for(var ctk=0;ctk<ctKeys.length;ctk++)ctOpt+='<option value=\"'+escHtml(ctKeys[ctk])+'\">'+escHtml(ctKeys[ctk])+'</option>';\n    ctSel.innerHTML=ctOpt;ctSel.value=ctprev;\n  }\n  // Update channel filter dropdown\n  var chSel=document.getElementById('sc-filter-channel');"
replace(old4c, new4c, "4c. renderScouting: build category filter dropdown")

# ── 5. refreshScoutingCompare: add category filter + canvas charts ──
old5 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';\n  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();\n  var filtered=[];\n  for(var i=0;i<allScouting.length;i++){\n    var s=allScouting[i];\n    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;\n    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;\n    if(fc&&s.channel!==fc)continue;\n    if(fst&&s.status!==fst)continue;\n    filtered.push(s);\n  }\n  // ====== Summary Cards ======"
new5 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';\n  var fct=(document.getElementById('sc-filter-category')||{}).value||'';\n  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();\n  var filtered=[];\n  for(var i=0;i<allScouting.length;i++){\n    var s=allScouting[i];\n    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;\n    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;\n    if(fc&&s.channel!==fc)continue;\n    if(fst&&s.status!==fst)continue;\n    if(fct&&s.product_category!==fct)continue;\n    filtered.push(s);\n  }\n  // ====== Summary Cards ======"
replace(old5, new5, "5. refreshScoutingCompare: add category filter")

# ── 6. After channel+status charts, add canvas chart drawing ──
# Find the compare table section end and insert canvas drawing before it
old6 = "  // ====== Compare Table ======\n  if(!filtered.length){head.innerHTML='';body.innerHTML='<tr><td style=\"text-align:center;padding:24px;color:var(--text-secondary)\">\\u6682\\u65e0\\u9009\\u54c1\\u53ef\\u5bf9\\u6bd4</td></tr>';return;}"
new6 = "  // ====== Canvas Charts ======\n  drawScoutingCategoryCharts(filtered);\n  // ====== Compare Table ======\n  if(!filtered.length){head.innerHTML='';body.innerHTML='<tr><td style=\"text-align:center;padding:24px;color:var(--text-secondary)\">\\u6682\\u65e0\\u9009\\u54c1\\u53ef\\u5bf9\\u6bd4</td></tr>';return;}"
replace(old6, new6, "6. add canvas chart drawing call")

# ── 7. Add canvas chart functions before the Category section ──
old7 = "// === Company Directory Cascade Sync ==="
new7 = """// === Category Management (LocalStorage) ===
var scoutingCategories=[];
function initScoutingCategories(){
  try{scoutingCategories=JSON.parse(localStorage.getItem('custom_scouting_cats')||'[]')}catch(e){scoutingCategories=[]}
}
function saveScoutingCategories(){
  localStorage.setItem('custom_scouting_cats',JSON.stringify(scoutingCategories));
}
function toggleScCatManage(){
  var panel=document.getElementById('sc-cat-manage');
  if(!panel)return;
  panel.classList.toggle('hidden');
  if(!panel.classList.contains('hidden'))renderScCatTags();
}
function renderScCatTags(){
  initScoutingCategories();
  var el=document.getElementById('sc-cat-tags');if(!el)return;
  if(!scoutingCategories.length){el.innerHTML='<span style="font-size:12px;color:var(--text-secondary)">暂无自定义分类</span>';return;}
  var h='';
  for(var i=0;i<scoutingCategories.length;i++){
    h+='<span style="display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:12px">'+escHtml(scoutingCategories[i])+' <span style="cursor:pointer;color:var(--danger);font-weight:700" onclick="removeScCat('+i+')">×</span></span>';
  }
  el.innerHTML=h;
}
function addScCat(){
  var input=document.getElementById('sc-cat-new');if(!input)return;
  var name=input.value.trim();if(!name)return;
  initScoutingCategories();
  if(scoutingCategories.indexOf(name)<0)scoutingCategories.push(name);
  scoutingCategories.sort();
  saveScoutingCategories();
  input.value='';
  renderScCatTags();
  buildScCatDropdowns();
}
function removeScCat(idx){
  initScoutingCategories();
  scoutingCategories.splice(idx,1);
  saveScoutingCategories();
  renderScCatTags();
  buildScCatDropdowns();
}
function buildScCatDropdowns(){
  // Build product-category select options
  var sel=document.getElementById('sc-product-category');if(!sel)return;
  initScoutingCategories();
  var existing=new Set();
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2)existing.add(c2);}
  // Merge: custom cats + existing from data
  var merged=[];
  for(var j=0;j<scoutingCategories.length;j++){if(!existing.has(scoutingCategories[j]))existing.add(scoutingCategories[j])}
  var sorted=Array.from(existing).sort();
  var prev=sel.value;
  sel.innerHTML='<option value="">选择分类</option>';
  for(var k=0;k<sorted.length;k++)sel.innerHTML+='<option value="'+escHtml(sorted[k])+'">'+escHtml(sorted[k])+'</option>';
  sel.value=prev;
}

// === Canvas Chart Helpers ===
function drawBarChart(canvasId, data, config){
  // data: [{label,value,color}], config: {maxValue, title}
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();
  var w=rect.width, h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;
  cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var barH=Math.min(32, Math.max(18, (h-20)/data.length));
  var gap=4, totalH=barH*data.length, startY=Math.max(0,(h-totalH)/2);
  var maxV=config&&config.maxValue?config.maxValue:0;
  for(var i=0;i<data.length;i++){if(data[i].value>maxV)maxV=data[i].value;}
  if(maxV===0)maxV=1;
  var barX=config&&config.labelWidth||80, barW=w-barX-60;
  ctx.font='12px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var y=startY+d*barH;
    var pct=Math.min(1,data[d].value/maxV);
    var bw=barW*pct;
    // Label
    ctx.fillStyle='#666';ctx.textBaseline='middle';
    var lbl=data[d].label.length>8?data[d].label.substring(0,7)+'…':data[d].label;
    ctx.fillText(lbl,barX-6,y+barH/2);
    // Bar
    ctx.fillStyle=data[d].color||'#4a90d9';
    ctx.beginPath();ctx.roundRect(barX,y,bw,barH-gap,4);ctx.fill();
    // Value
    ctx.fillStyle='#333';ctx.textAlign='left';
    var vText=config&&config.valueFormatter?config.valueFormatter(data[d].value):String(data[d].value);
    ctx.fillText(vText,barX+bw+6,y+barH/2);
  }
}

function drawGroupedBarChart(canvasId, data, config){
  // data: [{label, groups:[{value,color,label}]}]
  // config: {maxValue, groupLabels, groupColors}
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();
  var w=rect.width, h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;
  cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var groups=data[0].groups?data[0].groups.length:1;
  var barH=Math.min(28, Math.max(20,(h-40)/data.length/groups));
  var totalH=barH*data.length*groups;var startY=Math.max(10,(h-totalH)/2);
  var maxV=config&&config.maxValue?config.maxValue:0;
  for(var i=0;i<data.length;i++){
    for(var j=0;j<data[i].groups.length;j++){
      if(data[i].groups[j].value>maxV)maxV=data[i].groups[j].value;
    }
  }
  if(maxV===0)maxV=1;
  var gclr=config&&config.groupColors?config.groupColors:['#4a90d9','#e74c3c','#27ae60','#f39c12'];
  var lblW=config&&config.labelWidth||80, barArea=w-lblW-50;
  // Legend
  if(config&&config.groupLabels){
    ctx.font='10px sans-serif';ctx.textAlign='left';
    var lx=lblW,ly=startY-6;
    for(var gl=0;gl<config.groupLabels.length;gl++){
      ctx.fillStyle=gclr[gl]||'#666';
      ctx.fillRect(lx,ly-10,10,10);
      ctx.fillStyle='#666';ctx.fillText(config.groupLabels[gl],lx+14,ly-1);
      lx+=ctx.measureText(config.groupLabels[gl]).width+30;
    }
    startY+=8;
  }
  var gap=2;
  ctx.font='11px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var label=data[d].label;
    var grps=data[d].groups;
    for(var g=0;g<grps.length;g++){
      var y=startY+d*barH*groups+g*barH/groups;
      var pct=Math.min(1,grps[g].value/maxV);
      var bw=(barArea/groups)*pct;var bx=lblW+g*(barArea/groups);
      // Category label (only on first group)
      if(g===0){ctx.fillStyle='#666';ctx.textBaseline='middle';var clbl=label.length>8?label.substring(0,7)+'…':label;ctx.fillText(clbl,lblW-6,y+barH/3);}
      ctx.fillStyle=gclr[g]||'#4a90d9';
      ctx.beginPath();ctx.roundRect(bx,y,bw,(barH/groups)-gap,3);ctx.fill();
      if(bw>18){
        ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='9px sans-serif';
        ctx.fillText(grps[g].value,bx+3,y+barH/(groups*2)+3);
      }
    }
  }
}

function drawScoutingCategoryCharts(data){
  // Group by category
  var byCat={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var cat=d.product_category||'未分类';
    if(!byCat[cat])byCat[cat]={count:0,prices:[],sellPrices:[],commissions:[],moqs:[]};
    byCat[cat].count++;
    var pp=parseFloat(d.purchase_price)||0;if(pp>0)byCat[cat].prices.push(pp);
    var sp=parseFloat(d.selling_price)||0;if(sp>0)byCat[cat].sellPrices.push(sp);
    var cm=parseFloat(d.influencer_commission)||0;if(cm>0)byCat[cat].commissions.push(cm);
    var mq=parseInt(d.moq)||0;if(mq>0)byCat[cat].moqs.push(mq);
  }
  var cats=Object.keys(byCat).sort();
  if(!cats.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0}
  function maxV(arr){return arr.length?Math.max.apply(null,arr):0}

  // 1. Price comparison (grouped: avg purchase vs avg selling)
  var priceData=[];
  for(var p=0;p<cats.length;p++){
    var pcat=byCat[cats[p]];
    priceData.push({label:cats[p],groups:[
      {value:avg(pcat.prices),color:'#4a90d9'},
      {value:avg(pcat.sellPrices),color:'#27ae60'}
    ]});
  }
  var pmax=0;for(var pd=0;pd<priceData.length;pd++){pmax=Math.max(pmax,Math.max(priceData[pd].groups[0].value,priceData[pd].groups[1].value))}
  drawGroupedBarChart('sc-price-chart',priceData,{maxValue:pmax,groupLabels:['平均采购价','平均销售价'],groupColors:['#4a90d9','#27ae60'],labelWidth:80});

  // 2. Commission analysis (avg % per category)
  var commData=[];
  for(var c=0;c<cats.length;c++){var ccat=byCat[cats[c]];commData.push({label:cats[c],value:avg(ccat.commissions),color:'#e67e22'});}
  var cmax=0;for(var cd=0;cd<commData.length;cd++){if(commData[cd].value>cmax)cmax=commData[cd].value;}
  drawBarChart('sc-commission-chart',commData,{maxValue:cmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  // 3. MOQ comparison (avg per category)
  var moqData=[];
  for(var m=0;m<cats.length;m++){var mcat=byCat[cats[m]];moqData.push({label:cats[m],value:avg(mcat.moqs),color:'#8e44ad'});}
  var mmax=0;for(var md=0;md<moqData.length;md++){if(moqData[md].value>mmax)mmax=moqData[md].value;}
  drawBarChart('sc-moq-chart',moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+'件'},labelWidth:80});

  // 4. Category count distribution
  var cntData=[];
  for(var n=0;n<cats.length;n++)cntData.push({label:cats[n],value:byCat[cats[n]].count,color:'#3498db'});
  var cntMax=0;for(var nd=0;nd<cntData.length;nd++){if(cntData[nd].value>cntMax)cntMax=cntData[nd].value;}
  drawBarChart('sc-category-chart',cntData,{maxValue:cntMax,labelWidth:80});
}

// === Company Directory Cascade Sync ==="""
replace(old7, new7, "7. canvas chart functions + category mgmt")

# ── 8. openScoutingForm: use select instead of datalist ──
old8 = "  updateScoutingDatalists();\n  document.getElementById('scouting-modal').classList.remove('hidden');\n  // Update categories datalist\n  var cats=[];\n  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}\n  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value=\"'+escHtml(x)+'\">'}).join('');"
new8 = "  updateScoutingDatalists();\n  buildScCatDropdowns();\n  document.getElementById('scouting-modal').classList.remove('hidden');"
replace(old8, new8, "8a. openScoutingForm: build dropdowns")

# ── 9. editScouting: use select instead of datalist ──
old9 = "  updateScoutingDatalists();\n  // Categories\n  var cats=[];\n  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}\n  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value=\"'+escHtml(x)+'\">'}).join('');\n  document.getElementById('scouting-modal').classList.remove('hidden');"
new9 = "  updateScoutingDatalists();\n  buildScCatDropdowns();\n  document.getElementById('sc-product-category').value=s.product_category||'';\n  document.getElementById('scouting-modal').classList.remove('hidden');"
replace(old9, new9, "9. editScouting: build dropdowns + set value")

# ── 10. updateScoutingDatalists: also build category dropdown ──
# Find the function
old10 = "  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value=\"'+escHtml(x)+'\">'}).join('');\n}\n\nasync function approveScouting(id){"
# This might appear multiple times, look for it in the updateScoutingDatalists context
if old10 in c:
    # Check if there's a second occurrence (the one in updateScoutingDatalists)
    # Actually, this pattern was already removed from openScoutingForm and editScouting
    # It may still appear in the updateScouting... functions
    # Let's check
    pass
# Actually the openScoutingForm and editScouting no longer have this pattern after edits 8 & 9
# Let me find updateScoutingDatalists function
old10b = "function updateScoutingDatalists(){"
if old10b in c:
    # Find its body and replace
    idx10 = c.index(old10b)
    # Find the closing of this function (next function or end of block)
    # Look for the end
    end10 = c.index("}\n\nasync function approveScouting", idx10)
    old_fn = c[idx10:end10+1]
    new_fn = """function updateScoutingDatalists(){
  var cats=[];
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value="'+escHtml(x)+'">'}).join('');
  buildScCatDropdowns();
}"""
    c = c[:idx10] + new_fn + c[end10+1:]
    changes.append("10. updateScoutingDatalists: +buildScCatDropdowns OK")
else:
    changes.append("10. FAILED updateScoutingDatalists not found")

with open(os.path.join(base, "index.html"), "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
