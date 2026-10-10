// ==========================================================================
// grsds · 07-orders.js  —  金额加密 · 订单状态 · Tab 切换 · 汇总 · 订单表单
// 源: js/app_v2.js 第 2610-4171 行（机械切片，未改一行代码）
// ==========================================================================
// === Crypto helpers (AES-GCM for amount encryption) ===
var _cryptoKey=null;
async function getCryptoKey(){
  if(_cryptoKey)return _cryptoKey;
  try{
    var enc=new TextEncoder();
    var km=await crypto.subtle.importKey('raw',enc.encode((currentUser?currentUser.id:'default')+'-crm-order-key-2026'),'PBKDF2',false,['deriveKey']);
    _cryptoKey=await crypto.subtle.deriveKey({name:'PBKDF2',salt:enc.encode('order-amount-salt'),iterations:100000,hash:'SHA-256'},km,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }catch(e){_cryptoKey=null}
  return _cryptoKey;
}
async function encryptAmount(amountStr){
  try{
    var key=await getCryptoKey();if(!key)return amountStr;
    var iv=crypto.getRandomValues(new Uint8Array(12));
    var ct=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,new TextEncoder().encode(amountStr));
    var combined=new Uint8Array(iv.length+ct.byteLength);
    combined.set(iv);combined.set(new Uint8Array(ct),iv.length);
    var bin='';for(var i=0;i<combined.length;i++)bin+=String.fromCharCode(combined[i]);
    return btoa(bin);
  }catch(e){console.error('encrypt error:',e);return amountStr}
}
async function decryptAmount(encStr){
  try{
    if(!encStr||encStr.indexOf('.')>=0)return encStr;
    var key=await getCryptoKey();if(!key)return encStr;
    var bin=atob(encStr);var data=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)data[i]=bin.charCodeAt(i);
    var iv=data.slice(0,12),ct=data.slice(12);
    var dec=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,ct);
    return new TextDecoder().decode(dec);
  }catch(e){return encStr}
}

// === Order State ===
var allOrders=[],orderEditId=null,orderDeleteId=null;
var orderStage='谈判中',orderClientId=null,orderClientName='';
var ORDER_STAGES=['谈判中','已签约','执行中','已完成','已取消'];

function stageClass(stage){
  switch(stage){
    case '已签约':return 'stage-signed';
    case '执行中':return 'stage-executing';
    case '已完成':return 'stage-completed';
    case '已取消':return 'stage-cancelled';
    default:return 'stage-negotiating';
  }
}

function stageColor(stage){
  switch(stage){
    case '谈判中':return '#F59E0B';
    case '已签约':return '#3B82F6';
    case '执行中':return '#10B981';
    case '已完成':return '#8B5CF6';
    case '已取消':return '#EF4444';
    default:return '#999';
  }
}

// === Tab Switching ===

// ============================================================
// DASHBOARD CHARTS (Chart.js)
// ============================================================
var _chartInstances={};
function _destroyChart(key){
  if(_chartInstances[key]){_chartInstances[key].destroy();_chartInstances[key]=null;}
}
function _destroyAllCharts(){
  for(var k in _chartInstances){_destroyChart(k);}
}

async function renderDashboardCharts(){
  try{
    var now=new Date();
    var thisMonth=now.getMonth();
    var thisYear=now.getFullYear();
    
    // ── 1. Revenue Trend (6-month line) ──
    var months=[];
    for(var i=5;i>=0;i--){
      var d=new Date(thisYear,thisMonth-i,1);
      months.push({year:d.getFullYear(),month:d.getMonth()+1,label:d.getMonth()+1+'月'});
    }
    var revData=[];
    for(var ri=0;ri<months.length;ri++){
      var mStart=new Date(months[ri].year,months[ri].month-1,1).toISOString();
      var mEnd=new Date(months[ri].year,months[ri].month,0,23,59,59).toISOString();
      var r=await sb.from('orders').select('amount')
        .eq('company_id',currentCompanyId)
        .gte('created_at',mStart).lte('created_at',mEnd).not('stage','eq','已取消');
      var sum=0;
      if(r.data)for(var j=0;j<r.data.length;j++)sum+=parseFloat(r.data[j].amount)||0;
      revData.push(sum);
    }
    _destroyChart('revenue');
    var ctx1=document.getElementById('chart-revenue-trend');
    if(ctx1){
      _chartInstances.revenue=new Chart(ctx1,{
        type:'line',
        data:{labels:months.map(function(m){return m.label}),
          datasets:[{label:'销售额',data:revData,borderColor:'#4F6EF7',backgroundColor:'rgba(79,110,247,0.08)',fill:true,tension:0.35,pointRadius:4,pointBackgroundColor:'#4F6EF7'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':v>=1000?'¥'+(v/1000).toFixed(1)+'k':'¥'+v}}}}}});
    }

    // ── 2. Lead Distribution (horizontal bar) ──
    var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
    var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
    var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
    var leadCounts=[];
    for(var si=0;si<stages.length;si++){
      var lr=await sb.from('lead_pool').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('status',stages[si]);
      leadCounts.push(lr.count||0);
    }
    _destroyChart('leadFunnel');
    var ctx2=document.getElementById('chart-lead-funnel');
    if(ctx2){
      _chartInstances.leadFunnel=new Chart(ctx2,{
        type:'bar',
        data:{labels:stageLabels,datasets:[{label:'数量',data:leadCounts,backgroundColor:stageColors,borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{ticks:{stepSize:1}}}}});
    }

    // ── 3. Client Type Distribution (doughnut) ──
    var cr=await sb.from('clients').select('type').eq('company_id',currentCompanyId);
    var typeMap={};
    if(cr.data)for(var ci=0;ci<cr.data.length;ci++){var tp=cr.data[ci].type||'未分类';typeMap[tp]=(typeMap[tp]||0)+1}
    var typeLabels=Object.keys(typeMap);
    var typeValues=typeLabels.map(function(t){return typeMap[t]});
    _destroyChart('clientTypes');
    var ctx3=document.getElementById('chart-client-types');
    if(ctx3){
      _chartInstances.clientTypes=new Chart(ctx3,{
        type:'doughnut',
        data:{labels:typeLabels,datasets:[{data:typeValues,
          backgroundColor:['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1']}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}});
    }

    // ── 4. Performance Comparison (this month) ──
    // Load targets if not already loaded
    if(!allTargets||!allTargets.length){
      try{var tq=await sb.from('sales_targets').select('*').eq('company_id',currentCompanyId).eq('target_year',thisYear);allTargets=tq.data||[];}catch(ee){allTargets=[];}
    }
    var pmStart=new Date(thisYear,thisMonth,1).toISOString();
    var pmEnd=new Date(thisYear,thisMonth+1,0,23,59,59).toISOString();
    var pr=await sb.from('orders').select('amount').eq('company_id',currentCompanyId).gte('created_at',pmStart).lte('created_at',pmEnd).not('stage','eq','已取消');
    var actualTotal=0;
    if(pr.data)for(var pi=0;pi<pr.data.length;pi++)actualTotal+=parseFloat(pr.data[pi].amount)||0;
    var targetTotal2=0;
    for(var ti=0;ti<(allTargets||[]).length;ti++){
      var tt=allTargets[ti];
      if(tt.target_year===thisYear&&tt.target_month===thisMonth+1)targetTotal2+=parseFloat(tt.amount)||0;
    }
    _destroyChart('perfCompare');
    var ctx4=document.getElementById('chart-perf-compare');
    if(ctx4){
      _chartInstances.perfCompare=new Chart(ctx4,{
        type:'bar',
        data:{labels:['实际业绩','目标业绩'],datasets:[{data:[actualTotal,targetTotal2],
          backgroundColor:['#4F6EF7','rgba(79,110,247,0.2)'],borderColor:['#4F6EF7','#4F6EF7'],borderWidth:1,borderRadius:6}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }

    // ── 5. Order Status Distribution (doughnut) ──
    var thisMonthStart=new Date(thisYear,thisMonth,1).toISOString();
    var or=await sb.from('orders').select('stage').eq('company_id',currentCompanyId).gte('created_at',thisMonthStart);
    var stageMap={};var orderStages=['谈判中','已签约','执行中','已完成','已取消'];
    if(or.data)for(var oi=0;oi<or.data.length;oi++){var os=or.data[oi].stage||'未知';stageMap[os]=(stageMap[os]||0)+1}
    var osValues=orderStages.map(function(s){return stageMap[s]||0});
    _destroyChart('orderStatus');
    var ctx5=document.getElementById('chart-order-status');
    if(ctx5){
      _chartInstances.orderStatus=new Chart(ctx5,{
        type:'doughnut',
        data:{labels:orderStages,datasets:[{data:osValues,
          backgroundColor:['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444']}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'65%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:12,font:{size:11}}}}}});
    }
  }catch(e){console.warn('Dashboard charts render failed:',e);}
}
// ============================================================
// 报表与BI分析模块 — Chart.js 升级版
// 替换原有报表 JS 函数
// ============================================================

// 报表图表实例管理
var _reportCharts={};
function _destroyReportChart(key){ if(_reportCharts[key]){_reportCharts[key].destroy();_reportCharts[key]=null;} }
function _destroyAllReportCharts(){ for(var k in _reportCharts)_destroyReportChart(k); }

// ===== Tab 切换 =====
function switchReportsTab(sub){
  // 销毁当前活跃tab的所有图表实例
  _destroyAllReportCharts();
  var panels={'sales':'rp-sales-panel','clients':'rp-clients-panel','collections':'rp-collections-panel','orders':'rp-orders-panel','dashboard':'rp-dashboard-panel'};
  var tabs=document.querySelectorAll('#reports-tabs-bar .biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  for(var k in panels){var p=document.getElementById(panels[k]);if(p)p.classList.add('hidden');}
  var active=document.getElementById(panels[sub]);if(active)active.classList.remove('hidden');
  var idx={'sales':0,'clients':1,'collections':2,'orders':3,'dashboard':4};
  if(tabs[idx[sub]])tabs[idx[sub]].classList.add('active');
  if(sub==='sales')renderReportSales();
  else if(sub==='clients')renderReportClients();
  else if(sub==='collections')renderReportCollections();
  else if(sub==='orders')renderReportOrders();
  else if(sub==='dashboard'){renderCustomDashboard();}
}

// ===== 汇总卡片数据加载 =====
function loadReportSummary(){
  var now=new Date();var mStart=new Date(now.getFullYear(),now.getMonth(),1).toISOString();
  sb.from('orders').select('amount,stage').eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    var sum=0,completed=0;
    if(r.data)for(var i=0;i<r.data.length;i++){var a=parseFloat(r.data[i].amount)||0;sum+=a;if(r.data[i].stage==='已完成')completed++}
    document.getElementById('rp-monthly-sales').textContent='¥'+sum.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0});
    document.getElementById('rp-order-complete').textContent=completed;
  }).catch(function(){});
  sb.from('clients').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).gte('created_at',mStart).then(function(r){
    document.getElementById('rp-monthly-clients').textContent=r.count||0;
  }).catch(function(){});
  sb.from('contracts').select('total_amount').eq('company_id',currentCompanyId).not('archive_status','eq','archived').then(function(r){
    var total=0,paid=0;
    if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].total_amount)||0;}
    var rate=total>0?Math.round(paid/total*100):0;
    document.getElementById('rp-collect-rate').textContent=rate+'%';
  }).catch(function(){});
}

// 获取year/quarter筛选范围（返回月份数组）
function _getReportMonths(yearElId,quarterElId){
  var year=parseInt(document.getElementById(yearElId).value)||new Date().getFullYear();
  var quarter=parseInt(document.getElementById(quarterElId||'').value)||0;
  var months=[];
  var startM=1,endM=12;
  if(quarter>0){startM=(quarter-1)*3+1;endM=Math.min(startM+2,12);}
  for(var m=startM;m<=endM;m++){
    months.push({month:m,label:year+'年'+m+'月',shortLabel:m+'月',start:new Date(year,m-1,1).toISOString(),end:new Date(year,m,0,23,59,59).toISOString()});
  }
  return {year:year,months:months};
}

// 初始化year选择器
function _initYearSelector(elId,year){
  var sy=document.getElementById(elId);
  if(!sy.options.length){
    var cy=new Date().getFullYear();
    for(var y=cy-3;y<=cy;y++){var o=document.createElement('option');o.value=y;o.textContent=y+'年';if(y===year)o.selected=true;sy.appendChild(o);}
  }
}

// 构建Supabase查询（超管绕过company_id过滤）
function _reportQuery(table){
  var q=sb.from(table).select('*');
  if(!isSuperAdmin)q=q.eq('company_id',currentCompanyId);
  return q;
}

// ============================================================
// 📈 销售报表
// ============================================================
async function renderReportSales(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-sales-year','rp-sales-quarter');
  _initYearSelector('rp-sales-year',sel.year);
  await Promise.all([
    renderSalesFunnel(sel.year),
    renderWinRate(sel),
    renderDealCycle(sel),
    renderAvgDealPrice(sel),
    renderRegionalPerf(sel.year)
  ]);
}

async function renderSalesFunnel(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
    var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
    var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
    var counts=[];
    for(var si=0;si<stages.length;si++){
      var r=await _reportQuery('lead_pool').eq('status',stages[si]).gte('created_at',yStart).lte('created_at',yEnd);
      counts.push((r.data||[]).length);
    }
    _destroyReportChart('salesFunnel');
    var ctx=document.getElementById('rp-sales-salesFunnel');
    if(ctx){
      _reportCharts.salesFunnel=new Chart(ctx,{type:'bar',
        data:{labels:stageLabels,datasets:[{label:'线索数',data:counts,backgroundColor:stageColors,borderRadius:4}]},
        options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,counts)/6))}}}}});
    }
  }catch(e){console.warn('renderSalesFunnel failed:',e);}
}

async function renderWinRate(sel){
  try{
    var labels=[],rates=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var won=await _reportQuery('lead_pool').eq('status','won').gte('created_at',mo.start).lte('created_at',mo.end);
      var lost=await _reportQuery('lead_pool').eq('status','lost').gte('created_at',mo.start).lte('created_at',mo.end);
      var w=(won.data||[]).length,l=(lost.data||[]).length;
      var total=w+l;
      labels.push(mo.shortLabel);
      rates.push(total>0?Math.round(w/total*100):0);
    }
    _destroyReportChart('winRate');
    var ctx=document.getElementById('rp-sales-winRate');
    if(ctx){
      _reportCharts.winRate=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'赢单率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
    }
  }catch(e){console.warn('renderWinRate failed:',e);}
}

async function renderDealCycle(sel){
  try{
    var labels=[],cycles=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('created_at,updated_at').eq('stage','已完成').gte('created_at',mo.start).lte('created_at',mo.end);
      var totalDays=0,count=0;
      if(r.data)for(var i=0;i<r.data.length;i++){
        var c=new Date(r.data[i].created_at);
        var u=r.data[i].updated_at?new Date(r.data[i].updated_at):new Date();
        var days=Math.round((u-c)/(1000*60*60*24));
        if(days>=0){totalDays+=days;count++;}
      }
      labels.push(mo.shortLabel);
      cycles.push(count>0?Math.round(totalDays/count):0);
    }
    _destroyReportChart('dealCycle');
    var ctx=document.getElementById('rp-sales-dealCycle');
    if(ctx){
      _reportCharts.dealCycle=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[{label:'平均成单天数',data:cycles,backgroundColor:'#8B5CF6',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v+'天'}}}}}});
    }
  }catch(e){console.warn('renderDealCycle failed:',e);}
}

async function renderAvgDealPrice(sel){
  try{
    var labels=[],prices=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('amount').not('stage','eq','已取消').gte('created_at',mo.start).lte('created_at',mo.end);
      var total=0,count=0;
      if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].amount)||0;count++;}
      labels.push(mo.shortLabel);
      prices.push(count>0?Math.round(total/count):0);
    }
    _destroyReportChart('avgDealPrice');
    var ctx=document.getElementById('rp-sales-avgDealPrice');
    if(ctx){
      _reportCharts.avgDealPrice=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'成交均价',data:prices,borderColor:'#F59E0B',backgroundColor:'rgba(245,158,11,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#F59E0B'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderAvgDealPrice failed:',e);}
}

async function renderRegionalPerf(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var r=await _reportQuery('clients').select('industry').gte('created_at',yStart).lte('created_at',yEnd);
    var regionMap={};
    if(r.data)for(var i=0;i<r.data.length;i++){var p=r.data[i].industry||'未知';regionMap[p]=(regionMap[p]||0)+1;}
    var labels=Object.keys(regionMap).sort(function(a,b){return regionMap[b]-regionMap[a];});
    var values=labels.map(function(k){return regionMap[k];});
    var regionColors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1','#A855F7','#14B8A6'];
    _destroyReportChart('regionalPerf');
    var ctx=document.getElementById('rp-sales-regionalPerf');
    if(ctx){
      _reportCharts.regionalPerf=new Chart(ctx,{type:'doughnut',
        data:{labels:labels.slice(0,12),datasets:[{data:values.slice(0,12),backgroundColor:regionColors.slice(0,Math.min(labels.length,12))}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10},padding:8}}}}});
    }
  }catch(e){console.warn('renderRegionalPerf failed:',e);}
}

// ============================================================
// 👥 客户分析
// ============================================================
async function renderReportClients(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-clients-year','rp-clients-quarter');
  _initYearSelector('rp-clients-year',sel.year);
  await Promise.all([
    renderNewClientsTrend(sel),
    renderChurnAnalysis(sel),
    renderRepurchaseRate(sel),
    renderRFMAnalysis(),
    renderChannelAnalysis(sel)
  ]);
}

async function renderNewClientsTrend(sel){
  try{
    var labels=[],counts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('clients').select('id',{count:'exact',head:true}).gte('created_at',mo.start).lte('created_at',mo.end);
      labels.push(mo.shortLabel);
      counts.push(r.count||0);
    }
    _destroyReportChart('newClientsTrend');
    var ctx=document.getElementById('rp-clients-newClientsTrend');
    if(ctx){
      _reportCharts.newClientsTrend=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'新增客户',data:counts,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,counts.concat([1]))/6))}}}}});
    }
  }catch(e){console.warn('renderNewClientsTrend failed:',e);}
}

async function renderChurnAnalysis(sel){
  try{
    // 流失定义：该月之前3个月有订单但该月及之后无新订单的客户数
    var labels=[],churnCounts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      // 本月有订单的客户
      var activeR=await _reportQuery('orders').select('client_id').gte('created_at',mo.start).lte('created_at',mo.end);
      var activeSet={};if(activeR.data)for(var ai=0;ai<activeR.data.length;ai++)activeSet[activeR.data[ai].client_id]=true;
      // 过去3个月有订单的客户
      var threeMonthsAgo=new Date(sel.year,mo.month-4,1).toISOString();
      var prevR=await _reportQuery('orders').select('client_id').gte('created_at',threeMonthsAgo).lte('created_at',mo.end);
      var prevSet={};if(prevR.data)for(var pi=0;pi<prevR.data.length;pi++)prevSet[prevR.data[pi].client_id]=true;
      // 流失 = 过去3个月有但本月无
      var churn=0;
      for(var cid in prevSet){if(!activeSet[cid])churn++;}
      labels.push(mo.shortLabel);
      churnCounts.push(churn);
    }
    _destroyReportChart('churnAnalysis');
    var ctx=document.getElementById('rp-clients-churnAnalysis');
    if(ctx){
      _reportCharts.churnAnalysis=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[{label:'流失客户数',data:churnCounts,backgroundColor:'#EF4444',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,churnCounts.concat([1]))/6))}}}}});
    }
  }catch(e){console.warn('renderChurnAnalysis failed:',e);}
}

async function renderRepurchaseRate(sel){
  try{
    var labels=[],rates=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('orders').select('client_id').gte('created_at',mo.start).lte('created_at',mo.end);
      var clientOrders={};var repurchase=0,totalClients=0;
      if(r.data){
        for(var i=0;i<r.data.length;i++){var cid=r.data[i].client_id;clientOrders[cid]=(clientOrders[cid]||0)+1;}
        totalClients=Object.keys(clientOrders).length;
        for(var k in clientOrders){if(clientOrders[k]>=2)repurchase++;}
      }
      labels.push(mo.shortLabel);
      rates.push(totalClients>0?Math.round(repurchase/totalClients*100):0);
    }
    // 更新指标卡
    var lastRate=rates.length>0?rates[rates.length-1]:0;
    var metricEl=document.getElementById('rp-clients-repurchaseMetric');
    if(metricEl)metricEl.textContent=lastRate+'%';
    _destroyReportChart('repurchaseRate');
    var ctx=document.getElementById('rp-clients-repurchaseRate');
    if(ctx){
      _reportCharts.repurchaseRate=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'复购率(%)',data:rates,borderColor:'#8B5CF6',backgroundColor:'rgba(139,92,246,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#8B5CF6'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
    }
  }catch(e){console.warn('renderRepurchaseRate failed:',e);}
}

async function renderRFMAnalysis(){
  try{
    var now=new Date();
    // 获取所有订单（不限时间）
    var r=await _reportQuery('orders').select('client_id,amount,created_at');
    if(!r.data||!r.data.length){document.getElementById('rp-clients-rfmTable').querySelector('tbody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text3)">暂无数据</td></tr>';return;}
    // 获取客户名称映射
    var cr=await _reportQuery('clients').select('id,name');
    var clientNames={};if(cr.data)for(var ci=0;ci<cr.data.length;ci++)clientNames[cr.data[ci].id]=cr.data[ci].name||'未知';
    // 按客户聚合
    var rfm={};
    for(var i=0;i<r.data.length;i++){
      var o=r.data[i];var cid=o.client_id;if(!cid)continue;
      if(!rfm[cid])rfm[cid]={clientId:cid,recency:99999,frequency:0,monetary:0};
      var days=(now-new Date(o.created_at))/(1000*60*60*24);
      if(days<rfm[cid].recency)rfm[cid].recency=Math.round(days);
      rfm[cid].frequency++;
      rfm[cid].monetary+=parseFloat(o.amount)||0;
    }
    // 计算RFM评分（1-5分）
    var arr=Object.values(rfm);
    arr.sort(function(a,b){return a.recency-b.recency;});for(var ri=0;ri<arr.length;ri++)arr[ri].r=Math.ceil((ri+1)/arr.length*5);
    arr.sort(function(a,b){return a.frequency-b.frequency;});for(var fi=0;fi<arr.length;fi++)arr[fi].f=Math.ceil((fi+1)/arr.length*5);
    arr.sort(function(a,b){return a.monetary-b.monetary;});for(var mi=0;mi<arr.length;mi++)arr[mi].m=Math.ceil((mi+1)/arr.length*5);
    // 按R+F+M总分排序,取Top20
    arr.sort(function(a,b){return (b.r+b.f+b.m)-(a.r+a.f+a.m);});
    var top=arr.slice(0,20);
    var tbody=document.getElementById('rp-clients-rfmTable').querySelector('tbody');
    var html='';
    for(var ti=0;ti<top.length;ti++){
      var tr=top[ti];
      html+='<tr><td>'+escHtml(clientNames[tr.clientId]||'客户#'+tr.clientId)+'</td><td>'+tr.recency+'</td><td>'+tr.frequency+'</td><td>¥'+tr.monetary.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="font-weight:700;color:'+(tr.r+tr.f+tr.m>=12?'#10B981':tr.r+tr.f+tr.m>=8?'#F59E0B':'#EF4444')+'">'+(tr.r+tr.f+tr.m)+'分</td></tr>';
    }
    tbody.innerHTML=html;
  }catch(e){console.warn('renderRFMAnalysis failed:',e);}
}

async function renderChannelAnalysis(sel){
  try{
    var start=sel.months[0].start,end=sel.months[sel.months.length-1].end;
    var r=await _reportQuery('lead_pool').select('source').gte('created_at',start).lte('created_at',end);
    var sourceMap={};
    if(r.data)for(var i=0;i<r.data.length;i++){var s=r.data[i].source||'未知';sourceMap[s]=(sourceMap[s]||0)+1;}
    var labels=Object.keys(sourceMap);
    var values=labels.map(function(k){return sourceMap[k];});
    var colors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
    _destroyReportChart('channelAnalysis');
    var ctx=document.getElementById('rp-clients-channelAnalysis');
    if(ctx){
      _reportCharts.channelAnalysis=new Chart(ctx,{type:'doughnut',
        data:{labels:labels,datasets:[{data:values,backgroundColor:colors.slice(0,labels.length)}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'60%',
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10},padding:8}}}}});
    }
  }catch(e){console.warn('renderChannelAnalysis failed:',e);}
}

// ============================================================
// 💳 回款分析
// ============================================================
async function renderReportCollections(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-collections-year','rp-collections-quarter');
  _initYearSelector('rp-collections-year',sel.year);
  await Promise.all([
    renderARAging(sel.year),
    renderPaymentTrend(sel),
    renderContractStats(sel),
    renderBadDebt()
  ]);
}

async function renderARAging(year){
  try{
    var yStart=new Date(year,0,1).toISOString();
    var yEnd=new Date(year,11,31,23,59,59).toISOString();
    var now=new Date();
    var r=await _reportQuery('contracts').select('total_amount,end_date').not('archive_status','eq','archived').gte('created_at',yStart).lte('created_at',yEnd);
    // 按账龄分组：未到期、1-30天、31-60天、61-90天、90天+
    var aging={unexpired:0,days30:0,days60:0,days90:0,over90:0};
    if(r.data)for(var i=0;i<r.data.length;i++){
      var unpaid=parseFloat(r.data[i].total_amount)||0;
      var due=r.data[i].end_date?new Date(r.data[i].end_date):now;
      var overdue=(now-due)/(1000*60*60*24);
      if(overdue<=0)aging.unexpired+=unpaid;
      else if(overdue<=30)aging.days30+=unpaid;
      else if(overdue<=60)aging.days60+=unpaid;
      else if(overdue<=90)aging.days90+=unpaid;
      else aging.over90+=unpaid;
    }
    _destroyReportChart('ARAging');
    var ctx=document.getElementById('rp-collections-ARAging');
    if(ctx){
      _reportCharts.ARAging=new Chart(ctx,{type:'bar',
        data:{labels:['未到期','1-30天','31-60天','61-90天','90天以上'],datasets:[
          {label:'未到期',data:[aging.unexpired,0,0,0,0],backgroundColor:'#10B981',borderRadius:4},
          {label:'1-30天',data:[0,aging.days30,0,0,0],backgroundColor:'#F59E0B',borderRadius:4},
          {label:'31-60天',data:[0,0,aging.days60,0,0],backgroundColor:'#F97316',borderRadius:4},
          {label:'61-90天',data:[0,0,0,aging.days90,0],backgroundColor:'#EF4444',borderRadius:4},
          {label:'90天以上',data:[0,0,0,0,aging.over90],backgroundColor:'#991B1B',borderRadius:4}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
          scales:{x:{stacked:true},y:{stacked:true,ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderARAging failed:',e);}
}

async function renderPaymentTrend(sel){
  try{
    var labels=[],amounts=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('payments').select('amount').gte('payment_date',mo.start).lte('payment_date',mo.end);
      var sum=0;if(r.data)for(var i=0;i<r.data.length;i++)sum+=parseFloat(r.data[i].amount)||0;
      labels.push(mo.shortLabel);
      amounts.push(sum);
    }
    _destroyReportChart('paymentTrend');
    var ctx=document.getElementById('rp-collections-paymentTrend');
    if(ctx){
      _reportCharts.paymentTrend=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{label:'回款金额',data:amounts,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderPaymentTrend failed:',e);}
}

async function renderContractStats(sel){
  try{
    var labels=[],totals=[],paids=[];
    for(var mi=0;mi<sel.months.length;mi++){
      var mo=sel.months[mi];
      var r=await _reportQuery('contracts').select('total_amount').gte('created_at',mo.start).lte('created_at',mo.end);
      var total=0,paid=0;
      if(r.data)for(var i=0;i<r.data.length;i++){total+=parseFloat(r.data[i].total_amount)||0;}
      labels.push(mo.shortLabel);
      totals.push(total);paids.push(paid);
    }
    _destroyReportChart('contractStats');
    var ctx=document.getElementById('rp-collections-contractStats');
    if(ctx){
      _reportCharts.contractStats=new Chart(ctx,{type:'bar',
        data:{labels:labels,datasets:[
          {label:'合同总金额',data:totals,backgroundColor:'#4F6EF7',borderRadius:4},
          {label:'已回款金额',data:paids,backgroundColor:'#10B981',borderRadius:4}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
          scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderContractStats failed:',e);}
}

async function renderBadDebt(){
  try{
    var now=new Date();
    var r=await _reportQuery('contracts').select('id,total_amount,end_date').not('archive_status','eq','archived').not('status','eq','completed');
    if(!r.data||!r.data.length){document.getElementById('rp-collections-badDebtTable').querySelector('tbody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3)">暂无超期合同</td></tr>';return;}
    // 筛选超期且未完成
    var badList=[];
    for(var i=0;i<r.data.length;i++){
      var c=r.data[i];
      var unpaid=parseFloat(c.total_amount)||0;
      var due=c.end_date?new Date(c.end_date):null;
      if(!due)continue;
      var overdue=Math.round((now-due)/(1000*60*60*24));
      if(overdue<=0)continue;
      badList.push({id:c.id,total:parseFloat(c.total_amount)||0,paid:0,unpaid:unpaid,dueDate:due.toLocaleDateString('zh-CN'),overdueDays:overdue});
    }
    badList.sort(function(a,b){return b.overdueDays-a.overdueDays;});
    var tbody=document.getElementById('rp-collections-badDebtTable').querySelector('tbody');
    if(!badList.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text3)">暂无超期合同</td></tr>';return;}
    var html='';
    for(var bi=0;bi<badList.length;bi++){
      var b=badList[bi];
      html+='<tr><td>合同#'+b.id+'</td><td>'+b.dueDate+'</td><td>¥'+b.total.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#10B981">¥'+b.paid.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#EF4444">¥'+b.unpaid.toLocaleString('zh-CN',{minimumFractionDigits:0,maximumFractionDigits:0})+'</td><td style="color:#EF4444;font-weight:700">'+b.overdueDays+'天</td></tr>';
    }
    tbody.innerHTML=html;
  }catch(e){console.warn('renderBadDebt failed:',e);}
}

// ============================================================
// 📦 订单统计（Chart.js升级版）
// ============================================================
async function renderReportOrders(){
  _destroyAllReportCharts();
  var sel=_getReportMonths('rp-orders-year','rp-orders-quarter');
  _initYearSelector('rp-orders-year',sel.year);
  var labels=[],totals=[],completed=[],cancelled=[],rates=[];
  for(var mi=0;mi<sel.months.length;mi++){
    var mo=sel.months[mi];
    var r=await _reportQuery('orders').select('stage').gte('created_at',mo.start).lte('created_at',mo.end);
    var total=0,cmp=0,can=0;
    if(r.data)for(var i=0;i<r.data.length;i++){total++;if(r.data[i].stage==='已完成')cmp++;if(r.data[i].stage==='已取消')can++;}
    labels.push(mo.shortLabel);
    totals.push(total);completed.push(cmp);cancelled.push(can);
    rates.push(total>0?Math.round(cmp/total*100):0);
  }
  // 柱状图：月度订单量
  _destroyReportChart('monthlyOrders');
  var ctx1=document.getElementById('rp-orders-monthlyOrders');
  if(ctx1){
    _reportCharts.monthlyOrders=new Chart(ctx1,{type:'bar',
      data:{labels:labels,datasets:[
        {label:'订单总数',data:totals,backgroundColor:'#4F6EF7',borderRadius:4},
        {label:'已完成',data:completed,backgroundColor:'#10B981',borderRadius:4},
        {label:'已取消',data:cancelled,backgroundColor:'#EF4444',borderRadius:4}
      ]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9},padding:6}}},
        scales:{y:{ticks:{stepSize:Math.max(1,Math.ceil(Math.max.apply(null,totals.concat([1]))/6))}}}}});
  }
  // 折线图：完成率
  _destroyReportChart('completeRate');
  var ctx2=document.getElementById('rp-orders-completeRate');
  if(ctx2){
    _reportCharts.completeRate=new Chart(ctx2,{type:'line',
      data:{labels:labels,datasets:[{label:'完成率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:3,pointBackgroundColor:'#10B981'}]},
      options:{responsive:true,maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{y:{min:0,max:100,ticks:{callback:function(v){return v+'%'}}}}}});
  }
  // 明细表
  var tbody=document.getElementById('rp-orders-detailTable').querySelector('tbody');
  var thtml='';
  for(var ti=0;ti<labels.length;ti++){
    thtml+='<tr><td>'+labels[ti]+'</td><td>'+totals[ti]+'</td><td style="color:#10B981">'+completed[ti]+'</td><td style="color:#EF4444">'+cancelled[ti]+'</td><td>'+rates[ti]+'%</td></tr>';
  }
  tbody.innerHTML=thtml;
}

// ============================================================
// ⚙️ 自定义仪表盘
// ============================================================
var _currentDashboardId=null;
var _currentDashboardCards=[];

async function renderCustomDashboard(){
  _destroyAllReportCharts();
  await loadDashboardList();
  var sel=document.getElementById('rp-dashboard-selector');
  var dashId=sel.value;
  _currentDashboardId=dashId||null;
  _currentDashboardCards=[];
  if(!dashId){
    document.getElementById('rp-dashboard-title').value='我的仪表盘';
    document.getElementById('rp-dashboard-scope').value='personal';
    document.getElementById('rp-dashboard-grid').innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">点击「添加卡片」开始构建你的仪表盘</div>';
    return;
  }
  try{
    var r=await sb.from('custom_dashboards').select('*').eq('id',parseInt(dashId)).single();
    if(!r.data)return;
    document.getElementById('rp-dashboard-title').value=r.data.title||'我的仪表盘';
    document.getElementById('rp-dashboard-scope').value=r.data.scope||'personal';
    var layout=r.data.layout||[];
    if(typeof layout==='string')layout=JSON.parse(layout);
    _currentDashboardCards=layout;
    var grid=document.getElementById('rp-dashboard-grid');
    if(!layout.length){grid.innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">仪表盘为空，点击「添加卡片」添加图表</div>';return;}
    grid.innerHTML='';
    for(var ci=0;ci<layout.length;ci++){
      var card=layout[ci];
      var cardEl=document.createElement('div');
      cardEl.className='report-chart';
      cardEl.id='rp-dash-card-'+ci;
      cardEl.style.position='relative';
      cardEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:600;font-size:12px">'+escHtml(card.title||'图表')+'</span><button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 4px" onclick="removeDashboardCard('+ci+')" title="删除">✕</button></div><canvas id="rp-dash-canvas-'+ci+'" style="max-height:260px"></canvas>';
      grid.appendChild(cardEl);
      renderDashboardCard(card,document.getElementById('rp-dash-canvas-'+ci),ci);
    }
  }catch(e){console.warn('renderCustomDashboard failed:',e);}
}

async function loadDashboardList(){
  try{
    var sel=document.getElementById('rp-dashboard-selector');
    var curVal=sel.value;
    sel.innerHTML='<option value="">新建仪表盘</option>';
    var r=await sb.from('custom_dashboards').select('id,title').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(r.data)for(var i=0;i<r.data.length;i++){
      var o=document.createElement('option');
      o.value=r.data[i].id;
      o.textContent=r.data[i].title||'未命名';
      if(curVal&&parseInt(curVal)===r.data[i].id)o.selected=true;
      sel.appendChild(o);
    }
  }catch(e){console.warn('loadDashboardList failed:',e);}
}

async function saveDashboardLayout(){
  var title=document.getElementById('rp-dashboard-title').value||'我的仪表盘';
  var scope=document.getElementById('rp-dashboard-scope').value||'personal';
  var layout=_currentDashboardCards;
  try{
    if(_currentDashboardId){
      await sb.from('custom_dashboards').update({title:title,layout:layout,scope:scope,updated_at:new Date().toISOString()}).eq('id',_currentDashboardId);
    }else{
      var r=await sb.from('custom_dashboards').insert({company_id:currentCompanyId,user_id:currentUser.id,title:title,layout:layout,scope:scope}).select('id').single();
      if(r.data){_currentDashboardId=r.data.id;}
    }
    showToast('仪表盘已保存','success');
    loadDashboardList();
  }catch(e){console.warn('saveDashboardLayout failed:',e);showToast('保存失败：'+e.message,'error');}
}

async function addDashboardCard(){
  var cardTypes=[
    {type:'salesFunnel',title:'销售漏斗',chart:'bar',desc:'线索状态分布'},
    {type:'winRate',title:'赢单率趋势',chart:'line',desc:'月度赢单率变化'},
    {type:'newClients',title:'新增客户趋势',chart:'line',desc:'月度新增客户数'},
    {type:'paymentTrend',title:'回款趋势',chart:'line',desc:'月度回款金额'},
    {type:'orderStats',title:'订单统计',chart:'bar',desc:'月度订单量统计'},
    {type:'channelDist',title:'获客渠道',chart:'doughnut',desc:'线索来源分布'},
    {type:'regionalDist',title:'区域分布',chart:'doughnut',desc:'客户地域分布'},
    {type:'contractStats',title:'合同统计',chart:'bar',desc:'合同金额对比'}
  ];
  var type=await uiPrompt('选择图表类型：\n1.销售漏斗  2.赢单率  3.新增客户\n4.回款趋势  5.订单统计  6.获客渠道\n7.区域分布  8.合同统计\n\n请输入编号(1-8)：','1');
  var idx=parseInt(type)-1;
  if(isNaN(idx)||idx<0||idx>=cardTypes.length)return;
  var ct=cardTypes[idx];
  var title=await uiPrompt('卡片标题：',ct.title)||ct.title;
  var card={type:ct.type,title:title,chart:ct.chart,desc:ct.desc};
  _currentDashboardCards.push(card);
  // 创建新卡片DOM
  var grid=document.getElementById('rp-dashboard-grid');
  if(grid.querySelector('[style*="padding:60px"]'))grid.innerHTML='';
  var ci=_currentDashboardCards.length-1;
  var cardEl=document.createElement('div');
  cardEl.className='report-chart';
  cardEl.id='rp-dash-card-'+ci;
  cardEl.style.position='relative';
  cardEl.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-weight:600;font-size:12px">'+escHtml(title)+'</span><button style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;padding:0 4px" onclick="removeDashboardCard('+ci+')" title="删除">✕</button></div><canvas id="rp-dash-canvas-'+ci+'" style="max-height:260px"></canvas>';
  grid.appendChild(cardEl);
  renderDashboardCard(card,document.getElementById('rp-dash-canvas-'+ci),ci);
}

function removeDashboardCard(cardId){
  _destroyReportChart('dashCanvas_'+cardId);
  _currentDashboardCards.splice(cardId,1);
  var el=document.getElementById('rp-dash-card-'+cardId);
  if(el)el.remove();
  if(!_currentDashboardCards.length){
    document.getElementById('rp-dashboard-grid').innerHTML='<div style="text-align:center;color:var(--text3);padding:60px 0;grid-column:1/-1">仪表盘为空，点击「添加卡片」添加图表</div>';
  }
}

async function renderDashboardCard(card,canvas,idx){
  if(!canvas)return;
  try{
    var year=new Date().getFullYear();
    var chartKey='dashCanvas_'+idx;
    _destroyReportChart(chartKey);
    var ctx=canvas.getContext('2d');
    if(card.type==='salesFunnel'){
      var stages=['new','assigned','contacted','qualified','negotiation','won','lost'];
      var stageLabels=['新线索','已分配','已联系','已确认','谈判中','赢单','输单'];
      var stageColors=['#1565C0','#1E88E5','#E65100','#2E7D32','#6B21A8','#166534','#991B1B'];
      var yStart=new Date(year,0,1).toISOString(),yEnd=new Date(year,11,31,23,59,59).toISOString();
      var counts=[];
      for(var si=0;si<stages.length;si++){
        var lr=await _reportQuery('lead_pool').eq('status',stages[si]).gte('created_at',yStart).lte('created_at',yEnd);
        counts.push((lr.data||[]).length);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:stageLabels,datasets:[{label:'数量',data:counts,backgroundColor:stageColors,borderRadius:4}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='winRate'){
      var labels=[],rates=[];
      for(var m=1;m<=12;m++){
        var ms=new Date(year,m-1,1).toISOString(),me=new Date(year,m,0,23,59,59).toISOString();
        var wonR=await _reportQuery('lead_pool').eq('status','won').gte('created_at',ms).lte('created_at',me);
        var lostR=await _reportQuery('lead_pool').eq('status','lost').gte('created_at',ms).lte('created_at',me);
        var w=(wonR.data||[]).length,l=(lostR.data||[]).length,total2=w+l;
        labels.push(m+'月');rates.push(total2>0?Math.round(w/total2*100):0);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels,datasets:[{label:'赢单率(%)',data:rates,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{min:0,max:100}}}});
    }else if(card.type==='newClients'){
      var labels2=[],counts2=[];
      for(var m2=1;m2<=12;m2++){
        var ms2=new Date(year,m2-1,1).toISOString(),me2=new Date(year,m2,0,23,59,59).toISOString();
        var cr2=await _reportQuery('clients').select('id',{count:'exact',head:true}).gte('created_at',ms2).lte('created_at',me2);
        labels2.push(m2+'月');counts2.push(cr2.count||0);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels2,datasets:[{label:'新增客户',data:counts2,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='paymentTrend'){
      var labels3=[],amounts3=[];
      for(var m3=1;m3<=12;m3++){
        var ms3=new Date(year,m3-1,1).toISOString(),me3=new Date(year,m3,0,23,59,59).toISOString();
        var pr3=await _reportQuery('payments').select('amount').gte('payment_date',ms3).lte('payment_date',me3);
        var sum3=0;if(pr3.data)for(var pj=0;pj<pr3.data.length;pj++)sum3+=parseFloat(pr3.data[pj].amount)||0;
        labels3.push(m3+'月');amounts3.push(sum3);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'line',data:{labels:labels3,datasets:[{label:'回款金额',data:amounts3,borderColor:'#10B981',backgroundColor:'rgba(16,185,129,0.1)',fill:true,tension:0.35,pointRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }else if(card.type==='orderStats'){
      var labels4=[],totals4=[],completed4=[];
      for(var m4=1;m4<=12;m4++){
        var ms4=new Date(year,m4-1,1).toISOString(),me4=new Date(year,m4,0,23,59,59).toISOString();
        var or4=await _reportQuery('orders').select('stage').gte('created_at',ms4).lte('created_at',me4);
        var t4=0,c4=0;if(or4.data)for(var oj=0;oj<or4.data.length;oj++){t4++;if(or4.data[oj].stage==='已完成')c4++;}
        labels4.push(m4+'月');totals4.push(t4);completed4.push(c4);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:labels4,datasets:[{label:'总数',data:totals4,backgroundColor:'#4F6EF7',borderRadius:4},{label:'已完成',data:completed4,backgroundColor:'#10B981',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
    }else if(card.type==='channelDist'){
      var sr=await _reportQuery('lead_pool').select('source');
      var smap={};if(sr.data)for(var sk=0;sk<sr.data.length;sk++){var ss=sr.data[sk].source||'未知';smap[ss]=(smap[ss]||0)+1;}
      var slabels=Object.keys(smap),svalues=slabels.map(function(k){return smap[k];});
      var scolors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316'];
      _reportCharts[chartKey]=new Chart(ctx,{type:'doughnut',data:{labels:slabels,datasets:[{data:svalues,backgroundColor:scolors.slice(0,slabels.length)}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9}}}}}});
    }else if(card.type==='regionalDist'){
      var rr=await _reportQuery('clients').select('industry');
      var rmap={};if(rr.data)for(var rk=0;rk<rr.data.length;rk++){var pp=rr.data[rk].industry||'未知';rmap[pp]=(rmap[pp]||0)+1;}
      var rlabels=Object.keys(rmap).sort(function(a,b){return rmap[b]-rmap[a];}).slice(0,12);
      var rvalues=rlabels.map(function(k){return rmap[k];});
      var rcolors=['#4F6EF7','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316','#84CC16','#6366F1','#A855F7','#14B8A6'];
      _reportCharts[chartKey]=new Chart(ctx,{type:'doughnut',data:{labels:rlabels,datasets:[{data:rvalues,backgroundColor:rcolors.slice(0,rlabels.length)}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:9}}}}}});
    }else if(card.type==='contractStats'){
      var clabels=[],ctotals=[],cpaids=[];
      for(var cm=1;cm<=12;cm++){
        var cms=new Date(year,cm-1,1).toISOString(),cme=new Date(year,cm,0,23,59,59).toISOString();
        var crr=await _reportQuery('contracts').select('total_amount').gte('created_at',cms).lte('created_at',cme);
        var ctotal=0,cpaid=0;if(crr.data)for(var cj=0;cj<crr.data.length;cj++){ctotal+=parseFloat(crr.data[cj].total_amount)||0;}
        clabels.push(cm+'月');ctotals.push(ctotal);cpaids.push(cpaid);
      }
      _reportCharts[chartKey]=new Chart(ctx,{type:'bar',data:{labels:clabels,datasets:[{label:'总额',data:ctotals,backgroundColor:'#4F6EF7',borderRadius:4},{label:'已回',data:cpaids,backgroundColor:'#10B981',borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{ticks:{callback:function(v){return v>=10000?'¥'+(v/10000).toFixed(1)+'万':'¥'+v;}}}}}});
    }
  }catch(e){console.warn('renderDashboardCard failed:',e);}
}

// ============================================================
// 📥 导出CSV
// ============================================================
function exportReportCSV(type){
  var year,quarter;
  if(type==='sales'){year=document.getElementById('rp-sales-year').value;quarter=document.getElementById('rp-sales-quarter').value;}
  else if(type==='clients'){year=document.getElementById('rp-clients-year').value;quarter=document.getElementById('rp-clients-quarter').value;}
  else if(type==='collections'){year=document.getElementById('rp-collections-year').value;quarter=document.getElementById('rp-collections-quarter').value;}
  else if(type==='orders'){year=document.getElementById('rp-orders-year').value;quarter=document.getElementById('rp-orders-quarter').value;}
  else{return;}
  year=year||new Date().getFullYear();quarter=quarter||'0';
  var prefix=type+'_'+year+(quarter!=='0'?'_Q'+quarter:'');
  var sel=_getReportMonths('rp-'+type+'-year','rp-'+type+'-quarter');
  var csvHeaders,csvData=[];
  if(type==='sales'){
    csvHeaders=['月份','线索新','线索已分配','线索已联系','线索已确认','线索谈判','赢单','输单'];
    // 异步生成比较复杂，简化：收集当前画布中的图表数据
    var chart=_reportCharts.salesFunnel;
    if(chart){csvData=[['-','-(详见图表)']];}else{csvData=[['-','-']];}
  }else if(type==='clients'){
    csvData=[];var chart2=_reportCharts.newClientsTrend;
    if(chart2&&chart2.data&&chart2.data.datasets[0]){
      csvHeaders=['月份','新增客户数'];
      var d=chart2.data;for(var di=0;di<d.labels.length;di++)csvData.push([d.labels[di],d.datasets[0].data[di]]);
    }else{csvHeaders=['月份','数据'];csvData=[['无','-']];}
  }else if(type==='collections'){
    csvData=[];var chart3=_reportCharts.paymentTrend;
    if(chart3&&chart3.data&&chart3.data.datasets[0]){
      csvHeaders=['月份','回款金额'];
      var d2=chart3.data;for(var dj=0;dj<d2.labels.length;dj++)csvData.push([d2.labels[dj],d2.datasets[0].data[dj]]);
    }else{csvHeaders=['月份','数据'];csvData=[['无','-']];}
  }else if(type==='orders'){
    var tbody=document.getElementById('rp-orders-detailTable');
    if(tbody){
      csvHeaders=['月份','订单数','已完成','已取消','完成率'];
      var rows=tbody.querySelectorAll('tbody tr');
      for(var ri=0;ri<rows.length;ri++){var cells=rows[ri].querySelectorAll('td');if(cells.length>=5)csvData.push([cells[0].textContent,cells[1].textContent,cells[2].textContent,cells[3].textContent,cells[4].textContent]);}
    }else{csvHeaders=['月份'];csvData=[['无']];}
  }
  var csv=csvHeaders.join(',')+'\n';
  for(var ci2=0;ci2<csvData.length;ci2++)csv+=csvData[ci2].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',')+'\n';
  var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=prefix+'_report.csv';a.click();
  URL.revokeObjectURL(url);
}
var notifUnread=0;

function toggleNotifPanel(){
  var p=document.getElementById('notif-panel');
  p.classList.toggle('hidden');
  if(!p.classList.contains('hidden')){switchNotifTab('notifications')}
}

function switchNotifTab(sub){
  var tabs=document.querySelectorAll('#notif-panel .biz-subtab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  document.getElementById('notif-list').classList.add('hidden');
  document.getElementById('activity-list').classList.add('hidden');
  document.getElementById('invitation-list').classList.add('hidden');
  if(sub==='notifications'){tabs[0].classList.add('active');loadNotifs();document.getElementById('notif-list').classList.remove('hidden')}
  else if(sub==='invitations'){tabs[2].classList.add('active');loadMyInvitations();document.getElementById('invitation-list').classList.remove('hidden')}
  else{tabs[1].classList.add('active');loadActivityLogs();document.getElementById('activity-list').classList.remove('hidden')}
}

async function loadNotifs(){
  var el=document.getElementById('notif-list');
  el.innerHTML=skRows(5);
  if(!currentUser)return;
  var d1=Date.now();
  var {data:notifs,error}=await sb.from('notifications').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false}).limit(50);
  dbg('loadNotifs:',Date.now()-d1+'ms, rows:',(notifs||[]).length,'err:',error);
  var unread=0;
  if(notifs&&notifs.length){
    var h='';
    for(var i=0;i<notifs.length;i++){
      var n=notifs[i];if(!n.is_read)unread++;
      var icon={info:'ℹ️',warning:'⚠️',success:'✅',error:'❌'}[n.type]||'🔔';
      var d=new Date(n.created_at);var timeStr=isToday(d)?d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
      h+='<div class="notif-item'+(n.is_read?'':' notif-unread')+'" data-nid="'+n.id+'" data-link="'+escAttr(n.link)+'"><span class="notif-icon">'+icon+'</span><div class="notif-body"><div class="notif-title">'+escHtml(n.title)+'</div><div class="notif-text">'+escHtml(n.body)+'</div><div class="notif-time">'+timeStr+'</div></div></div>';
    }
    el.innerHTML=h;
  }else{el.innerHTML='<div class="empty-state">暂无通知</div>'}
  notifUnread=unread;
  updateBellBadge();
  // Event delegation for notif clicks
  el.onclick=function(ev){
    var item=ev.target.closest(".notif-item");
    if(!item)return;
    var nid=parseInt(item.getAttribute('data-nid'));
    var link=item.getAttribute('data-link')||'';
    if(nid)openNotif(nid,link);
  };
}

async function openNotif(id,link){
  await sb.from('notifications').update({is_read:true}).eq('id',id);
  notifUnread=Math.max(0,notifUnread-1);
  updateBellBadge();
  loadNotifs();
  toggleNotifPanel();
  if(link==='invitations'){switchNotifTab('invitations')}
  else if(link){var parts=link.split('/');if(parts[0])switchTab(parts[0])}
}

function updateBellBadge(){
  var b=document.getElementById('notif-badge');
  if(b){b.textContent=notifUnread>99?'99+':notifUnread;b.classList.toggle('hidden',notifUnread===0)}
}

async function markAllNotifsRead(){
  await sb.from('notifications').update({is_read:true}).eq('company_id',currentCompanyId).eq('is_read',false);
  notifUnread=0;updateBellBadge();loadNotifs();
}

async function addNotif(type,title,body,link){
  if(!currentUser||!currentCompanyId)return;
  await sb.from('notifications').insert({company_id:currentCompanyId,user_id:currentUser.id,type:type,title:title,body:body,link:link||''}).then(function(){
    notifUnread++;updateBellBadge();
  }).catch(function(){});
}

// Activity logging
async function logActivity(action,entityType,entityId,entityName,details){
  if(!currentUser||!currentCompanyId)return;
  sb.from('activity_logs').insert({company_id:currentCompanyId,user_id:currentUser.id,action:action,entity_type:entityType,entity_id:entityId||null,entity_name:entityName||'',details:details||{}}).then(function(){}).catch(function(){});
}

async function loadMyInvitations(){
  var el=document.getElementById('invitation-list');
  el.innerHTML=skRows(5);
  if(!currentUser)return;
  dbg('loadMyInvitations: email=',currentUser.email);
  var resp=await sb.from('invitations').select('*').eq('to_email',currentUser.email).eq('status','pending').order('created_at',{ascending:false});
  dbg('invitations resp:',resp);
  var invites=resp.data;
  if(invites&&invites.length){
    // 确保公司名录已加载
    if(!allCompanies||!allCompanies.length)await loadCompanies();
    var companyMap={};if(allCompanies)for(var k=0;k<allCompanies.length;k++)companyMap[allCompanies[k].id]=allCompanies[k];
    var h='';
    for(var i=0;i<invites.length;i++){
      var inv=invites[i];
      var c=companyMap[inv.from_company_id];
      var cname=c?c.name:('公司#'+inv.from_company_id);
      var d=new Date(inv.created_at);var t=d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
      h+='<div style="padding:14px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;background:#f8fafc">';
      h+='<div style="font-weight:600;margin-bottom:4px">'+escHtml(cname)+'</div>';
      h+='<div style="font-size:13px;color:var(--text2);margin-bottom:8px">邀请你加入 · '+t+'</div>';
      h+='<div style="display:flex;gap:8px">';
      h+='<button class="btn-sm btn-sm-primary" onclick="acceptInvitation('+inv.id+')">✓ 接受</button>';
      h+='<button class="btn-sm" onclick="rejectInvitation('+inv.id+')" style="color:#ef4444">✗ 拒绝</button>';
      h+='</div></div>';
    }
    el.innerHTML=h;
  }else{el.innerHTML='<div class="empty-state">暂无邀请</div>'}
}

async function acceptInvitation(id){
  try{
    dbg('acceptInvitation id=',id);
    // get invitation
    var invs=await callAdmin('select','invitations',{query:'*',filters:[{col:'id',op:'eq',val:id}]});
    var inv=(invs&&invs.data&&invs.data.length>0)?invs.data[0]:null;
    dbg('inv found:',inv);
    if(!inv){showToast('邀请不存在');return}
    // check already member
    var mems=await callAdmin('select','company_memberships',{query:'*',filters:[{col:'user_id',op:'eq',val:currentUser.id},{col:'company_id',op:'eq',val:inv.from_company_id}]});
    if(mems&&mems.data&&mems.data.length>0&&mems.data[0].status==='active'){
      await callAdmin('update','invitations',{filters:[{col:'id',op:'eq',val:id}],payload:{status:'accepted'}});
      showToast('已是该公司成员，刷新中...');setTimeout(function(){location.reload()},800);return;
    }
    // insert membership
    var mr=await callAdmin('insert','company_memberships',{payload:{user_id:currentUser.id,company_id:inv.from_company_id,role:inv.role||'member',status:'active'}});
    dbg('membership insert:',mr);
    if(mr&&mr.error&&mr.error.code!=='23505'){showToast('加入失败: '+(mr.error.message||''));return}
    // update profiles
    await callAdmin('update','profiles',{filters:[{col:'user_id',op:'eq',val:currentUser.id}],payload:{company_id:inv.from_company_id}});
    // mark accepted
    await callAdmin('update','invitations',{filters:[{col:'id',op:'eq',val:id}],payload:{status:'accepted'}});
    showToast('已加入公司！刷新中...');
    setTimeout(function(){location.reload()},800);
  }catch(e){console.error('acceptInvitation error:',e);showToast('操作失败: '+(e.message||e.toString()))}
}

async function rejectInvitation(id){
  try{
    await callAdmin('update','invitations',{filters:[{col:'id',op:'eq',val:id},{col:'to_email',op:'eq',val:currentUser.email}],payload:{status:'rejected'}});
    showToast('已拒绝');
    loadMyInvitations();
  }catch(e){console.error('rejectInvitation error:',e);showToast('操作失败: '+(e.message||e.toString()))}
}

async function loadActivityLogs(){
  var el=document.getElementById('activity-list');
  el.innerHTML=skRows(5);
  if(!currentUser)return;
  var {data:logs}=await sb.from('activity_logs').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(80);
  if(logs&&logs.length){
    var actionIcon={create:'➕',update:'✏️',delete:'🗑️',status_change:'🔄'};
    var h='';
    for(var i=0;i<logs.length;i++){
      var l=logs[i];var d=new Date(l.created_at);
      var timeStr=isToday(d)?d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
      var detail=typeof l.details==='string'?JSON.parse(l.details):(l.details||{});
      h+='<div class="log-item"><span class="log-icon">'+(actionIcon[l.action]||'📋')+'</span><div class="log-body"><div class="log-title">'+escHtml(l.action==='create'?'创建了':l.action==='update'?'更新了':l.action==='delete'?'删除了':'变更了')+' '+escHtml(l.entity_type)+'#'+l.entity_id+(l.entity_name?' ('+escHtml(l.entity_name)+')':'')+'</div><div class="log-time">'+timeStr+'</div></div></div>';
    }
    el.innerHTML=h;
  }else{el.innerHTML='<div class="empty-state">暂无操作记录</div>'}
}

function isToday(d){var now=new Date();return d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()&&d.getDate()===now.getDate()}

function escAttr(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}

// Toast system
function showToast(msg,type){
  dbg("[TOAST] "+msg);

  type=type||'info';
  var colors={info:'var(--primary)',success:'#10B981',warning:'#F59E0B',error:'#EF4444'};
  var icons={info:'ℹ️',success:'✅',warning:'⚠️',error:'❌'};
  var tc=document.getElementById('toast-container');
  if(!tc)return;
  var t=document.createElement('div');t.className='toast toast-'+type;
  t.innerHTML='<span class="toast-icon">'+(icons[type]||'')+'</span>'+escHtml(msg);
  t.style.borderLeftColor=colors[type]||'var(--primary)';
  tc.appendChild(t);
  setTimeout(function(){t.classList.add('toast-out');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},300)},3500);
}

// Hook: auto-notify on key events (called after successful CRUD)

// Poll notifications periodically (called in onLoginSuccess + switchTab)
async function pollNotifications(){
  if(!currentUser||!currentCompanyId)return;
  var {count}=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('company_id',currentCompanyId).eq('is_read',false);
  notifUnread=count||0;updateBellBadge();
}
function switchTab(tab){
  var cv=document.getElementById('client-view');
  var ov=document.getElementById('order-view');
  var rv=document.getElementById('reports-view');
  var av=document.getElementById('admin-view');
  var sv=document.getElementById('sales-view');
  var iv=document.getElementById('inventory-view');
  var spv=document.getElementById('suppliers-view');
  var pv=document.getElementById('performance-view');
  var purchv=document.getElementById('purchase-view');
  var tc=document.getElementById('tab-clients');
  var to=document.getElementById('tab-orders');
  var ta=document.getElementById('tab-admin');
  var ti=document.getElementById('tab-inventory');
  var fab=document.getElementById('main-fab');
  closeMoreMenu();
  _destroyAllCharts();
  document.getElementById('settings-screen').style.display='none';
  document.getElementById('my-screen').style.display='none';
  // Hide all views first
    var anv=document.getElementById('analytics-view');
  var lv=document.getElementById('leads-view');
  var allViews=[cv,ov,rv,av,sv,iv];if(spv)allViews.push(spv);if(pv)allViews.push(pv);if(lv)allViews.push(lv);var colv2=document.getElementById('collab-view');if(colv2)allViews.push(colv2);var sv2=document.getElementById('service-view');if(sv2)allViews.push(sv2);if(purchv)allViews.push(purchv);var pjv=document.getElementById('projects-view');if(pjv)allViews.push(pjv);if(anv)allViews.push(anv);
  var fwv=document.getElementById('fieldwork-view');if(fwv)allViews.push(fwv);
  for(var i=0;i<allViews.length;i++)if(allViews[i]){allViews[i].classList.add('hidden');allViews[i].style.display='';allViews[i].style.visibility='';}
  // Admin sub-panels outside admin-view must also hide
  var ag=document.getElementById('admin-grants');if(ag)ag.classList.add('hidden');
  // Deactivate all tabs
  var tr=document.getElementById('tab-reports');var tan=document.getElementById('tab-analytics');
  var allTabs=[tc,to,document.getElementById('tab-service'),document.getElementById('tab-collab'),document.getElementById('tab-projects'),tr,ta,ti];if(tan)allTabs.push(tan);var tfw=document.getElementById('tab-fieldwork');if(tfw)allTabs.push(tfw);for(var j=0;j<allTabs.length;j++)if(allTabs[j])allTabs[j].classList.remove('active');
  fab.classList.add('hidden');

      if(tab==='clients'){
    cv.classList.remove('hidden');tc.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openForm()};
    document.getElementById('topbar-title').textContent='客户管理';
    loadClients();
  }else if(tab==='orders'){
    ov.classList.remove('hidden');to.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openOrderForm()};
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('orders');
  }else if(tab==='sales'){
    // Sales accessed via biz-tabs or more-menu → go through orders
    ov.classList.remove('hidden');to.classList.add('active');
    fab.classList.remove('hidden');fab.textContent='+';fab.onclick=function(){openSalesForm()};
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('sales');
  }else if(tab==='performance'){
    // Performance accessed via biz-tabs or more-menu → go through orders
    ov.classList.remove('hidden');to.classList.add('active');
    document.getElementById('topbar-title').textContent='业务管理';
    switchBizTab('performance');
  }else if(tab==='inventory'){
    iv.classList.remove('hidden');ti.classList.add('active');
    document.getElementById('topbar-title').textContent='供应链';
    switchResTab('scouting');
  }else if(tab==='suppliers'){
    iv.classList.remove('hidden');ti.classList.add('active');
    document.getElementById('topbar-title').textContent='供应链';
    switchResTab('suppliers');
  }else if(tab==='reports'){
    rv.classList.remove('hidden');tr.classList.add('active');
    fab.classList.add('hidden');
    document.getElementById('topbar-title').textContent='报表中心';
    loadReportSummary();switchReportsTab('sales');
  }else if(tab==='service'){
    var sv2=document.getElementById('service-view');
    if(sv2)sv2.classList.remove('hidden');
    switchServiceTab('tickets');return}
  if(tab==='analytics'){
    var anv=document.getElementById('analytics-view');
    if(anv){anv.classList.remove('hidden');anv.style.display='';anv.style.visibility='visible';}
    var tan=document.getElementById('tab-analytics');if(tan)tan.classList.add('active');
    document.getElementById('topbar-title').textContent='经营分析';
    fab.classList.add('hidden');
    switchAnalyticsTab('overview');
    return;
  }
  if(tab==='projects'){
    var pjv=document.getElementById('projects-view');
    pjv.classList.remove('hidden');pjv.style.display='';pjv.style.visibility='visible';
    document.getElementById('tab-projects').classList.add('active');
    document.getElementById('topbar-title').textContent='项目管理';
    fab.classList.add('hidden');
    if(typeof switchProjectTab==='function'){switchProjectTab('list')}else{console.error('switchProjectTab not defined')};
    return;
  }
  if(tab==='admin'){
    av.classList.remove('hidden');ta.classList.add('active');
    document.getElementById('topbar-title').textContent='组织管理';
    switchAdminTab('users');
  }else if(tab==='collab'){
  var colv=document.getElementById('collab-view');
  colv.classList.remove('hidden');document.getElementById('tab-collab').classList.add('active');
  document.getElementById('topbar-title').textContent='协同办公';
  switchCollabTab('schedule');
} else if(tab==='fieldwork'){
    var fwv=document.getElementById('fieldwork-view');
    fwv.classList.remove('hidden');
    document.getElementById('tab-fieldwork').classList.add('active');
    document.getElementById('topbar-title').textContent='外勤管理';
    fab.classList.add('hidden');


  dbg("[FW] switchTab fieldwork triggered");
  // DEBUG: force visibility
  var fwv2=document.getElementById("fieldwork-view");
  if(fwv2){
    fwv2.style.display="block";
    fwv2.style.visibility="visible";
    fwv2.style.opacity="1";
    fwv2.style.height="auto";
    fwv2.style.overflow="visible";
    dbg("[FW] fieldwork-view offsetWidth:",fwv2.offsetWidth,"offsetHeight:",fwv2.offsetHeight);
    dbg("[FW] fieldwork-view computed display:",getComputedStyle(fwv2).display);
    dbg("[FW] fieldwork-view computed visibility:",getComputedStyle(fwv2).visibility);
  }
  // Check fw-overview
  var fwov=document.getElementById("fw-overview");
  if(fwov){
    dbg("[FW] fw-overview offsetWidth:",fwov.offsetWidth,"offsetHeight:",fwov.offsetHeight);
    dbg("[FW] fw-overview classList:",fwov.className);
  }
  // Check fw-ov-kpi
  var fwok=document.getElementById("fw-ov-kpi");
  if(fwok){
    dbg("[FW] fw-ov-kpi exists, offsetHeight:",fwok.offsetHeight);
  }else{
    dbg("[FW] ⛔ fw-ov-kpi NOT FOUND in DOM!");
  }

    switchFWTab('overview');
  }

}

function handleFab(){
  var ov=document.getElementById('order-view');
  if(ov.classList.contains('hidden'))openForm();else openOrderForm();
}

// === Order Form ===
async function openOrderForm(id){
  // Ensure client data is loaded for the search input
  if(!allClients.length) await loadClients();
  orderEditId=id||null;
  orderClientId=null;orderClientName='';
  orderStage='谈判中';
  document.getElementById('order-form-title').textContent=id?'编辑订单':'创建订单';
  document.getElementById('order-btn-delete').classList.toggle('hidden',!id);
  document.getElementById('of-client-search').value='';
  document.getElementById('of-client-list').classList.add('hidden');
  var cs=document.getElementById('of-client-selected');cs.style.display='none';cs.textContent='';
  document.getElementById('of-project').value='';
  document.getElementById('of-amount').value='';
  document.getElementById('of-start-date').value='';
  document.getElementById('of-expected-date').value='';
  document.getElementById('of-actual-date').value='';
  document.getElementById('of-notes').value='';
  buildStageGrid();
  if(id){
    var o=allOrders.find(function(x){return x.id===id});
    if(o){
      orderClientId=o.client_id;
      orderStage=o.stage||'谈判中';
      document.getElementById('of-number').value=o.order_number||'';
      document.getElementById('of-project').value=o.project_name||'';
      document.getElementById('of-start-date').value=o.start_date||'';
      document.getElementById('of-expected-date').value=o.expected_date||'';
      document.getElementById('of-actual-date').value=o.actual_date||'';
      document.getElementById('of-notes').value=o.notes||'';
      buildStageGrid();
      // Decrypt amount
      decryptAmount(o.amount_enc||'').then(function(v){
        document.getElementById('of-amount').value=v||'';
      });
      // Set client name
      var cl=allClients.find(function(x){return x.id===o.client_id});
      if(cl){orderClientName=cl.name;cs.style.display='block';cs.textContent='已选择: '+cl.name}
    }
  }else{
    document.getElementById('of-number').value='';
    loadConfigCenter().then(function(){
      buildStageGrid();
      if(orderEditId)return;
      autoFillOrderNumber().then(function(){
        if(!document.getElementById('of-number').value.trim()){
          document.getElementById('of-number').value='ORD-'+Date.now().toString(36).toUpperCase();
        }
      });
    });
  }
  document.getElementById('order-form-modal').classList.remove('hidden');
}

function closeOrderForm(){
  document.getElementById('order-form-modal').classList.add('hidden');
  orderEditId=null;orderClientId=null;orderClientName='';
}

function buildStageGrid(){
  var g=document.getElementById('order-stage-grid');
  if(!g)return;
  var list=orderStageList();
  if(list.indexOf(orderStage)<0)orderStage=list[0]||orderStage;
  var out='';
  for(var i=0;i<list.length;i++){
    out+='<div class="order-stage-opt'+(list[i]===orderStage?' selected':'')+'" onclick="selOrderStage(\''+jsStr(list[i])+'\')">'+h(list[i])+'</div>';
  }
  g.innerHTML=out;
}

function selOrderStage(stage){
  orderStage=stage;
  var opts=document.querySelectorAll('.order-stage-opt');
  for(var i=0;i<opts.length;i++)opts[i].classList.toggle('selected',opts[i].textContent===stage);
}

function searchOrderClient(){
  var q=(document.getElementById('of-client-search').value||'').trim().toLowerCase();
  var list=document.getElementById('of-client-list');
  if(q.length<2){list.classList.add('hidden');list.innerHTML='';return}
  // Show spinner while potentially loading
  if(!allClients.length){list.classList.remove('hidden');list.innerHTML='<div class="search-list-item" style="color:var(--text3)">加载客户中...</div>';loadClients().then(function(){searchOrderClient()});return}
  var matches=allClients.filter(function(c){return c.name.toLowerCase().indexOf(q)>=0}).slice(0,8);
  if(!matches.length){list.innerHTML='<div class="search-list-item" style="color:var(--text3)">无匹配客户</div>';list.classList.remove('hidden');return}
  var h='';
  for(var i=0;i<matches.length;i++)h+='<div class="search-list-item" onclick="pickOrderClient(\''+matches[i].id+'\',\''+escHtml(matches[i].name)+'\')"><div class="name">'+escHtml(matches[i].name)+'</div></div>';
  list.innerHTML=h;list.classList.remove('hidden');
}

function pickOrderClient(id,name){
  orderClientId=id;orderClientName=name;
  document.getElementById('of-client-search').value='';
  document.getElementById('of-client-list').classList.add('hidden');
  var cs=document.getElementById('of-client-selected');cs.style.display='block';cs.textContent='已选择: '+name;
}

// === Save Order ===
async function saveOrder(){
  dbg('[saveOrder] start',{orderEditId,orderClientId,orderStage,currentCompanyId});
  vfClearAll(document.getElementById('order-form-modal'));
  if(!orderClientId){vfMark(document.getElementById('of-client-search'),'请先选择关联客户');vfScrollToError();showToast('请选择关联客户');return}
  var numEl=document.getElementById('of-number');
  var number=numEl.value.trim();if(!number){vfMark(numEl,'请填写订单编号');vfScrollToError();return}
  var amtEl=document.getElementById('of-amount');
  var amountStr=amtEl.value.trim();
  if(!amountStr||isNaN(parseFloat(amountStr))||parseFloat(amountStr)<0){vfMark(amtEl,'请填写有效金额（不小于 0）');vfScrollToError();return}
  var amount=parseFloat(amountStr);
  var amountEnc=await encryptAmount(amount.toFixed(2));

  var order={
    client_id:orderClientId,
    order_number:number,
    project_name:document.getElementById('of-project').value.trim(),
    amount_enc:amountEnc,
    stage:orderStage,
    start_date:document.getElementById('of-start-date').value||null,
    expected_date:document.getElementById('of-expected-date').value||null,
    actual_date:document.getElementById('of-actual-date').value||null,
    notes:document.getElementById('of-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!orderEditId)order.user_id=currentUser.id;

  if(!orderEditId){
    order.company_id=currentCompanyId;
    dbg('[saveOrder] inserting order',{cols:Object.keys(order),vals:JSON.stringify(order)});
    var {error}=await sb.from('orders').insert(order);
    if(error){console.error('[saveOrder] insert error',JSON.stringify(error));showToast('创建失败: '+(error.message||JSON.stringify(error)));return}
    showToast('订单已创建');
  }else{
    var {error}=await sb.from('orders').update(order).eq('id',orderEditId);
    if(error){showToast('更新失败: '+error.message);return}
    showToast('订单已更新');
  }
  closeOrderForm();
  await loadOrders();
  if(!document.getElementById('order-view').classList.contains('hidden'))renderOrders();
  else renderList();
}

async function loadOrders(){
  try{
    if(currentCompanyId)loadConfigCenter();
    var {data,error}=await sb.from('orders').select('*').eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
    if(error){console.error('loadOrders:',error);return}
    allOrders=(data||[]);
    // Decrypt amounts
    for(var i=0;i<allOrders.length;i++){
      allOrders[i]._amount=allOrders[i].amount||0;
      try{
        var dec=await decryptAmount(allOrders[i].amount_enc||'');
        if(dec)allOrders[i]._amount=parseFloat(dec)||0;
      }catch(e){}
    }
  }catch(e){console.error('loadOrders error:',e)}
}

function renderOrders(){
  var stageF=document.getElementById('order-stage-filter').value;
  var query=(document.getElementById('order-search').value||'').trim().toLowerCase();
  var list=allOrders.slice();

  if(stageF!=='all')list=list.filter(function(o){return o.stage===stageF});
  if(query){
    list=list.filter(function(o){
      var cn='';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=cl.name.toLowerCase();
      return (o.order_number||'').toLowerCase().indexOf(query)>=0||cn.indexOf(query)>=0||(o.project_name||'').toLowerCase().indexOf(query)>=0||(o.notes||'').toLowerCase().indexOf(query)>=0;
    });
  }

  _orderFiltered=list;
  var _osize=orderPageSize();
  var _opages=Math.max(1,Math.ceil(list.length/_osize));
  if(orderPage<1)orderPage=1;
  if(orderPage>_opages)orderPage=_opages;
  var pageList=list.slice((orderPage-1)*_osize,orderPage*_osize);

  // Stats
  var statHtml='',totalAmt=0,negAmt=0,sigAmt=0,exeAmt=0,comAmt=0;
  for(var i=0;i<list.length;i++){totalAmt+=list[i]._amount||0}
  for(var i=0;i<list.length;i++){
    var a=list[i]._amount||0;
    if(list[i].stage==='谈判中')negAmt+=a;
    else if(list[i].stage==='已签约')sigAmt+=a;
    else if(list[i].stage==='执行中')exeAmt+=a;
    else if(list[i].stage==='已完成')comAmt+=a;
  }
  statHtml='<div class="order-stat"><div class="os-num">'+list.length+'</div><div class="os-label">订单数</div></div>';
  statHtml+='<div class="order-stat"><div class="os-num">'+formatMoney(totalAmt)+'</div><div class="os-label">总额</div></div>';
  statHtml+='<div class="order-stat"><div class="os-num">'+formatMoney(negAmt+sigAmt+exeAmt)+'</div><div class="os-label">进行中</div></div>';
  document.getElementById('order-stats').innerHTML=statHtml;

  // Grid
  var grid=document.getElementById('order-grid'),empty=document.getElementById('order-empty');
  if(list.length===0){grid.innerHTML='';empty.classList.remove('hidden');renderPagerInto('order-pager',0,_osize,orderPage,_opages,'goOrderPage');return}
  empty.classList.add('hidden');
  var html='';
  for(var i=0;i<pageList.length;i++){
    var o=pageList[i],sc=stageClass(o.stage);
    var cn='';var cl=allClients.find(function(x){return x.id===o.client_id});if(cl)cn=h(cl.name);
    html+='<div class="order-card" onclick="openOrderForm(\''+o.id+'\')" style="--card-bar:'+stageColor(o.stage)+'">';
    html+='<div class="oc-number">#'+h(o.order_number||'')+' · <span class="stage-badge '+sc+'">'+h(o.stage)+'</span></div>';
    html+='<div class="oc-header"><span class="oc-client">'+cn+'</span><span class="oc-amount">'+formatMoney(o._amount||0)+'</span></div>';
    if(o.project_name)html+='<div class="oc-project">📋 '+h(o.project_name)+'</div>';
    var dates=[];
    if(o.start_date)dates.push('起: '+o.start_date);
    if(o.expected_date)dates.push('预: '+o.expected_date);
    if(o.actual_date)dates.push('完: '+o.actual_date);
    if(dates.length)html+='<div class="oc-dates">'+dates.join(' · ')+'</div>';
    if(o.notes)html+='<div class="oc-notes">💬 '+h(o.notes)+'</div>';
    html+='</div>';
  }
  grid.innerHTML=html;
  renderPagerInto('order-pager',list.length,_osize,orderPage,_opages,'goOrderPage');
}

function formatMoney(v){
  if(v==null||isNaN(v=parseFloat(v)))return '0';
  if(v>=10000)return (v/10000).toFixed(1)+'万';
  return v.toFixed(0);
}
var fmtNum=formatMoney;

// === Delete Order ===
function confirmDeleteOrder(){document.getElementById('order-confirm').classList.remove('hidden');orderDeleteId=orderEditId}
async function doDeleteOrder(){
  if(!orderDeleteId)return;
  document.getElementById('order-confirm').classList.add('hidden');
  var {error}=await sb.from('orders').delete().eq('id',orderDeleteId);
  if(error){showToast('删除失败: '+error.message);return}
  showToast('订单已删除');
  closeOrderForm();
  await loadOrders();
  renderOrders();
  renderList();
}

// === Client Card: Add order summary ===
var _clientOrderCache={};
function getClientOrderSummary(clientId){
  if(_clientOrderCache[clientId])return _clientOrderCache[clientId];
  var orders=allOrders.filter(function(o){return o.client_id===clientId});
  var total=0,count=orders.length;
  for(var i=0;i<orders.length;i++)total+=orders[i]._amount||0;
  var r={count:count,total:total};
  _clientOrderCache[clientId]=r;
  return r;
}
