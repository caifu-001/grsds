#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""选品调研 JS 改造: 分类筛选 + Canvas 图表"""
import os

base = r"D:\1kaifa\grsds"
path = os.path.join(base, "index.html")
with open(path, "r", encoding="utf-8-sig") as f:
    c = f.read()

# Normalize line endings for matching
c_norm = c.replace('\r\n', '\n')
changed = False

def repl(old, new, label):
    global c, c_norm, changed
    old_norm = old.replace('\r\n', '\n')
    if old_norm in c_norm:
        c_norm = c_norm.replace(old_norm, new)
        c = c_norm  # keep using normalized for subsequent ops
        changed = True
        print("OK:", label)
    else:
        # Show partial context
        frag = old_norm[:40]
        if frag in c_norm:
            idx = c_norm.index(frag)
            ctx = c_norm[max(0,idx-20):idx+120]
            print("FAIL:", label, "| partial match:", repr(ctx[:80]))
        else:
            print("FAIL:", label, "| not found")
    return changed

# 4a. renderScouting: add fct var after fst, before fp assignment
repl(
    """  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];""",
    """  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];""",
    "4a. renderScouting fct var"
)

# 4b. renderScouting: add category filter
repl(
    """    if(fst&&s.status!==fst)continue;
    filtered.push(s);""",
    """    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);""",
    "4b. renderScouting fct condition"
)

# 4c. renderScouting: build category filter dropdown
repl(
    """  // Update channel filter dropdown
  var chSel=document.getElementById('sc-filter-channel');""",
    """  // Update category filter dropdown
  var ctSel=document.getElementById('sc-filter-category');
  if(ctSel){
    var cts={},ctprev=ctSel.value;
    for(var cti=0;cti<allScouting.length;cti++){var ct2=allScouting[cti].product_category;if(ct2&&!cts[ct2])cts[ct2]=1;}
    var ctOpt='<option value=\"\">全部分类</option>';
    var ctKeys=Object.keys(cts).sort();
    for(var ctk=0;ctk<ctKeys.length;ctk++)ctOpt+='<option value=\"'+escHtml(ctKeys[ctk])+'\">'+escHtml(ctKeys[ctk])+'</option>';
    ctSel.innerHTML=ctOpt;ctSel.value=ctprev;
  }
  // Update channel filter dropdown
  var chSel=document.getElementById('sc-filter-channel');""",
    "4c. category filter dropdown"
)

# 5. refreshScoutingCompare: add category filter
repl(
    """  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    filtered.push(s);
  }
  // ====== Summary Cards ======""",
    """  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);
  }
  // ====== Summary Cards ======""",
    "5. refreshScoutingCompare category filter"
)

# 6. Add canvas chart drawing call before compare table
repl(
    """  // ====== Compare Table ======
  if(!filtered.length){head.innerHTML='';body.innerHTML='<tr><td style=\"text-align:center;padding:24px;color:var(--text-secondary)\">\u6682\u65e0\u9009\u54c1\u53ef\u5bf9\u6bd4</td></tr>';return;}""",
    """  // ====== Canvas Charts ======
  drawScoutingCategoryCharts(filtered);
  // ====== Compare Table ======
  if(!filtered.length){head.innerHTML='';body.innerHTML='<tr><td style=\"text-align:center;padding:24px;color:var(--text-secondary)\">\u6682\u65e0\u9009\u54c1\u53ef\u5bf9\u6bd4</td></tr>';return;}""",
    "6. canvas chart drawing call"
)

# 7. Add canvas chart functions + category management before Company Directory Cascade Sync
canvas_code = """// === Canvas Chart Helpers ===
function initScCat(){
  try{scoutingCategories=JSON.parse(localStorage.getItem('custom_scouting_cats')||'[]')}catch(e){scoutingCategories=[]}
}
function saveScCat(){localStorage.setItem('custom_scouting_cats',JSON.stringify(scoutingCategories));}
function toggleScCatManage(){
  var panel=document.getElementById('sc-cat-manage');if(!panel)return;
  panel.classList.toggle('hidden');if(!panel.classList.contains('hidden'))renderScCatTags();
}
function renderScCatTags(){
  initScCat();var el=document.getElementById('sc-cat-tags');if(!el)return;
  if(!scoutingCategories.length){el.innerHTML='<span style="font-size:12px;color:var(--text-secondary)">暂无自定义分类</span>';return;}
  var h='';
  for(var i=0;i<scoutingCategories.length;i++)h+='<span style="display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:12px">'+escHtml(scoutingCategories[i])+' <span style="cursor:pointer;color:var(--danger);font-weight:700" onclick="removeScCat('+i+')">\\u00d7</span></span>';
  el.innerHTML=h;
}
function addScCat(){
  var input=document.getElementById('sc-cat-new');if(!input)return;
  var name=input.value.trim();if(!name)return;
  initScCat();if(scoutingCategories.indexOf(name)<0)scoutingCategories.push(name);
  scoutingCategories.sort();saveScCat();input.value='';renderScCatTags();buildScCatDropdowns();
}
function removeScCat(idx){initScCat();scoutingCategories.splice(idx,1);saveScCat();renderScCatTags();buildScCatDropdowns();}
function buildScCatDropdowns(){
  var sel=document.getElementById('sc-product-category');if(!sel)return;
  initScCat();var existing={};
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2)existing[c2]=1;}
  for(var j=0;j<scoutingCategories.length;j++){if(!existing[scoutingCategories[j]])existing[scoutingCategories[j]]=1;}
  var sorted=Object.keys(existing).sort();
  var prev=sel.value;sel.innerHTML='<option value="">选择分类</option>';
  for(var k=0;k<sorted.length;k++)sel.innerHTML+='<option value="'+escHtml(sorted[k])+'">'+escHtml(sorted[k])+'</option>';
  sel.value=prev;
}
function buildScCatFilterDropdown(){
  var sel=document.getElementById('sc-filter-category');if(!sel)return;
  initScCat();var existing={};
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2)existing[c2]=1;}
  var sorted=Object.keys(existing).sort();
  var prev=sel.value;sel.innerHTML='<option value="">全部分类</option>';
  for(var k=0;k<sorted.length;k++)sel.innerHTML+='<option value="'+escHtml(sorted[k])+'">'+escHtml(sorted[k])+'</option>';
  sel.value=prev;
}

function drawBarChart(canvasId,data,cfg){
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();var w=rect.width,h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var barH=Math.min(32,Math.max(18,(h-20)/data.length)),gap=4,totalH=barH*data.length,startY=Math.max(0,(h-totalH)/2);
  var maxV=cfg&&cfg.maxValue?cfg.maxValue:0;
  for(var i=0;i<data.length;i++){if(data[i].value>maxV)maxV=data[i].value;}
  if(maxV===0)maxV=1;
  var barX=cfg&&cfg.labelWidth||80,barW=w-barX-60;
  ctx.font='12px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var y=startY+d*barH,pct=Math.min(1,data[d].value/maxV),bw=barW*pct;
    ctx.fillStyle='#666';ctx.textBaseline='middle';
    var lbl=data[d].label.length>8?data[d].label.substring(0,7)+'\\u2026':data[d].label;
    ctx.fillText(lbl,barX-6,y+barH/2);
    ctx.fillStyle=data[d].color||'#4a90d9';
    ctx.beginPath();ctx.roundRect(barX,y,bw,barH-gap,4);ctx.fill();
    ctx.fillStyle='#333';ctx.textAlign='left';
    var vText=cfg&&cfg.valueFormatter?cfg.valueFormatter(data[d].value):String(data[d].value);
    ctx.fillText(vText,barX+bw+6,y+barH/2);
  }
}

function drawGroupedBarChart(canvasId,data,cfg){
  var cvs=document.getElementById(canvasId);if(!cvs)return;
  var ctx=cvs.getContext('2d');var dpr=window.devicePixelRatio||1;
  var rect=cvs.getBoundingClientRect();var w=rect.width,h=cvs.height||240;
  cvs.width=w*dpr;cvs.height=h*dpr;cvs.style.width=w+'px';cvs.style.height=h+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!data.length){ctx.fillStyle='#999';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('暂无数据',w/2,h/2);return;}
  var groups=data[0].groups?data[0].groups.length:1;
  var barH=Math.min(28,Math.max(20,(h-40)/data.length/groups)),totalH=barH*data.length*groups,startY=Math.max(10,(h-totalH)/2);
  var maxV=cfg&&cfg.maxValue?cfg.maxValue:0;
  for(var i=0;i<data.length;i++){for(var j=0;j<data[i].groups.length;j++){if(data[i].groups[j].value>maxV)maxV=data[i].groups[j].value;}}
  if(maxV===0)maxV=1;
  var gclr=cfg&&cfg.groupColors?cfg.groupColors:['#4a90d9','#e74c3c','#27ae60','#f39c12'];
  var lblW=cfg&&cfg.labelWidth||80,barArea=w-lblW-50;
  if(cfg&&cfg.groupLabels){
    ctx.font='10px sans-serif';ctx.textAlign='left';var lx=lblW,ly=startY-6;
    for(var gl=0;gl<cfg.groupLabels.length;gl++){
      ctx.fillStyle=gclr[gl]||'#666';ctx.fillRect(lx,ly-10,10,10);
      ctx.fillStyle='#666';ctx.fillText(cfg.groupLabels[gl],lx+14,ly-1);
      lx+=ctx.measureText(cfg.groupLabels[gl]).width+30;
    }
    startY+=8;
  }
  var gap=2;ctx.font='11px sans-serif';ctx.textAlign='right';
  for(var d=0;d<data.length;d++){
    var label=data[d].label,grps=data[d].groups;
    for(var g=0;g<grps.length;g++){
      var y=startY+d*barH*groups+g*barH/groups,pct=Math.min(1,grps[g].value/maxV),bw=(barArea/groups)*pct,bx=lblW+g*(barArea/groups);
      if(g===0){ctx.fillStyle='#666';ctx.textBaseline='middle';var clbl=label.length>8?label.substring(0,7)+'\\u2026':label;ctx.fillText(clbl,lblW-6,y+barH/3);}
      ctx.fillStyle=gclr[g]||'#4a90d9';
      ctx.beginPath();ctx.roundRect(bx,y,bw,(barH/groups)-gap,3);ctx.fill();
      if(bw>18){ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='9px sans-serif';ctx.fillText(grps[g].value,bx+3,y+barH/(groups*2)+3);}
    }
  }
}

function drawScoutingCategoryCharts(data){
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
  var cats=Object.keys(byCat).sort();if(!cats.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0;}

  var priceData=[];var pmax=0;
  for(var p=0;p<cats.length;p++){var pcat=byCat[cats[p]];var avp=avg(pcat.prices),avs=avg(pcat.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:cats[p],groups:[{value:avp,color:'#4a90d9'},{value:avs,color:'#27ae60'}]});}
  drawGroupedBarChart('sc-price-chart',priceData,{maxValue:pmax,groupLabels:['平均采购价','平均销售价'],groupColors:['#4a90d9','#27ae60'],labelWidth:80});

  var commData=[];var cmax=0;
  for(var c2=0;c2<cats.length;c2++){var cv=avg(byCat[cats[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:cats[c2],value:cv,color:'#e67e22'});}
  drawBarChart('sc-commission-chart',commData,{maxValue:cmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  var moqData=[];var mmax=0;
  for(var m=0;m<cats.length;m++){var mv=avg(byCat[cats[m]].moqs);mmax=Math.max(mmax,mv);moqData.push({label:cats[m],value:mv,color:'#8e44ad'});}
  drawBarChart('sc-moq-chart',moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+'件'},labelWidth:80});

  var cntData=[];var cntMax=0;
  for(var n=0;n<cats.length;n++){cntMax=Math.max(cntMax,byCat[cats[n]].count);cntData.push({label:cats[n],value:byCat[cats[n]].count,color:'#3498db'});}
  drawBarChart('sc-category-chart',cntData,{maxValue:cntMax,labelWidth:80});
}

// === Company Directory Cascade Sync ==="""

repl("// === Company Directory Cascade Sync ===", canvas_code, "7. canvas + category mgmt functions")

# 8. openScoutingForm: remove datalist populate, add buildScCatDropdowns
repl(
    """  updateScoutingDatalists();
  document.getElementById('scouting-modal').classList.remove('hidden');
  // Update categories datalist
  var cats=[];
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value=\"'+escHtml(x)+'\">'}).join('');""",
    """  updateScoutingDatalists();
  buildScCatDropdowns();
  buildScCatFilterDropdown();
  document.getElementById('scouting-modal').classList.remove('hidden');""",
    "8. openScoutingForm dropdowns"
)

# 9. editScouting: remove datalist populate
repl(
    """  updateScoutingDatalists();
  // Categories
  var cats=[];
  for(var i=0;i<allScouting.length;i++){var c2=allScouting[i].product_category;if(c2&&cats.indexOf(c2)<0)cats.push(c2);}
  document.getElementById('sc-cat-list').innerHTML=cats.map(function(x){return '<option value=\"'+escHtml(x)+'\">'}).join('');
  document.getElementById('scouting-modal').classList.remove('hidden');""",
    """  updateScoutingDatalists();
  buildScCatDropdowns();
  buildScCatFilterDropdown();
  document.getElementById('sc-product-category').value=s.product_category||'';
  document.getElementById('scouting-modal').classList.remove('hidden');""",
    "9. editScouting dropdowns + set value"
)

# 10. Add buildScCatFilterDropdown call in loadScouting
repl(
    """  allScouting=r.data||[];
  renderScouting();
  refreshScoutingCompare();""",
    """  allScouting=r.data||[];
  renderScouting();
  refreshScoutingCompare();
  buildScCatFilterDropdown();""",
    "10. loadScouting build filter dropdown"
)

# Write back with BOM and CRLF
out = c_norm.replace('\n', '\r\n')
with open(path, "w", encoding="utf-8-sig", newline='') as f:
    f.write(out)

print("=== All done ===")
