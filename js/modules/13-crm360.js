// ==========================================================================
// grsds · 13-crm360.js  —  Client360 · 线索公海 · 协作 · 日程/任务/审批
// 源: js/app_v2.js 第 8747-9873 行（机械切片，未改一行代码）
// ==========================================================================
// ============ NEW: Client 360 Functions ============
function closeClient360(){
  _destroyChart('c360Bidding');
  document.getElementById('client360-modal').classList.add('hidden');
  c360ClientId=null;
}

async function openClient360(clientId){
  c360ClientId=clientId;
  var c=allClients.find(function(x){return x.id===clientId});
  if(!c){showToast('客户不存在');return}
  // Load client data
  var badgeHtml='';
  if(c.grade)badgeHtml+='<span class="grade-badge '+h(c.grade)+'">'+h(c.grade)+'级</span>';
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var stage=c.lifecycle_stage||'prospect';
  badgeHtml+=' <span class="lifecycle-badge '+h(stage)+'">'+(stageMap[stage]||stage)+'</span>';
  document.getElementById('c360-name').textContent=c.name||'';
  document.getElementById('c360-badges').innerHTML=badgeHtml;
  // Load orders
  var {data:orders}=await sb.from('orders').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('updated_at',{ascending:false});
  c360Orders=orders||[];
  for(var oi=0;oi<c360Orders.length;oi++){
    c360Orders[oi]._amount=c360Orders[oi].amount||0;
    var dec=await decryptAmount(c360Orders[oi].amount_enc||'');
    if(dec)c360Orders[oi]._amount=parseFloat(dec)||0;
  }
  switchClient360Tab('overview');
  document.getElementById('client360-modal').classList.remove('hidden');
}

function switchClient360Tab(tab){
  c360ActiveTab=tab;
  var tabs=document.querySelectorAll('.client-360-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-tab')===tab);
  var c=allClients.find(function(x){return x.id===c360ClientId});
  if(!c)return;
  // 图表挂在 #c360-body 里，切 tab / 换客户 / 关弹窗都必须先销毁，否则旧实例会抱着已移除的 canvas
  _destroyChart('c360Bidding');
  if(tab==='overview')renderClient360Overview(c,c360Orders);
  else if(tab==='bidding')renderClient360Bidding(c);
  else if(tab==='contacts')renderClient360Contacts(c);
  else if(tab==='orders')renderClient360Orders(c);
  else if(tab==='engagements')renderClient360Engagements(c.id);
  else if(tab==='lifecycle')renderClient360Lifecycle(c.id);
}

// ============================================================
// 客户 · 历史项目招标统计（近 N 年柱状图）
// 数据源只有 clients.projects 里的 bidding_date —— 招标日期是这类客户
// 唯一的「时间轴」，所以按它归年；分包的金额按包累加。
// ============================================================
var c360BidYears=6;        // 默认看近 6 年（含今年）
var c360BidYearsPicked=0;  // 用户最近一次点的年数（0=还没点过，用默认）
var c360BidMetric='count'; // count=招标项目数 | amount=招标金额

function client360ProjectsOf(c){
  var projs=[];
  if(!c)return projs;
  try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
  // 老数据只在客户顶层存了一个项目 + 招标日期，顺手兜底，否则这批客户图上一根柱子都没有
  if(!projs.length&&(c.project||c.bidding_date)){
    projs=[{project_name:c.project||'',bidding_date:c.bidding_date||'',bid_amount:c.bid_amount||''}];
  }
  return projs;
}

// 'YYYY-MM-DD' / 'YYYY/MM/DD' / 'YYYY年M月D日' 都取前四位；取不到返回 0（视为没填日期）
function projectBidYear(p){
  var s=String((p&&p.bidding_date)||'').trim();
  var m=s.match(/(\d{4})/);
  if(!m)return 0;
  var y=parseInt(m[1],10);
  if(!y||y<1990||y>2100)return 0;
  return y;
}

// 一个项目的招标金额：分包就累加各包中标额（没填中标额就退该包预算），单包/不分包直接取顶层
function projectBidAmount(p){
  p=p||{};
  var sum=0,any=false;
  if(projectHasPackages(p)){
    var packs=projectPackagesOf(p);
    for(var i=0;i<packs.length;i++){
      var v=parseFloat(packs[i].bid_amount||'');
      if(!(v>0))v=parseFloat(packs[i].project_budget||'');
      if(v>0){sum+=v;any=true}
    }
  }
  if(!any){
    var t=parseFloat(p.bid_amount||'');
    if(!(t>0))t=parseFloat(p.project_budget||'');
    if(t>0){sum=t;any=true}
  }
  return any?sum:0;
}

// 是不是复购项目。19-renewal.js 在 13 之后加载，所以这里必须留一条保守分支：
// 没有判定函数时只认显式 true，绝不自己猜（避免统计页在极端加载顺序下算错）
function projectRenewalFlag(p,projs){
  if(!p)return false;
  if(typeof projectRenewalOf==='function')return !!projectRenewalOf(p,projs).is;
  return p.is_renewal===true;
}

// 按招标年份聚合。返回 {years:[...升序], map:{年: {count,amount,renew,renewAmount}}, undated, total, earliest}
function clientBiddingStats(c,years){
  var n=years&&years>0?years:c360BidYears;
  var nowY=new Date().getFullYear();
  var list=[];
  for(var i=n-1;i>=0;i--)list.push(nowY-i);
  var map={},undated={count:0,amount:0,renew:0,renewAmount:0},total={count:0,amount:0,renew:0,renewAmount:0},earliest=0;
  for(var k=0;k<list.length;k++)map[list[k]]={count:0,amount:0,renew:0,renewAmount:0};
  var projs=client360ProjectsOf(c);
  for(var pi=0;pi<projs.length;pi++){
    var pr=projs[pi],y=projectBidYear(pr),amt=projectBidAmount(pr);
    var rw=projectRenewalFlag(pr,projs);
    if(y){
      if(!earliest||y<earliest)earliest=y;
      // 早于统计窗口的年份：也算进 total，但不进柱子（否则「合计」和柱子对不上会让人困惑）
      if(map[y]===undefined)map[y]={count:0,amount:0,renew:0,renewAmount:0};
      map[y].count++;map[y].amount+=amt;
      if(rw){map[y].renew++;map[y].renewAmount+=amt}
    }else{
      undated.count++;undated.amount+=amt;
      if(rw){undated.renew++;undated.renewAmount+=amt}
    }
    total.count++;total.amount+=amt;
    if(rw){total.renew++;total.renewAmount+=amt}
  }
  // 数据比默认窗口还老（比如 5 年前的老客户），把窗口往前拉到最早那一年
  if(earliest&&earliest<list[0]){
    var pre=[];
    for(var yy=earliest;yy<list[0];yy++)pre.push(yy);
    list=pre.concat(list);
    for(var qi=0;qi<pre.length;qi++){
      if(map[pre[qi]]===undefined)map[pre[qi]]={count:0,amount:0,renew:0,renewAmount:0};
    }
  }
  var wins=0;
  for(var wi=0;wi<list.length;wi++)if(map[list[wi]].count>0)wins++;
  return {years:list,map:map,undated:undated,total:total,activeYears:wins,earliest:earliest};
}

function setC360BidYears(n){
  // 数据比所选窗口还老时（统计会把窗口往前拉），记下用户到底点了几年，
  // 否则点了「近3年」却还是显示 6 根柱子，看起来像没反应
  c360BidYears=n;
  c360BidYearsPicked=n;
  var c=allClients.find(function(x){return x.id===c360ClientId});
  if(c)renderClient360Bidding(c);
}

function setC360BidMetric(m){
  c360BidMetric=(m==='amount')?'amount':'count';
  var c=allClients.find(function(x){return x.id===c360ClientId});
  if(c)renderClient360Bidding(c);
}

function renderClient360Bidding(c){
  var st=clientBiddingStats(c,c360BidYears);
  var isAmt=c360BidMetric==='amount';
  var hasRenew=st.total.renew>0;
  var segBtn=function(val,label){
    var on=(isAmt?'amount':'count')===val;
    return '<button onclick="setC360BidMetric(\''+val+'\')" style="padding:4px 10px;font-size:12px;border-radius:14px;cursor:pointer;border:1px solid '+(on?'var(--primary)':'var(--border)')+';background:'+(on?'var(--primary)':'transparent')+';color:'+(on?'#fff':'var(--text2)')+'">'+label+'</button>';
  };
  var yearBtn=function(n){
    // c360BidYears 可能被统计函数往前拉（数据更老），高亮跟着用户点的那个走
    var on=(c360BidYearsPicked||c360BidYears)===n;
    return '<button onclick="setC360BidYears('+n+')" style="padding:4px 10px;font-size:12px;border-radius:14px;cursor:pointer;border:1px solid '+(on?'var(--primary)':'var(--border)')+';background:'+(on?'var(--primary)':'transparent')+';color:'+(on?'#fff':'var(--text2)')+'">近'+n+'年</button>';
  };
  var html='';
  // ── 概览数字：招标项目数 / 招标金额 / 有招标的年份
  html+='<div class="c360-card"><div class="c360-card-title">📊 招标总览</div><div class="c360-stats">';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+st.total.count+'</div><div class="c360-stat-label">历史项目</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num" style="font-size:16px">'+formatMoney(st.total.amount)+'</div><div class="c360-stat-label">招标金额</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+st.activeYears+'</div><div class="c360-stat-label">有招标年份</div></div>';
  html+='</div>';
  // 复购：单独一行 chip，不硬塞进三格统计（4 格在 480px 侧栏里会被挤成两行，
  // 金额又长，反而不如一行文字好读）
  if(st.total.count){
    var _rwRate=Math.round(st.total.renew/st.total.count*100);
    html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'
      +'<span class="tag-chip" style="background:var(--warning-light);color:#B45309">♻️ 复购项目 '+st.total.renew+' 个</span>'
      +'<span class="tag-chip">复购占比 '+_rwRate+'%</span>'
      +(st.total.renewAmount>0?'<span class="tag-chip">复购金额 '+formatMoney(st.total.renewAmount)+'</span>':'')
      +'</div>';
  }
  if(st.undated.count>0)html+='<div style="font-size:11px;color:var(--warning);margin-top:8px">⚠️ 有 '+st.undated.count+' 个项目没填招标日期，未计入年度统计</div>';
  html+='</div>';

  // ── 柱状图
  html+='<div class="c360-card"><div class="c360-card-title" style="justify-content:space-between;flex-wrap:wrap;gap:6px">📅 近年招标趋势'
    +'<span style="display:inline-flex;gap:4px;font-weight:400">'+segBtn('count','项目数')+segBtn('amount','金额')+'</span></div>';
  // 年份按钮按「最早那一年」动态给区间，避免老客户想看更早的数据却没入口。
  // 至少保 3 档，否则只剩一两个按钮反而不好点（够不到的档位会被统计函数往前拉满）
  var _span=st.earliest?Math.max(1,new Date().getFullYear()-st.earliest+1):6;
  var _opts=[],_cand=[3,5,6,10];
  for(var ci2=0;ci2<_cand.length;ci2++){
    if(_cand[ci2]<_span&&_opts.length>=2)continue;
    _opts.push(_cand[ci2]);
  }
  var _btns='';
  for(var bi=0;bi<_opts.length;bi++)_btns+=yearBtn(_opts[bi]);
  html+='<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">'+_btns+'</div>';
  if(!st.total.count){
    html+='<div class="empty" style="padding:30px">该项目还没有录入招标日期，先在「编辑客户 · 近期项目」里补上，才能看出年度趋势</div>';
  }else{
    // Chart.js 在弹窗里需要固定高度的容器，否则会随内容撑成 0
    html+='<div style="position:relative;height:200px;width:100%"><canvas id="c360-bid-chart"></canvas></div>';
  }
  html+='</div>';

  // ── 逐年明细（图看趋势，表看准数）
  if(st.total.count){
    html+='<div class="c360-card"><div class="c360-card-title">📋 逐年明细</div>';
    html+='<div class="c360-info-row" style="font-size:11px;color:var(--text3);border-bottom:1px solid var(--border);padding-bottom:4px"><span style="flex:1">年份</span>'
      +'<span style="width:52px;text-align:right">项目数</span>'
      +(hasRenew?'<span style="width:44px;text-align:right">复购</span>':'')
      +'<span style="width:'+(hasRenew?78:88)+'px;text-align:right">招标金额</span></div>';
    for(var i=st.years.length-1;i>=0;i--){
      var y=st.years[i],d=st.map[y]||{count:0,amount:0,renew:0};
      if(!d.count&&!isAmt)continue;          // 只看项目数时，空年份不必占版面
      html+='<div class="c360-info-row" style="font-size:12px"><span style="flex:1">'+y+' 年'+(d.count?'':' <span style="color:var(--text3)">（无）</span>')+'</span>'
        +'<span style="width:52px;text-align:right">'+d.count+'</span>'
        +(hasRenew?'<span style="width:44px;text-align:right;'+(d.renew?'color:#B45309;font-weight:600':'color:var(--text3)')+'">'+(d.renew||'-')+'</span>':'')
        +'<span style="width:'+(hasRenew?78:88)+'px;text-align:right">'+(d.amount?formatMoney(d.amount):'-')+'</span></div>';
    }
    html+='</div>';
  }
  var body=document.getElementById('c360-body');
  if(body)body.innerHTML=html;

  // canvas 已进 DOM 才能建图
  var ctx=document.getElementById('c360-bid-chart');
  if(!ctx)return;
  if(typeof Chart==='undefined')return;
  var labels=st.years.map(function(y){return y+'年'});
  var vals=st.years.map(function(y){var d=st.map[y]||{};return isAmt?(d.amount||0):(d.count||0)});
  var renewVals=st.years.map(function(y){var d=st.map[y]||{};return isAmt?(d.renewAmount||0):(d.renew||0)});
  var newVals=st.years.map(function(v,i){return Math.max(0,vals[i]-renewVals[i])});
  var nowY=new Date().getFullYear();
  // 有复购才拆成两组堆叠：没有复购时保持原来单色柱（多数客户第一次看都还没有复购，
  // 凭空多出一条「复购 0」的图例只是噪音）
  var colors=st.years.map(function(y){
    if(hasRenew)return y===nowY?'#B45309':'#F59E0B';
    if(y===nowY)return '#F59E0B';       // 今年高亮，一眼看到最新进度
    return isAmt?'rgba(16,185,129,.85)':'#6366F1';
  });
  var newColors=st.years.map(function(y){
    if(y===nowY)return '#4338CA';
    return isAmt?'rgba(16,185,129,.85)':'#6366F1';
  });
  var datasets=hasRenew?[
    {label:'新项目',data:newVals,backgroundColor:newColors,borderRadius:3,maxBarThickness:36,stack:'bid'},
    {label:'复购',data:renewVals,backgroundColor:colors,borderRadius:3,maxBarThickness:36,stack:'bid'}
  ]:[{
    label:isAmt?'招标金额':'招标项目数',
    data:vals,
    backgroundColor:colors,
    borderRadius:6,
    maxBarThickness:36
  }];
  _destroyChart('c360Bidding');
  _chartInstances.c360Bidding=new Chart(ctx,{
    type:'bar',
    data:{labels:labels,datasets:datasets},
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{
        legend:hasRenew?{display:true,position:'bottom',labels:{boxWidth:10,boxHeight:10,font:{size:10},padding:8}}:{display:false},
        tooltip:{callbacks:{
          label:function(it){
            var v=it.parsed.y||0;
            var name=hasRenew?(it.dataset.label+' '):(isAmt?'招标金额 ':'招标项目数 ');
            return name+(isAmt?formatMoney(v):v+' 个');
          },
          footer:function(items){
            if(!hasRenew)return '';
            var sum=0;
            for(var fi=0;fi<items.length;fi++)sum+=items[fi].parsed.y||0;
            return '合计 '+(isAmt?formatMoney(sum):sum+' 个');
          }
        }}
      },
      scales:{
        y:{beginAtZero:true,stacked:hasRenew,ticks:{precision:isAmt?undefined:0,maxTicksLimit:5,
          callback:function(v){if(!isAmt)return v;return v>=10000?(v/10000).toFixed(0)+'万':v}}},
        x:{stacked:hasRenew,grid:{display:false},ticks:{font:{size:10},maxRotation:0,autoSkip:false}}
      }
    }
  });
}

async function renderClient360Overview(c,orders){
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var totalRev=0,paidCount=0;
  for(var i=0;i<orders.length;i++){totalRev+=parseFloat(orders[i].amount||0)||parseFloat(orders[i]._amount||0);if(orders[i].stage==='已完成')paidCount++}
  var lastEng='无';
  (async function(){
    var {data}=await sb.from('engagement_logs').select('created_at').eq('client_id',c.id).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);
    if(data&&data.length)lastEng=new Date(data[0].created_at).toLocaleDateString('zh-CN');
    var el=document.getElementById('c360-last-engage');if(el)el.textContent=lastEng;
  })();
  var html='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn-sm btn-sm-primary" onclick="closeClient360();openForm(\''+c.id+'\')">✏️ 编辑客户</button></div>';
  // ── 项目信息
  var projs=[];
  try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
  if(projs.length>0){
    // 项目一多（十个八个），平铺出来要滚很久才看得到下面的「基本信息」。
    // 与编辑表单同一套约定：≤2 条不折（没必要多点一次），多了默认收起成一行摘要，点哪条开哪条。
    // 360 每次切 tab 都会重建 innerHTML，所以展开状态存 _c360Fold（按 clientId+序号），不存 DOM。
    var _pjAllOpen=projs.length<=2;
    html+='<div class="c360-card"><div class="c360-card-title">'
      +'<span style="flex:1;min-width:0">📦 项目信息 · '+projs.length+' 个</span>'
      +(projs.length>2?'<button type="button" id="c360-fold-btn-pj" class="c360-fold-all" onclick="c360FoldAll(\'pj\')">'+(c360AnyClosed('pj:'+c.id+':',projs.length,_pjAllOpen)?'⇕ 展开全部':'⇕ 收起全部')+'</button>':'')
      +'</div>';
    for(var pj=0;pj<projs.length;pj++){
      var pr=projs[pj];
      var _pKey='pj:'+c.id+':'+pj;
      var _pOpen=c360FoldOpen(_pKey,_pjAllOpen);
      // 收起时头部只留一行摘要：金额 + 复购/周期标记。
      // 日期不放进来：项目名里多半带年份，而日期一放就把长项目名挤成「（2025 年...」，
      // 想确认日期点开就有；完整的「名称 · 日期 · 金额」另挂在 title 上，鼠标悬停可见。
      var _pSum=[];
      var _pAmt=projectBidAmount(pr);
      if(_pAmt>0)_pSum.push(formatMoney(_pAmt));
      if(projectRenewalFlag(pr,projs))_pSum.push('♻️复购');
      var _pCfg=(typeof projectRecurOf==='function')?projectRecurOf(pr):null;
      if(_pCfg&&!_pCfg.off)_pSum.push('🔁');
      var _pTitle=(pr.project_name||'项目#'+(pj+1))
        +(pr.bidding_date?(' · '+pr.bidding_date):'')
        +(_pAmt>0?(' · '+formatMoney(_pAmt)):'');
      html+='<div class="c360-fold'+( _pOpen?'':' collapsed')+'" data-kind="pj" data-fold="'+_pKey+'">';
      html+='<div class="c360-fold-head" onclick="c360FoldToggle(this)" title="'+h(_pTitle)+'">'
        +'<span class="c360-fold-caret">'+(_pOpen?'▾':'▸')+'</span>'
        +'<span class="c360-fold-title">'+h(pr.project_name||'项目#'+(pj+1))+'</span>'
        +'<span class="c360-fold-sum">'+h(_pSum.join(' · '))+'</span>'
        +'</div>';
      html+='<div class="c360-fold-body">';
      // 甲方负责人可能多个：逐个带上职务，方便判断要找的是哪位
      var ocTxt='-';
      var _ownList=projectOwnersOf(pr);
      if(_ownList.length){
        var _acs=allContacts||[];
        var _ownParts=[];
        for(var _oi2=0;_oi2<_ownList.length;_oi2++){
          var _o=_ownList[_oi2],_pos='';
          if(_o.cid){
            for(var _oi=0;_oi<_acs.length;_oi++){if(String(_acs[_oi].id)===String(_o.cid)){_pos=String(_acs[_oi].position||'').trim();break}}
          }
          _ownParts.push(_o.name+(_pos?'（'+_pos+'）':''));
        }
        ocTxt=_ownParts.filter(Boolean).join('、')||'-';
      }
      // 联合中标：一个项目可能有多家中标公司，逐家列出并标出家数
      var _bcList=projectBiddersOf(pr);
      var bcTxt=_bcList.length?(_bcList.join('、')+(_bcList.length>1?'（联合体 '+_bcList.length+' 家）':'')):'-';
      var pfields;
      if(projectHasPackages(pr)){
        // 分包：一个项目分几个包，各包可能不同公司中标（也可能同一家），逐包列出
        var _packs=projectPackagesOf(pr);
        pfields=[['招标日期',pr.bidding_date||'-'],['项目预算',pr.project_budget?formatMoney(pr.project_budget):'-']];
        for(var _pi=0;_pi<_packs.length;_pi++){
          var _pk=_packs[_pi];
          // label 只放序号（太长会把 value 挤成两列），包名放进 value 开头
          var _pkLabel='标包 '+(_pi+1);
          var _seg=[];
          var _pkName=String(_pk.name||'').trim();
          if(_pkName)_seg.push(_pkName);
          if(String(_pk.project_budget||'').trim())_seg.push('预算 '+formatMoney(_pk.project_budget));
          var _cos=_pk.bidders.map(function(o){return o.name}).filter(Boolean);
          if(_cos.length)_seg.push('中标公司 '+_cos.join('、'));
          var _ps=_pk.persons.filter(function(o){return String(o.name||'').trim()});
          if(_ps.length)_seg.push('中标人 '+_ps.map(function(o){return String(o.name).trim()+(String(o.phone||'').trim()?'（'+String(o.phone).trim()+'）':'')}).join('、'));
          if(String(_pk.bid_amount||'').trim())_seg.push('金额 '+formatMoney(_pk.bid_amount));
          pfields.push([_pkLabel,_seg.join(' · ')||'-']);
        }
        pfields.push(['中标金额合计',pr.bid_amount?formatMoney(pr.bid_amount):'-']);
        pfields.push(['甲方负责人',ocTxt]);
      }else{
        pfields=[['招标日期',pr.bidding_date||'-'],['中标人',bidderLabel(pr)||'-'],['中标人电话',pr.bidder_phone||'-'],['中标公司',bcTxt],['项目预算',pr.project_budget?formatMoney(pr.project_budget):'-'],['中标金额',pr.bid_amount?formatMoney(pr.bid_amount):'-'],['甲方负责人',ocTxt]];
      }
      for(var pf=0;pf<pfields.length;pf++)html+='<div class="c360-info-row" style="font-size:12px"><span class="c360-info-label">'+pfields[pf][0]+'</span><span class="c360-info-value">'+h(pfields[pf][1])+'</span></div>';
      // 复购项目：这一单是把老项目又做了一遍。标在卡上，销售一眼能看出「这个客户会回头」
      var _rwInfo=(typeof projectRenewalOf==='function')?projectRenewalOf(pr,projs):null;
      if(_rwInfo&&_rwInfo.is){
        html+='<div class="c360-info-row" style="font-size:12px"><span class="c360-info-label">项目性质</span>'
          +'<span class="c360-info-value" style="color:#B45309">♻️ 复购项目'+(_rwInfo.prevDate?'（上次 '+_rwInfo.prevDate+'）':'')+'</span></div>';
      }
      // 周期性采购：把「多久一次 / 下次什么时候」直接标在项目卡上，
      // 否则用户看不出这个项目会被年度提醒
      var _rnDue=(typeof projectRenewalDue==='function')?projectRenewalDue(pr):'';
      var _rnCfg=(typeof projectRecurOf==='function')?projectRecurOf(pr):null;
      if(_rnCfg){
        var _rnTxt='🔁 每 '+_rnCfg.months+' 个月';
        if(_rnCfg.off)_rnTxt+='（已停止提醒）';
        else if(_rnDue)_rnTxt+=' · 下次 '+_rnDue;
        html+='<div class="c360-info-row" style="font-size:12px"><span class="c360-info-label">年度复购</span><span class="c360-info-value" style="'+(String(_rnCfg.off)?'color:var(--text3)':'color:var(--primary)')+'">'+h(_rnTxt)+'</span></div>';
      }
      html+='</div></div>';   // .c360-fold-body + .c360-fold
    }
    html+='</div>';
  }
  // ── 年度复购提醒（只有该客户确实有到期的复购项目时才出现）
  if(typeof renewal360CardHtml==='function')html+=renewal360CardHtml(c);
  // ── 基本信息
  html+='<div class="c360-card"><div class="c360-card-title">📋 基本信息</div>';
  var rows=[
    ['行业',c.industry||'-'],['规模',c.scale||'-'],['来源',c.source||'-'],
    ['信用等级',c.credit_rating||'-'],['客户等级',c.grade?c.grade+'级':'-'],
    ['生命周期',stageMap[c.lifecycle_stage||'prospect']||'-'],
    ['地址',c.address||'-'],['备注',c.notes||'-']
  ];
  for(var j=0;j<rows.length;j++)html+='<div class="c360-info-row"><span class="c360-info-label">'+rows[j][0]+'</span><span class="c360-info-value">'+h(rows[j][1])+'</span></div>';
  html+='</div>';
  html+='<div class="c360-card"><div class="c360-card-title">📊 统计</div><div class="c360-stats">';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+orders.length+'</div><div class="c360-stat-label">订单数</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num">'+formatMoney(totalRev)+'</div><div class="c360-stat-label">成交额</div></div>';
  html+='<div class="c360-stat-item"><div class="c360-stat-num" id="c360-last-engage">'+lastEng+'</div><div class="c360-stat-label">最近跟进</div></div>';
  html+='</div>';
  // 招标统计在独立 tab 里，这里给个入口，否则用户不会想到去点那一页
  (function(){
    var _bs=clientBiddingStats(c,c360BidYears);
    if(!_bs.total.count)return;
    html+='<div style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--text2)">'
      +'<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📅 历史招标 '+_bs.total.count+' 个项目 · 近 '+_bs.activeYears+' 年有招标'+(_bs.total.renew?' · ♻️ 复购 '+_bs.total.renew+' 个':'')+'</span>'
      +'<button onclick="switchClient360Tab(\'bidding\')" style="flex-shrink:0;font-size:11px;color:var(--primary);border:1px solid var(--primary);border-radius:12px;background:transparent;padding:2px 10px;cursor:pointer">看柱状图 ›</button>'
      +'</div>';
  })();
  html+='</div>';
  // Tags
  var tags=[];
  try{tags=JSON.parse(c.tags||'[]');if(!Array.isArray(tags))tags=[]}catch(e){tags=[]}
  if(tags.length>0){
    html+='<div class="c360-card"><div class="c360-card-title">🏷 标签</div>';
    for(var k=0;k<tags.length;k++)html+='<span class="tag-chip">'+h(tags[k])+'</span> ';
    html+='</div>';
  }
  document.getElementById('c360-body').innerHTML=html;
}

// ============================================================
// 客户 360 · 项目 / 联系人折叠
// ------------------------------------------------------------
// 与编辑表单同一个约定：≤2 条不折，多了默认收起成一行摘要，点开看详情。
// 状态存内存（_c360Fold），因为切 tab / 换客户都会重建 innerHTML，存 DOM 会丢；
// key 带上 clientId，换个客户不会串味。
// ============================================================
var _c360Fold={};
function c360FoldOpen(key,defOpen){
  var v=_c360Fold[key];
  return v===undefined?!!defOpen:!!v;
}
function c360AnyClosed(prefix,n,defOpen){
  for(var i=0;i<n;i++)if(!c360FoldOpen(prefix+i,defOpen))return true;
  return false;
}
function c360FoldBtnSync(kind){
  var btn=document.getElementById('c360-fold-btn-'+kind);
  if(!btn)return;
  var boxes=document.querySelectorAll('#c360-body .c360-fold[data-kind="'+kind+'"]');
  if(!boxes.length){btn.style.display='none';return}
  var anyClosed=false;
  for(var i=0;i<boxes.length;i++)if(boxes[i].classList.contains('collapsed')){anyClosed=true;break}
  btn.textContent=anyClosed?'⇕ 展开全部':'⇕ 收起全部';
}
function c360FoldSet(box,open){
  if(!box)return;
  box.classList.toggle('collapsed',!open);
  var k=box.getAttribute('data-fold');
  if(k)_c360Fold[k]=!!open;
  var c=box.querySelector('.c360-fold-caret');
  if(c)c.textContent=open?'▾':'▸';
  c360FoldBtnSync(box.getAttribute('data-kind'));
}
function c360FoldToggle(el){
  var box=el&&el.closest?el.closest('.c360-fold'):null;
  if(!box)return;
  // 当前是收起态就展开（与 peToggle / ctToggle 同一写法，别取反两次）
  c360FoldSet(box,box.classList.contains('collapsed'));
}
// 一次切开全部：某一条还收着就全展开，否则全收起（与表单的「⇕ 展开全部」同一手感）
function c360FoldAll(kind){
  var boxes=document.querySelectorAll('#c360-body .c360-fold[data-kind="'+kind+'"]');
  if(!boxes.length)return;
  var anyClosed=false;
  for(var i=0;i<boxes.length;i++)if(boxes[i].classList.contains('collapsed')){anyClosed=true;break}
  for(var j=0;j<boxes.length;j++){
    var open=anyClosed;
    boxes[j].classList.toggle('collapsed',!open);
    var k=boxes[j].getAttribute('data-fold');
    if(k)_c360Fold[k]=!!open;
    var c=boxes[j].querySelector('.c360-fold-caret');
    if(c)c.textContent=open?'▾':'▸';
  }
  c360FoldBtnSync(kind);
}

function renderClient360Contacts(c){
  var contacts=allContacts.filter(function(co){return co.client_id===c.id});
  var html='';
  if(contacts.length===0)html='<div class="empty" style="padding:40px">暂无联系人</div>';
  else{
    var _ctAllOpen=contacts.length<=2;
    html+='<div class="c360-card"><div class="c360-card-title">'
      +'<span style="flex:1;min-width:0">👤 联系人 · '+contacts.length+' 人</span>'
      +(contacts.length>2?'<button type="button" id="c360-fold-btn-ct" class="c360-fold-all" onclick="c360FoldAll(\'ct\')">'+(c360AnyClosed('ct:'+c.id+':',contacts.length,_ctAllOpen)?'⇕ 展开全部':'⇕ 收起全部')+'</button>':'')
      +'</div>';
    for(var i=0;i<contacts.length;i++){
      var co=contacts[i];
      var dm=co.is_decision_maker?' ⭐':'',bd='';
      if(co.birthday){var bdDate=new Date(co.birthday);if(!isNaN(bdDate.getTime()))bd='<span style="font-size:11px;color:var(--warning)">🎂 '+bdDate.toLocaleDateString('zh-CN')+'</span>'}
      var rel=co.relationship_to?'<span style="font-size:11px;color:var(--text3)">关系: '+h(co.relationship_to)+'</span>':'';
      // 号码字段兼容两种历史写法（JSON 数组 / 「023-123 / 138…」纯串），
      // 只按 JSON 解析的老数据在这里会整个消失，360 里看不到号码
      var phs=leadNumList(co.phone),lls=leadNumList(co.landline),ems=[];
      try{ems=JSON.parse(co.email||'[]');if(!Array.isArray(ems))ems=[]}catch(e){ems=co.email?[String(co.email)]:[]}
      phs=phs.filter(Boolean);lls=lls.filter(Boolean);ems=ems.filter(Boolean);
      // 收起时一行摘要：部门 · 职务 · 首个电话（多余号码不占位，点开才看全）
      var _cKey='ct:'+c.id+':'+i;
      var _cOpen=c360FoldOpen(_cKey,_ctAllOpen);
      var _cSum=[];
      if(co.dept)_cSum.push(String(co.dept));
      if(co.position)_cSum.push(String(co.position));
      if(phs.length)_cSum.push('📞 '+phs[0]+(phs.length>1?' +'+(phs.length-1):''));
      html+='<div class="c360-contact-item c360-fold'+(_cOpen?'':' collapsed')+'" data-kind="ct" data-fold="'+_cKey+'">';
      html+='<div class="c360-fold-head" onclick="c360FoldToggle(this)">'
        +'<span class="c360-fold-caret">'+(_cOpen?'▾':'▸')+'</span>'
        +'<span class="c360-fold-title c360-contact-name">'+h(co.name||'未命名')+dm+'</span>'
        +'<span class="c360-fold-sum">'+h(_cSum.join(' · '))+'</span>'
        +'<button onclick="event.stopPropagation();transferFrom360(\''+co.id+'\')" style="font-size:11px;color:var(--primary);border:1px solid var(--primary);border-radius:12px;background:transparent;padding:2px 10px;cursor:pointer;flex-shrink:0">转移</button>'
        +'</div>';
      html+='<div class="c360-fold-body">';
      html+='<div class="c360-contact-info">';
      if(co.dept)html+='<span>🏢 '+h(co.dept)+'</span>';
      if(co.position)html+='<span>💼 '+h(co.position)+'</span>';
      if(phs.length)html+='<span>📞 '+h(phs.join(' / '))+'</span>';
      if(lls.length)html+='<span>🖥 '+h(lls.join(' / '))+'</span>';
      if(ems.length)html+='<span>📧 '+h(ems.join(' / '))+'</span>';
      var ed=co.entered_date?'<span style="font-size:11px;color:var(--text3)">📝 录入时间: '+h(String(co.entered_date).slice(0,10))+'</span>':'';
      html+='</div><div class="c360-contact-badges">'+bd+rel+ed+'</div></div></div>';
    }
    html+='</div>';
  }
  document.getElementById('c360-body').innerHTML=html;
}

function renderClient360Orders(c){
  var orders=c360Orders||[];
  var html='';
  if(orders.length===0)html='<div class="empty" style="padding:40px">暂无订单</div>';
  else{
    for(var i=0;i<orders.length;i++){
      var o=orders[i],stage=o.stage||'谈判中';
      var stageColor={谈判中:'#F59E0B',已签约:'#3B82F6',执行中:'#8B5CF6',已完成:'#10B981',已取消:'#EF4444'};
      html+='<div class="c360-card" style="cursor:pointer" onclick="openOrderForm(\''+o.id+'\')"><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600">'+h(o.order_number||'')+'</span><span style="font-size:10px;padding:2px 8px;border-radius:8px;background:'+(stageColor[stage]||'#94A3B8')+';color:#fff">'+h(stage)+'</span></div>';
      if(o.project_name)html+='<div style="font-size:13px;margin-top:4px">📋 '+h(o.project_name)+'</div>';
      html+='<div style="font-size:12px;color:var(--text3);margin-top:4px">'+formatMoney(parseFloat(o.amount||0))+(o.start_date?' · '+o.start_date:'')+'</div></div>';
    }
  }
  document.getElementById('c360-body').innerHTML=html;
}

async function renderClient360Engagements(clientId){
  var {data:logs}=await sb.from('engagement_logs').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  var html='<div style="margin-bottom:12px"><button class="btn-sm btn-sm-primary" onclick="toggleEngagementForm()" id="btn-new-engage">+ 新增跟进</button></div>';
  html+='<div class="engagement-form hidden" id="engagement-form"><h4>新增跟进记录</h4>';
  html+='<select id="eg-type"><option value="电话">电话</option><option value="拜访">拜访</option><option value="邮件">邮件</option><option value="会议">会议</option><option value="微信">微信</option><option value="其他">其他</option></select>';
  html+='<textarea id="eg-content" placeholder="跟进内容..."></textarea>';
  html+='<input id="eg-outcome" placeholder="结果（可选）">';
  html+='<input id="eg-next-step" placeholder="下一步计划（可选）">';
  html+='<input type="date" id="eg-next-date">';
  html+='<div style="display:flex;gap:6px;margin-top:8px"><button class="btn-sm btn-sm-primary" onclick="saveEngagement(\''+clientId+'\')">保存</button><button class="btn-sm" style="background:var(--bg);border:1px solid var(--border)" onclick="toggleEngagementForm()">取消</button></div></div>';
  html+='<div class="engagement-timeline" id="engagement-list">';
  if(logs&&logs.length>0){
    for(var i=0;i<logs.length;i++){
      var l=logs[i];
      html+='<div class="engagement-item"><div class="eg-date">'+new Date(l.created_at).toLocaleDateString('zh-CN')+'</div><div class="eg-body"><span class="eg-type">'+h(l.type)+'</span>'+h(l.content||'')+(l.outcome?'<div class="eg-outcome">✅ '+h(l.outcome)+'</div>':'')+(l.next_step?'<div class="eg-next">📌 下一步: '+h(l.next_step)+(l.next_date?' ('+l.next_date+')':'')+'</div>':'')+'<button class="eg-delete" onclick="deleteEngagement(\''+l.id+'\')">删除</button></div></div>';
    }
  }else{html+='<div class="empty" style="padding:20px">暂无跟进记录</div>'}
  html+='</div>';
  document.getElementById('c360-body').innerHTML=html;
}

function toggleEngagementForm(){
  document.getElementById('engagement-form').classList.toggle('hidden');
}

async function saveEngagement(clientId){
  var type=document.getElementById('eg-type').value;
  var content=document.getElementById('eg-content').value.trim();
  if(!content){showToast('请输入跟进内容');return}
  var outcome=document.getElementById('eg-outcome').value.trim();
  var nextStep=document.getElementById('eg-next-step').value.trim();
  var nextDate=document.getElementById('eg-next-date').value||null;
  var {error}=await sb.from('engagement_logs').insert({company_id:currentCompanyId,client_id:clientId,type:type,content:content,outcome:outcome||null,next_step:nextStep||null,next_date:nextDate,created_by:currentUser.id});
  if(error){showToast('保存失败: '+error.message);return}
  autoCheckLifecycle(clientId);
  renderClient360Engagements(clientId);
  showToast('已保存');
}

async function deleteEngagement(id){
  var _delErr=(await sb.from('engagement_logs').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  renderClient360Engagements(c360ClientId);
  showToast('已删除');
}

async function renderClient360Lifecycle(clientId){
  var c=allClients.find(function(x){return x.id===clientId});
  var current=c?c.lifecycle_stage:'prospect';
  var stageMap={prospect:'潜在客户',qualified:'合格线索',deal:'成交客户',atrisk:'流失预警',churned:'流失客户',repurchase:'复购客户'};
  var allStages=['prospect','qualified','deal','atrisk','churned','repurchase'];
  var {data:logs}=await sb.from('lifecycle_logs').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  var html='<div class="c360-card"><div class="c360-card-title">🔄 变更阶段</div>';
  html+='<select id="lc-new-stage" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:14px;margin-bottom:8px">';
  for(var i=0;i<allStages.length;i++)html+='<option value="'+allStages[i]+'"'+(allStages[i]===current?' selected':'')+'>'+stageMap[allStages[i]]+'</option>';
  html+='</select>';
  html+='<input id="lc-reason" placeholder="变更原因（可选）" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px;font-size:13px;margin-bottom:8px">';
  html+='<button class="btn-sm btn-sm-primary" style="width:100%" onclick="changeLifecycle(\''+clientId+'\')">确认变更</button></div>';
  html+='<div class="lifecycle-timeline">';
  if(logs&&logs.length>0){
    for(var j=0;j<logs.length;j++){
      var l=logs[j];
      html+='<div class="lifecycle-event"><div class="le-date">'+new Date(l.created_at).toLocaleDateString('zh-CN')+'</div><div class="le-content"><span class="le-change">'+(stageMap[l.from_stage]||l.from_stage)+' → '+(stageMap[l.to_stage]||l.to_stage)+'</span>'+(l.reason?'<div style="font-size:12px;color:var(--text2);margin-top:2px">'+h(l.reason)+'</div>':'')+'</div></div>';
    }
  }else{html+='<div class="empty" style="padding:20px">暂无阶段变更记录</div>'}
  html+='</div>';
  document.getElementById('c360-body').innerHTML=html;
}

async function changeLifecycle(clientId,newStage){
  if(!newStage)newStage=document.getElementById('lc-new-stage').value;
  var reason=document.getElementById('lc-reason').value.trim();
  var c=allClients.find(function(x){return x.id===clientId});
  var fromStage=c?c.lifecycle_stage||'prospect':'prospect';
  if(fromStage===newStage){showToast('阶段未变化');return}
  var w=await safeWriteById('clients','update',{lifecycle_stage:newStage,updated_at:new Date().toISOString()},clientId);
  if(w.hit===0){showToast('变更失败: '+(((w.error||{}).message)||'未命中任何行（可能无权修改该客户）'));return}
  await sb.from('lifecycle_logs').insert({company_id:currentCompanyId,client_id:clientId,from_stage:fromStage,to_stage:newStage,reason:reason||null,created_by:currentUser.id});
  // Update local data
  if(c){c.lifecycle_stage=newStage}
  renderClient360Lifecycle(clientId);
  showToast('已变更');
  loadClients();
}

async function autoCheckLifecycle(clientId){
  var c=allClients.find(function(x){return x.id===clientId});
  if(!c)return;
  // Check orders
  var {data:orders}=await sb.from('orders').select('*').eq('client_id',clientId).eq('company_id',currentCompanyId);
  var hasOrder=orders&&orders.length>0;
  // Check last engagement
  var {data:lastEng}=await sb.from('engagement_logs').select('created_at').eq('client_id',clientId).eq('company_id',currentCompanyId).order('created_at',{ascending:false}).limit(1);
  var newStage=c.lifecycle_stage||'prospect';
  var now=new Date();
  if(hasOrder&&newStage==='prospect'){newStage='deal';}
  else if(!hasOrder&&newStage==='deal'){newStage='prospect';}
  if(lastEng&&lastEng.length>0){
    var lastDate=new Date(lastEng[0].created_at);
    var daysSince=(now-lastDate)/(86400000);
    if(daysSince>90&&newStage!=='churned'&&newStage!=='repurchase'){newStage='churned';}
    else if(daysSince>30&&daysSince<=90&&newStage!=='atrisk'&&newStage!=='churned'&&newStage!=='repurchase'){newStage='atrisk';}
    if(daysSince<=30&&newStage==='churned'){newStage='repurchase';}
  }
  if(newStage!==(c.lifecycle_stage||'prospect')){
    var from=c.lifecycle_stage||'prospect';
    await safeWriteById('clients','update',{lifecycle_stage:newStage,updated_at:new Date().toISOString()},clientId);
    await sb.from('lifecycle_logs').insert({company_id:currentCompanyId,client_id:clientId,from_stage:from,to_stage:newStage,reason:'自动检测',created_by:currentUser.id});
    c.lifecycle_stage=newStage;
  }
}

// ============ NEW: Lead Pool Functions ============
async function loadLeads(){
  try{
  // Sales pipeline: only leads assigned to current user
  var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).eq('assigned_to',currentUser.id).in('status',['assigned','contacted']).order('updated_at',{ascending:false});
  if(error){console.error('loadLeads:',error);}
  allLeads=data||[];
  }catch(e){console.error('loadLeads exception:',e);allLeads=[]}
  renderLeads();
}

var poolLeads=[];
async function loadPoolLeads(){
  try{
  // Lead pool: unassigned leads only, exclude converted
  // status='pending' 是「自动采集待审核」，还没入库，不能混进公海让人当线索打
  var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).is('assigned_to',null).neq('status','converted').neq('status','junk').order('updated_at',{ascending:false});
  if(error){console.error('loadPoolLeads:',error);}
  // 待审核的还没入库：本地过滤掉。不用 neq 参数是因为 review_status 列没建时
  // 整个查询会 42703 报错，公海直接空掉——本地过滤能安全降级（undefined !== 'pending'）
  poolLeads=(data||[]).filter(function(l){return l.review_status!=='pending'});
  }catch(e){console.error('loadPoolLeads exception:',e);poolLeads=[]}
  renderPoolLeads();
}

// ===== 自动采集待审核区 =====
// 采集脚本写进来的是 status='pending'，不直接进公海。
// 人点「同意入库」才变 new，点「忽略」变 junk（不删，误删能从「无效」筛回来）。
var pendingLeads=[];
var pendingOpen=true;
async function loadPendingLeads(){
  try{
    var {data,error}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).eq('review_status','pending').order('updated_at',{ascending:false});
    if(error)console.error('loadPendingLeads:',error);
    pendingLeads=data||[];
  }catch(e){console.error('loadPendingLeads exception:',e);pendingLeads=[]}
  renderPendingLeads();
}

function pendingToggle(){
  pendingOpen=!pendingOpen;
  var body=document.getElementById('pending-body');
  var btn=document.getElementById('pending-fold');
  if(body)body.style.display=pendingOpen?'':'none';
  if(btn)btn.textContent=pendingOpen?'收起 ▴':'展开 ▾';
}

function renderPendingLeads(){
  var box=document.getElementById('pending-panel');
  if(!box)return;
  var list=pendingLeads||[];
  if(!list.length){box.classList.add('hidden');return}
  box.classList.remove('hidden');
  var cnt=document.getElementById('pending-count');
  if(cnt)cnt.textContent=String(list.length);
  var grid=document.getElementById('pending-grid');
  if(!grid)return;
  var body=document.getElementById('pending-body');
  if(body)body.style.display=pendingOpen?'':'none';
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var acts='<button class="btn-lead-success" onclick="event.stopPropagation();approveLead(\''+l.id+'\')">✓ 通过并建客户</button>'
      +'<button class="btn-lead-danger" onclick="event.stopPropagation();rejectLead(\''+l.id+'\')">✗ 忽略</button>'
      +'<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    html+=leadClientCardHtml(l,{mode:'pending',actions:acts});
  }
  grid.innerHTML=html;
}

/** 把招标信息压成客户档案的备注：几个月后回看，得知道这家客户是从哪条公告来的 */
/** 客户备注：只留甲方这边的信息，招标代理机构不写进客户档案 */
function leadProfileNotes(l){
  var bits=[];
  if(l.project_name)bits.push('项目：'+l.project_name);
  if(l.project_no)bits.push('编号：'+l.project_no);
  if(Number(l.budget)>0)bits.push('预算：'+formatMoney(l.budget));
  if(l.publish_date)bits.push('招标日期：'+String(l.publish_date).slice(0,10));
  if(l.region)bits.push('地区：'+l.region);
  if(l.source_url)bits.push('原文：'+l.source_url);
  if(l.auto_fetched)bits.push('来源：招标公告自动采集');
  return bits.join('\n');
}

/**
 * 招标人 → 客户「行业」下拉里的值。客户表单的行业只有那 12 个选项，
 * 猜不出来就留空（空着比填个 B2B 强）。
 */
function leadIndustryOf(l){
  l=l||{};
  var hit=String(l.industry||'').trim();
  var opts=['信息技术','制造业','建筑业','金融','教育','医疗','政府','能源','零售','物流','房地产','其他'];
  if(hit&&opts.indexOf(hit)>=0)return hit;
  var n=String(l.name||'');
  if(leadIsEdu(n))return '教育';
  if(/医院|卫生院|疾控|疾病预防|妇幼|保健院|血站|医疗|卫生/.test(n))return '医疗';
  if(/人民政府|管委会|街道办|委员会|公安局|法院|检察院|局$|厅$|办公室|管理处|管理站|管理所|人防|航道/.test(n))return '政府';
  if(/电网|电力|燃气|能源|石油|石化/.test(n))return '能源';
  if(/银行|保险|证券|信托|基金/.test(n))return '金融';
  if(/建设|建筑|工程|施工/.test(n))return '建筑业';
  if(/制造|实业|工厂|食品|材料|装备|机械|建材|化工/.test(n))return '制造业';
  if(/信息|网络|数据|软件|科技|电子|通信|智能/.test(n))return '信息技术';
  return '';
}

/**
 * 项目名归一：拿去比对「是不是同一个标的」。
 * 同一个标的会在不同批次反复挂出来——「XX项目」「XX项目（第二次）」「XX项目（重新招标）」，
 * 严格同名判断会把它们当成三个新项目，客户的近期项目越审越多、复购提醒也跟着重复。
 * 只剥「重招/更正/延期」这类尾巴，不动主干名称，免得把不同标的并成一个。
 */
var LEAD_PROJ_RETRY_RE=/[（(]\s*(?:第[一二三四五六七八九十\d]+次|二次|三次|重新招标|重新采购|重新发布|废标重招|再次招标|延期|更正|变更|中止|终止)[^）)]*[)）]/g;
function leadProjKey(s){
  var t=String(s||'').replace(/\s+/g,'').toLowerCase();
  t=t.replace(LEAD_PROJ_RETRY_RE,'');
  // 主干够长才剥「项目」二字：「XX系统」与「XX系统采购项目」是同一个标的
  if(t.length>=6)t=t.replace(/(采购项目|招标项目|项目)$/,'');
  return t;
}

/** 项目条目里记的招标编号（存在 notes 里的「招标编号 XXX」） */
function leadProjNoOf(p){
  var m=String((p&&p.notes)||'').match(/招标编号[：:\s]*([A-Za-z0-9\-_\/\.]+)/);
  return m?m[1].replace(/\s+/g,'').toUpperCase():'';
}

/**
 * 号码字段 → 原始号码数组（保留 023- 这类格式，只去空和重复）。
 * contacts.phone / landline 有两种历史写法：JSON 数组（新）和「023-123 / 138…」纯串
 * （老数据、导入的）。只按 JSON 解析会让老数据读成「一个号都没有」，
 * 于是同一个号被一遍遍追加进去——「已有的电话又加了一遍」就是这么来的。
 */
function leadNumList(v){
  var out=[];
  function add(x){
    var s=String(x==null?'':x).trim();
    if(s&&out.indexOf(s)<0)out.push(s);
  }
  if(Array.isArray(v)){v.forEach(add);return out}
  var s=String(v||'').trim();
  if(!s)return out;
  if(s.charAt(0)==='['){
    try{var a=JSON.parse(s);if(Array.isArray(a)){a.forEach(add);return out}}catch(e){}
  }
  s.split(/[\s\/、,，;；\n|]+/).forEach(add);
  return out;
}

/**
 * 号码比对键：手机 11 位全等；座机比后 8 位（区号可能带也可能不带，
 * 「023-62292550」与「62292550」必须认成同一个号）。
 */
function leadNumKey(v){
  var d=String(v==null?'':v).replace(/\D/g,'');
  if(/^1[3-9]\d{9}$/.test(d))return d;
  if(d.length>=10)return d.slice(-8);
  return d.replace(/^0+/,'')||d;
}

/** 两条姓名记录是不是同一个人（有一边没名字时只能靠号码；「李思文」与「李思文(采购办)」算同一人） */
function leadSamePerson(a,b){
  var x=String(a||'').replace(/\s+/g,'').toLowerCase();
  var y=String(b||'').replace(/\s+/g,'').toLowerCase();
  if(!x||!y)return true;
  if(x===y)return true;
  return x.indexOf(y)>=0||y.indexOf(x)>=0;
}

/**
 * 把这条招标公告挂到客户的「近期项目」里（客户表单那个「近期项目」区）。
 * 字段名与 collectProjectEntries() 完全一致，客户 360 / 列表卡片 / 复购提醒都认。
 *
 * 核对已有项目：先按招标编号、再按归一后的项目名。命中就是同一个标的——
 * 不再新增一条，只把它空着的预算 / 招标日期 / 甲方负责人补齐（人工改过的不动）。
 * 没命中才是新标的，追加一条。
 * @returns {{added:boolean,filled:boolean,dup:boolean}}
 */
async function leadAppendProject(clientRow,l,ownerName,ownerCid){
  var res={added:false,filled:false,dup:false};
  var cid=clientRow&&clientRow.id;
  if(!cid)return res;
  var pname=String(l.project_name||'').trim();
  if(!pname)return res;
  // 核对基准要现读一次：内存里的 projects 可能是几分钟前的快照，
  // 别人刚在客户详情里加过项目，照快照判断就会把同一个标的再加一遍
  var raw=null;
  try{
    var q=await sb.from('clients').select('id,projects').eq('id',cid).limit(1);
    if(q&&!q.error&&q.data&&q.data.length)raw=q.data[0].projects;
  }catch(e){}
  if(raw==null)raw=clientRow.projects;
  var projs=[];
  try{projs=JSON.parse(raw||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
  var key=leadProjKey(pname);
  var pno=String(l.project_no||'').replace(/\s+/g,'').toUpperCase();
  var hit=null;
  for(var i=0;i<projs.length;i++){
    var e=projs[i]||{};
    if(pno&&leadProjNoOf(e)===pno){hit=e;break}
    if(key&&leadProjKey(e.project_name)===key){hit=e;break}
  }
  var dateStr=l.publish_date?String(l.publish_date).slice(0,10):'';
  // 结果公告已经回填过中标信息（sync-results.js）：建客户 / 并入项目时一起写进去，
  // 客户 360 里点开项目就能看到「中标公司 / 中标金额」。
  var winInfo=leadWinOf(l);
  var winCos=winInfo?String(winInfo.bidder||'').split('、').filter(Boolean):[];
  var winAmt=(winInfo&&winInfo.amount>0)?String(Math.round(winInfo.amount)):'';
  var winPacks=(winInfo&&winInfo.packsN>1)?winInfo.packs:[];
  var notes=[];
  if(l.project_no)notes.push('招标编号 '+l.project_no);
  if(l.source_url)notes.push('公告原文 '+l.source_url);
  var changed=false;
  if(hit){
    // 同一个标的：只补空，不覆盖人工填过的内容
    if(!String(hit.bidding_date||'').trim()&&dateStr){hit.bidding_date=dateStr;changed=true}
    if(!String(hit.project_budget||'').trim()&&Number(l.budget)>0){
      hit.project_budget=String(Math.round(Number(l.budget)));changed=true;
    }
    if(!String(hit.client_owner||'').trim()&&ownerName){hit.client_owner=ownerName;changed=true}
    if(ownerName&&ownerCid){
      if(!Array.isArray(hit.client_owners))hit.client_owners=[];
      var hasCid=hit.client_owners.some(function(o){return String(o&&o.cid)===String(ownerCid)});
      if(!hasCid){hit.client_owners.push({name:ownerName,cid:ownerCid});changed=true}
    }
    // 中标信息同样只补空：人工填过真实成交价的，采集的公告值不覆盖
    if(winAmt&&!String(hit.bid_amount||'').trim()){hit.bid_amount=winAmt;changed=true}
    if(winCos.length&&!String(hit.bidder_company||'').trim()){hit.bidder_company=winCos.join('、');changed=true}
    if(winCos.length&&!(Array.isArray(hit.bidder_companies)&&hit.bidder_companies.length)){
      hit.bidder_companies=winCos.map(function(n){return{name:n}});changed=true;
    }
    if(winPacks.length&&!(Array.isArray(hit.packages)&&hit.packages.length)){
      hit.packages=winPacks.map(function(p,i){
        return{
          name:'包'+(p.no||(i+1)),
          bid_amount:Number(p.amount)>0?String(Math.round(Number(p.amount))):'',
          bidders:String(p.bidder||'').split('、').filter(Boolean).map(function(n){return{name:n}})
        };
      });changed=true;
    }
    var oldNotes=String(hit.notes||'');
    if(l.project_no&&oldNotes.indexOf(String(l.project_no))<0){
      hit.notes=(oldNotes?oldNotes+'；':'')+'招标编号 '+l.project_no;changed=true;
    }else if(l.source_url&&oldNotes.indexOf(String(l.source_url))<0){
      hit.notes=(oldNotes?oldNotes+'；':'')+'公告原文 '+l.source_url;changed=true;
    }
    if(!changed)return {added:false,filled:false,dup:true};
    res.filled=true;
  }else{
    var entry={
      project_name:pname,
      bidding_date:dateStr||null,
      bidder_name:'',bidder_phone:'',bidder_company:winCos.join('、'),
      project_budget:Number(l.budget)>0?String(Math.round(Number(l.budget))):'',
      bid_amount:winAmt,
      client_owner:ownerName||'',
      notes:notes.join('；')
    };
    // 甲方负责人：cid 是真相，name 只是快照。刚建的联系人这时已经有 id 了
    if(ownerName)entry.client_owners=[ownerCid?{name:ownerName,cid:ownerCid}:{name:ownerName}];
    // 中标公司多值 / 分包明细：旧链路读 bidder_company 单串，新链路读这两个数组
    if(winCos.length)entry.bidder_companies=winCos.map(function(n){return{name:n}});
    if(winPacks.length){
      entry.packages=winPacks.map(function(p,i){
        return{
          name:'包'+(p.no||(i+1)),
          bid_amount:Number(p.amount)>0?String(Math.round(Number(p.amount))):'',
          bidders:String(p.bidder||'').split('、').filter(Boolean).map(function(n){return{name:n}})
        };
      });
    }
    projs.push(entry);
    res.added=true;
  }
  var w=await safeWriteById('clients','update',{projects:JSON.stringify(projs),updated_at:new Date().toISOString()},cid);
  if(!w.hit){res.added=false;res.filled=false;return res}
  // 内存里同步一份，返回客户列表时卡片上立刻就有这个项目气泡
  for(var k=0;k<(allClients||[]).length;k++){
    if(String(allClients[k].id)===String(cid))allClients[k].projects=JSON.stringify(projs);
  }
  return res;
}

/**
 * 联系人的「录入时间」= 招标文件上的日期（公告发布日）。
 * 客户详情里手工新增联系人默认今天，是因为人当场才知道这个人；
 * 招标线索不一样，对方是公告那天挂出来的，按抓取时刻记会显得「今天才认识」。
 * @returns {string|null} YYYY-MM-DD；采集没拿到公告日就 null（表单里空着）
 */
function leadEnteredDate(l){
  var s=String((l&&l.publish_date)||'').trim().slice(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s)?s:null;
}

/**
 * 按电话认单位：线索里的号码如果已经在某位联系人名下，这家单位其实就在库里了。
 *
 * 公海线索转客户时，名称经常和库里对不上——「重庆市巴南区中医院」与「巴南区中医院」、
 * 「XX局（本级）」与「XX局」——于是同一条公告多建一份客户档案，
 * 同一个人在两边各存一行联系人，销售在哪个客户里都看不全跟进记录。
 * 这里用号码反查：命中就把线索并入那位联系人所属的客户，
 * 后面的联系人环节会自然命中同一行（只补他没存过的号），不再新建。
 *
 * 手机号实名唯一，命中即认；座机可能整栋楼共用（总机），
 * 必须姓名也对得上才算，免得把两个单位并成一家。
 * @returns {{client:Object,contactId:string,contactName:string,via:string}|null}
 */
async function leadFindClientByPhone(l){
  l=l||{};
  // 代理机构不参与按号合并：招标代理的人在甲方那边也留过手机（库里的
  // 「三信建设咨询集团 → 特殊教育中心 甘老师」就是这种），按号认会把代理公司并进甲方档案
  if(LEAD_AGENCY_RE.test(String(l.name||'')))return null;
  var ph=leadPhonesOf(l);
  if(!ph.mobiles.length&&!ph.telnums.length)return null;
  var mobKeys=ph.mobiles.map(leadNumKey);
  var telKeys=ph.telnums.map(leadNumKey);
  var nm=String(l.contact_name||'').trim();
  var rows=[];
  // 分批拉：PostgREST 单次默认最多回 1000 行，公司联系人早就超过这个数，
  // 一次全拉会被静默截断，要认的人恰好在后面那批就漏了
  var page=1000,off=0;
  for(var pg=0;pg<30;pg++){
    var okPage=false;
    try{
      var q=await sb.from('contacts').select('id,name,phone,landline,client_id').eq('company_id',currentCompanyId).order('id').range(off,off+page-1);
      if(q&&!q.error&&q.data){
        okPage=true;
        rows=rows.concat(q.data);
        if(q.data.length<page)break;
      }
    }catch(e){}
    if(!okPage)break;
    off+=page;
  }
  // 查不到（权限 / 网络）时退回内存里那份，客户列表加载时已经全量拉过一遍
  if(!rows.length)rows=allContacts||[];
  var best=null,bestScore=-1;
  for(var i=0;i<rows.length;i++){
    var r=rows[i]||{};
    if(!r.client_id||r.deleted_at)continue;
    var nameOk=!!nm&&leadSamePerson(r.name,nm);
    var curKeys=leadNumList(r.phone).concat(leadNumList(r.landline)).map(leadNumKey);
    var hitMob=false,hitTel=false;
    for(var j=0;j<curKeys.length;j++){
      if(mobKeys.indexOf(curKeys[j])>=0)hitMob=true;
      else if(telKeys.indexOf(curKeys[j])>=0)hitTel=true;
    }
    if(!hitMob&&!(hitTel&&nameOk))continue;
    // 名字也对的排前面：同号多行时（历史重复数据）优先选得住的那条
    var score=(hitMob?2:1)+(nameOk?2:0);
    if(score>bestScore){
      bestScore=score;
      best={contactId:r.id,contactName:r.name||'',clientId:r.client_id,via:hitMob?'mobile':'tel'};
    }
  }
  if(!best)return null;
  // 客户行要现拿：名称 / 地址 / 属性都要用，而且软删掉的不能并进去
  var cl=(allClients||[]).filter(function(c){return String(c.id)===String(best.clientId)})[0]||null;
  if(!cl){
    try{
      var cq=await sb.from('clients').select('id,name,address,type,industry,deleted_at').eq('id',best.clientId).limit(1);
      if(cq&&!cq.error&&cq.data&&cq.data.length)cl=cq.data[0];
    }catch(e){}
  }
  if(!cl||cl.deleted_at)return null;
  best.client=cl;
  return best;
}

/**
 * 线索 → 客户档案（审核通过和公海「转为客户」共用这一条路）。
 * 判定顺序：采集时已匹配的 client_id → 名称完全一致 → 库里再查一次
 * → 名称都对不上时按联系人电话反查（同一个甲方换了种写法）。
 * 命中已有客户就不重复建档，只把联系人、项目、空着的地址补进去——
 * 一条公告建一个客户，客户列表很快就没法看了。
 *
 * 「新增的招标信息要核对已有信息」落在这里：
 *  - 项目：同一个标的（招标编号相同 / 项目名归一后相同）只补空字段，新标的才追加
 *  - 联系人：同名或同号算同一个人，只补他没有的号码；真不认识的人才新建一条
 * @returns {clientId,created,clientName,contactAdded,phoneAdded,projectAdded,projectFilled,matchedBy,error}
 */
async function leadToClientProfile(l){
  l=l||{};
  var out={clientId:null,created:false,clientName:'',contactAdded:false,phoneAdded:0,
    projectAdded:false,projectFilled:false,matchedBy:'',matchedName:'',error:null};
  var nm=String(l.name||'').trim();
  if(!nm){out.error='线索没有单位名称，无法建客户';return out}
  var norm=function(s){return String(s||'').replace(/\s+/g,'').toLowerCase()};
  var target=null;
  if(l.client_id)target=(allClients||[]).filter(function(c){return String(c.id)===String(l.client_id)})[0]||null;
  if(!target)target=(allClients||[]).filter(function(c){return norm(c.name)===norm(nm)})[0]||null;
  if(!target){
    var q=await sb.from('clients').select('id,name,address').eq('company_id',currentCompanyId).eq('name',nm).limit(1);
    if(q.data&&q.data.length)target=q.data[0];
  }
  if(!target){
    // 名称对不上（同一个甲方换了种写法）时用电话认单位：
    // 号码已经在某位联系人名下 → 这家单位就在库里，并进去而不是再建一份档案。
    // 这条分支命中后，下面联系人环节会捞到同一行，只补他没存过的号，不新建联系人。
    var byPh=await leadFindClientByPhone(l);
    if(byPh){
      target=byPh.client;
      out.matchedBy='phone';
      out.matchedVia=byPh.via;
      out.matchedName=byPh.contactName||'';
    }
  }
  if(target){
    out.clientId=target.id;
    out.clientName=target.name||nm;
    // 已有客户只补空着的字段，绝不覆盖人工填过的内容
    var patch={};
    if(l.contact_addr&&!String(target.address||'').trim())patch.address=l.contact_addr;
    // 客户属性同理：人工标过「集成商 / 供应商」的，不能被招标采集改成「甲方」
    if(!parseTypes(target.type).length)patch.type=JSON.stringify(leadTypeLabels(l));
    if(!String(target.industry||'').trim()){
      var ind=leadIndustryOf(l);
      if(ind)patch.industry=ind;
    }
    if(Object.keys(patch).length){
      patch.updated_at=new Date().toISOString();
      await safeWriteById('clients','update',patch,target.id);
      for(var mi=0;mi<(allClients||[]).length;mi++){
        if(String(allClients[mi].id)===String(target.id)){
          for(var mk in patch)if(mk!=='updated_at')allClients[mi][mk]=patch[mk];
        }
      }
    }
  }else{
    // 客户属性用同一套标签（甲方 + 按单位名称推的细分属性），客户表单里打开就是勾好的
    var typeJson=JSON.stringify(leadTypeLabels(l));
    var ctype=leadIndustryOf(l);
    var payload={
      name:nm,
      type:typeJson,
      address:l.contact_addr||'',
      notes:leadProfileNotes(l),
      industry:ctype,
      source:'网络推广',
      projects:'[]',
      lifecycle_stage:'prospect',
      user_id:currentUser?currentUser.id:null,
      company_id:currentCompanyId
    };
    var ins=await sb.from('clients').insert(payload).select('id');
    var cid=(ins.data&&ins.data[0]&&ins.data[0].id)||null;
    if(!cid){
      // clients 的读链路本来就走 service_role（admin-proxy），写这里回退不会越权：
      // 代理会给非超管注入 company_id 并校验范围
      var pr=await callAdmin('insert','clients',{payload:payload});
      cid=(pr&&pr.data&&pr.data[0]&&pr.data[0].id)||null;
      if(!cid){
        out.error=((ins.error&&ins.error.message)||(pr&&pr.error&&pr.error.message)||'客户档案写入失败');
        return out;
      }
    }
    out.clientId=cid;out.created=true;out.clientName=nm;
    // 立刻塞进内存，紧接着的下一张卡片去重时不会又把同一家建一遍
    (allClients||[]).push({id:cid,name:nm,type:typeJson,address:l.contact_addr||'',projects:'[]',
      industry:ctype,source:payload.source,lifecycle_stage:'prospect',notes:payload.notes,
      created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
  }
  // 联系人：手机全进 phone、座机全进 landline。
  // 一个人可能挂 2~3 个号（座机连写、手机两个），全都存进去，
  // 不然销售换个号码就打不通，也看不出「这人还有第二个手机」。
  //
  // 但「新增」之前必须先核对库里的人：认人是**先认名字、再认号码**。
  //  1) 姓名相同 → 就是这个人（同一个人会在多份公告里反复出现，名字最稳）
  //  2) 姓名对不上 / 这次公告没给名字 → 用号码认人，且姓名不能互相打架
  //     （「王工」和「王建国」可能是同一人；「张三」和「李四」共用总机号则是两个人）
  // 只按号码认会出两种错：同一个人换个号码就被建成第二条；
  // 新联系人跟老联系人共用总机号，被并进别人的档案里，名字永远丢。
  var phAll=leadPhonesOf(l);
  var mobList=phAll.mobiles, telList=phAll.telnums;
  var ownerCid='';
  var enteredDate=leadEnteredDate(l);
  if(mobList.length||telList.length||l.contact_name){
    var ec=await sb.from('contacts').select('id,name,phone,landline,entered_date').eq('client_id',out.clientId).eq('company_id',currentCompanyId);
    var rows=ec.data||[],dupRow=null;
    var nameKey=norm(String(l.contact_name||''));
    if(nameKey){
      for(var ni=0;ni<rows.length;ni++){
        if(norm(String(rows[ni].name||''))===nameKey){dupRow=rows[ni];break}
      }
    }
    if(!dupRow&&(mobList.length||telList.length)){
      var inKeys=mobList.concat(telList).map(leadNumKey);
      for(var i=0;i<rows.length&&!dupRow;i++){
        var curKeys=leadNumList(rows[i].phone).concat(leadNumList(rows[i].landline)).map(leadNumKey);
        var hitNum=false;
        for(var kk=0;kk<inKeys.length&&!hitNum;kk++)hitNum=curKeys.indexOf(inKeys[kk])>=0;
        if(hitNum&&leadSamePerson(rows[i].name,l.contact_name))dupRow=rows[i];
      }
    }
    if(dupRow){
      // 同一个人已经在客户档案里：不重复插，项目里的甲方负责人直接指向他。
      // 新公告带来他没存过的号码才补进去——档案里只有 1 个号是常态，
      // 后面公告再冒出第二个号时，销售应该能看到全部；
      // 已经有的号一个都不再写一遍（同一条公告重复审核也只会补新号）。
      ownerCid=dupRow.id;
      var curP=leadNumList(dupRow.phone),curL=leadNumList(dupRow.landline);
      var haveKeys=curP.concat(curL).map(leadNumKey);
      var addM=[],addT=[];
      mobList.forEach(function(x){
        var k=leadNumKey(x);
        if(haveKeys.indexOf(k)<0){haveKeys.push(k);addM.push(x)}
      });
      telList.forEach(function(x){
        var k=leadNumKey(x);
        if(haveKeys.indexOf(k)<0){haveKeys.push(k);addT.push(x)}
      });
      var ctPatch={};
      if(addM.length)ctPatch.phone=JSON.stringify(curP.concat(addM));
      if(addT.length)ctPatch.landline=JSON.stringify(curL.concat(addT));
      if(enteredDate&&!String(dupRow.entered_date||'').trim())ctPatch.entered_date=enteredDate;
      // 档案里这条只有号码没名字（以前只按号码认人时会这样），公告给了名字就补上
      if(!String(dupRow.name||'').trim()&&String(l.contact_name||'').trim())ctPatch.name=String(l.contact_name).trim();
      out.phoneAdded=addM.length+addT.length;
      if(Object.keys(ctPatch).length){
        var uw=await safeWriteContacts('update',ctPatch,dupRow.id);
        if(uw.hit){
          for(var ui=0;ui<(allContacts||[]).length;ui++){
            if(String(allContacts[ui].id)===String(dupRow.id)){
              for(var uk in ctPatch)allContacts[ui][uk]=ctPatch[uk];
            }
          }
        }
      }
    }else{
      var cr=await sb.from('contacts').insert({
        client_id:out.clientId,
        name:l.contact_name||'',
        dept:'',position:'',room:'',
        phone:JSON.stringify(mobList.length?mobList:['']),
        landline:JSON.stringify(telList.length?telList:['']),
        email:JSON.stringify(l.contact_email?[l.contact_email]:['']),
        entered_date:enteredDate,
        company_id:currentCompanyId,
        user_id:currentUser?currentUser.id:null
      }).select('id');
      if(cr.error){
        // 没权限/校验失败不挡住建档，只是项目里挂不上负责人 id
      }else{
        out.contactAdded=true;
        ownerCid=(cr.data&&cr.data[0]&&cr.data[0].id)||'';
      }
    }
  }
  // 这条公告 → 客户的「近期项目」一条（客户表单里点开就能看到项目名/招标日期/预算/甲方负责人）
  var ownerName=String(l.contact_name||'').trim();
  if(!ownerCid&&ownerName){
    // 只有姓名没号码的联系人：拿同名联系人补上关联，补不到就只记姓名
    for(var ci=0;ci<((allContacts||[]).length);ci++){
      var ac=allContacts[ci];
      if(String(ac.client_id)===String(out.clientId)&&norm(ac.name)===norm(ownerName)){ownerCid=ac.id;break}
    }
  }
  var row=null;
  for(var ri=0;ri<(allClients||[]).length;ri++){
    if(String(allClients[ri].id)===String(out.clientId)){row=allClients[ri];break}
  }
  if(!row)row={id:out.clientId,projects:'[]'};
  var pr=await leadAppendProject(row,l,ownerName,ownerCid);
  out.projectAdded=!!pr.added;
  out.projectFilled=!!pr.filled;
  return out;
}

/**
 * 审核完成后的一句话补充：让人看得出「核对」到底核对出什么。
 * 新建客户时项目/联系人本来就是一条，不用再报；并入已有客户才值得说清楚，
 * 否则销售会以为又建了一条重复项目。
 */
function leadMergeSummary(r){
  if(!r||r.created)return '';
  var bits=[];
  // 说清楚「为什么并进了这个客户」：名称没对上、是号码对上的，
  // 不然销售会以为系统把两家不相干的单位合成了一家
  if(r.matchedBy==='phone')bits.push('电话命中已有联系人'+(r.matchedName?'「'+r.matchedName+'」':''));
  if(r.projectAdded)bits.push('新增项目 1');
  else if(r.projectFilled)bits.push('项目已存在，补全信息');
  if(r.contactAdded)bits.push('新增联系人 1');
  else if(r.phoneAdded)bits.push('补号码 '+r.phoneAdded+' 个');
  return bits.length?('（'+bits.join(' · ')+'）'):'';
}

/** 同意一条：直接落成客户档案（客户列表里马上能看到），线索标记已转化 */
async function approveLead(id){
  var l=(pendingLeads||[]).filter(function(x){return String(x.id)===String(id)})[0];
  if(!l){showToast('这条线索已不在待审核里，刷新看看');return}
  showToast('正在建客户…');
  var r=await leadToClientProfile(l);
  if(r.error){showToast('建客户失败：'+r.error);return}
  var now=new Date().toISOString();
  var w=await safeWriteById('lead_pool','update',{
    review_status:'approved',reviewed_at:now,status:'converted',
    client_id:r.clientId,converted_client_id:r.clientId,converted_at:now,updated_at:now
  },id,{allowProxy:false});
  if(!w.hit){showToast('客户已建，但线索状态没写进去：'+((w.error&&w.error.message)||'没有写入权限'));return}
  pendingLeads=(pendingLeads||[]).filter(function(x){return String(x.id)!==String(id)});
  renderPendingLeads();
  await Promise.all([loadPoolLeads(),loadClients()]);
  showToast(r.created?('已创建客户「'+r.clientName+'」'):('已并入客户「'+r.clientName+'」'+leadMergeSummary(r)));
}

/** 忽略一条：pending → junk。不删除，误点了还能从「无效」筛回来 */
async function rejectLead(id){
  var r=await safeWriteById('lead_pool','update',{review_status:'rejected',reviewed_at:new Date().toISOString(),status:'junk',updated_at:new Date().toISOString()},id,{allowProxy:false});
  if(!r.hit){
    showToast('忽略失败：'+((r.error&&r.error.message)||'没有写入权限'));
    return;
  }
  pendingLeads=(pendingLeads||[]).filter(function(x){return x.id!==id});
  renderPendingLeads();
  showToast('已忽略');
}

/** 剩下的都是真项目时才用。先弹确认，避免手滑把噪音整批变成客户 */
async function approveAllPending(){
  var n=(pendingLeads||[]).length;
  if(!n){showToast('没有待审核的线索');return}
  var yes=await uiConfirm('剩下的 '+n+' 条会全部通过审核，并直接创建成客户档案。'
    +'客户库里已有同名的不会重复建档：同一个标的（招标编号或项目名相同）只把空着的预算/日期/负责人补全，新标的才新增；'
    +'联系人是同一个人（同名或同号）只补他没存过的号码，已有的电话不会再写一遍。'
    +'机器抓的难免有同名不同单位、代理机构混进采购人的情况，建议先逐条看过。',
    {okText:'全部通过',cancelText:'再看看',danger:false});
  if(yes)await doApproveAll();
}

/** 真正执行批量通过。逐条建客户，单条失败不影响其它条 */
async function doApproveAll(){
  var list=(pendingLeads||[]).slice();
  if(!list.length)return;
  showToast('正在建客户…');
  var ok=0,joined=0,fail=0,newP=0,newC=0;
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var r=await leadToClientProfile(l);
    if(r.error){fail++;continue}
    var now=new Date().toISOString();
    var w=await safeWriteById('lead_pool','update',{
      review_status:'approved',reviewed_at:now,status:'converted',
      client_id:r.clientId,converted_client_id:r.clientId,converted_at:now,updated_at:now
    },l.id,{allowProxy:false});
    if(!w.hit){fail++;continue}
    if(r.created)ok++;else joined++;
    if(r.projectAdded)newP++;
    if(r.contactAdded)newC++;
  }
  await Promise.all([loadPendingLeads(),loadPoolLeads(),loadClients()]);
  showToast('新建客户 '+ok+' 家'+(joined?('、并入已有 '+joined+' 家'):'')
    +(newP?('、新增项目 '+newP+' 个'):'')+(newC?('、新增联系人 '+newC+' 位'):'')
    +(fail?('，失败 '+fail+' 条'):''));
}

/** 采集站点 → 卡片徽标上的短名。全称「招标公告 · 重庆市公共资源交易网」会把徽标挤满一行 */
var LEAD_SITE_LABEL={'cqggzy.com':'交易网','gec123.com':'行采家','ccgp.gov.cn':'政采网','ccgp-chongqing.gov.cn':'重庆政采','xj.ccgp-chongqing.gov.cn':'竞采中心'};

/**
 * 客户属性（客户表单最上面那排「客户属性 *」多选）。
 * 招标人天然是甲方，再按单位名称叠细分属性 —— 客户卡片第一行也是这排彩色胶囊，
 * 两边用同一套标签、同一个 tColor 配色，看起来才是同一个东西。
 */
var LEAD_TYPE_RULES=[
  [/医院|卫生院|疾控|疾病预防|预防控制|妇幼|保健院|血站|医疗卫生|医保|医疗保障|医学|卫生/, '医疗'],
  [/公安|法院|检察院|司法|监狱|戒毒|交警|看守所|仲裁/, '司法'],
  [/部队|军分区|警备区|武警|军区|武装部|消防/, '军队'],
  [/人民政府|管委会|管理委员会|街道办|委员会|办公室|管理局|管理处|管理站|管理所|局$|厅$|中心$|研究院|科学院|档案馆|图书馆|人防|航道|地震台/, '党政'],
  [/设计院|规划设计|勘察设计|勘测设计|建筑设计院/, '设计院'],
  [/电信|移动通信|联通|广电|铁塔|通信集团/, '运营商'],
  [/^(中国|中铁|中交|中建|中电|中核|国家|华润|招商|华能|大唐|三峡集团)/, '国央企']
];
/**
 * 是不是教育口。「学院」不能直接当教育特征——
 * 「预防医学科学院」「医学院」「设计学院」里也有「学院」，
 * 一个 regex 会把疾控中心打成教育。宁可多写一个判断函数。
 */
function leadIsEdu(nm){
  nm=String(nm||'');
  if(/大学|学校|中学|小学|幼儿园|教育局|教委|教育委员会|教育科学研究院|教育评估|教育考试|教育技术|职业技术学院/.test(nm))return true;
  return /学院/.test(nm)&&!/科学院|医学院|设计学院|研究生院|商学院/.test(nm);
}
/**
 * 机关 / 事业单位的特征词。命中它就不再按企业性质归类，
 * 否则「重庆市xx集团有限公司」「xx区人民医院有限公司」也会被硬算成制造业。
 */
var LEAD_ORG_RE=/局$|厅$|委员会|人民政府|管委会|街道办|办公室|中心|研究院|科学院|大学|学院|学校|医院|疾控|妇幼|法院|检察院|公安|监狱|部队|军分区|设计院/;
/**
 * 企业性质：只认名称里明确的行业词。
 * 「重庆xx建设有限公司」这种没有明确行业词的，宁可只留「甲方」也不乱标——
 * 客户属性是给人筛客户用的，标错比空着更糟。
 */
function leadEnterpriseLabel(nm){
  if(!nm||LEAD_ORG_RE.test(nm))return '';
  if(/制造|实业|工厂|厂$|生产|食品|榨菜|材料|装备|机械|建材|化工|钢铁|水泥|纺织|印刷|包装|制药|药业|医药|酒业|乳业|饲料|家具|服装|仪器|电子元件/.test(nm))return '制造业';
  return '';
}
/** 线索应该打哪几个客户属性。建客户时写进 clients.type，卡片上就是这几个徽标 */
function leadTypeLabels(l){
  l=l||{};
  var nm=String(l.name||'');
  var all=(typeof allTypes==='function')?allTypes():BUILTIN_TYPES;
  var out=['甲方'];
  var add=function(t){
    if(!t||t==='甲方')return;
    if(out.indexOf(t)<0&&all.indexOf(t)>=0)out.push(t);
  };
  // 教育要单独判（「学院」在科学院/医学院里也有），且排在最前，徽标顺序跟以前一致
  if(leadIsEdu(nm))add('教育');
  for(var i=0;i<LEAD_TYPE_RULES.length;i++){
    if(LEAD_TYPE_RULES[i][0].test(nm))add(LEAD_TYPE_RULES[i][1]);
  }
  // 领域分类（医疗/教育/党政…）和企业性质（制造业）可以同时命中，所以是多选
  add(leadEnterpriseLabel(nm));
  return out;
}

/** 类型徽标：客户属性（甲方 / 党政 / 教育 …），和客户卡片同款 .card-type */
function leadCardTypesHtml(l){
  var types=leadTypeLabels(l),out='',max=3;
  for(var i=0;i<types.length&&i<max;i++){
    var col=tColor(types[i]);if(!col||col==='#999')col='#64748B';
    out+='<span class="card-type" style="background:'+h(col)+'">'+h(types[i])+'</span>';
  }
  if(types.length>max)out+='<span class="card-type-more">+'+(types.length-max)+'</span>';
  return out?'<div class="card-types">'+out+'</div>':'';
}

/**
 * 项目气泡 —— 客户卡片上「📋 项目名 · 中标人 · 👤负责人」那一行。
 * 招标阶段还没有中标人，这里换成「预算 · 甲方负责人」，位置和写法完全对齐。
 * 项目名普遍三十字往上，所以金额和负责人用 · 接在后面，只截前面几个字，
 * 完整信息（编号/日期/地区）全留在 title 里。
 */
/**
 * 这条线索的中标信息（结果公告回填进来的）。
 * 正常情况下采集脚本写 win_bidder / win_amount / win_packages；
 * 但 win_* 是三列新字段，要跑过 sql/lead_result_win.sql 才有——列没建时脚本
 * 只能把「中标 xxx 万 · 中标人 xxx」写进 notes。两种都认，卡片不至于空着。
 * @returns {{bidder:string,amount:number,packs:object[],packsN:number}|null}
 */
function leadWinOf(l){
  l=l||{};
  var bidder=String(l.win_bidder||'').trim();
  var amount=Number(l.win_amount)>0?Number(l.win_amount):0;
  var packs=Array.isArray(l.win_packages)?l.win_packages.filter(Boolean):[];
  var date=String(l.win_date||'').slice(0,10);
  if(!bidder&&!amount){
    var nt=String(l.notes||'');
    if(nt.indexOf('中标')<0)return null;
    var mb=nt.match(/中标人\s+([^·；]+)/);
    if(mb)bidder=mb[1].trim();
    var ma=nt.match(/中标\s+([\d.]+)\s*万/);
    if(ma)amount=Math.round(parseFloat(ma[1])*10000);
    else{
      var ma2=nt.match(/中标\s+([\d,]+)\s*元/);
      if(ma2)amount=Number(String(ma2[1]).replace(/,/g,''))||0;
    }
  }
  if(!bidder&&!amount)return null;
  return {bidder:bidder,amount:amount,packs:packs,packsN:packs.length,date:date};
}

/**
 * 中标行：「🏆 中标 579.58万 · 中电智安科技有限公司」。
 * 中标了说明预算落地、项目真的在干；中标价还能反推自己的报价空间。
 * 中标人可能有 4 家（多包 / 联合体），气泡里只放前两家，全名和分包放 title。
 */
function leadWinHtml(l){
  var w=leadWinOf(l);
  if(!w)return '';
  var bits=[];
  if(w.amount>0)bits.push('中标 '+formatMoney(w.amount));
  if(w.packsN>1)bits.push(w.packsN+'包');
  var names=String(w.bidder||'').split('、').filter(Boolean);
  var coShow=names.length>2?(names.slice(0,2).join('、')+' 等'+names.length+'家'):names.join('、');
  var tip=['中标人：'+(w.bidder||'-')];
  if(w.amount>0)tip.push('中标金额：'+formatMoney(w.amount));
  if(w.packsN>1){
    for(var i=0;i<w.packsN;i++){
      var pk=w.packs[i]||{};
      tip.push('包'+(pk.no||(i+1))+':'+(pk.bidder||'-')+(Number(pk.amount)>0?(' '+formatMoney(pk.amount)):''));
    }
  }
  if(w.date)tip.push('中标公告：'+w.date);
  return '<div class="card-win" title="'+h(tip.join(' / '))+'">🏆 '+h(bits.join(' · '))
    +(coShow?(' · '+h(coShow)):'')+'</div>';
}

function leadCardProjectHtml(l){
  l=l||{};
  var name=String(l.project_name||'').trim();
  if(!name)return '';
  var bits=[];
  if(Number(l.budget)>0)bits.push('💰'+formatMoney(l.budget));
  var own=String(l.contact_name||'').trim();
  if(own)bits.push('👤'+own);
  var tip=['项目：'+name];
  if(Number(l.budget)>0)tip.push('预算：'+formatMoney(l.budget));
  if(l.publish_date)tip.push('招标日期：'+String(l.publish_date).slice(0,10));
  if(l.project_no)tip.push('编号：'+l.project_no);
  if(l.region)tip.push('地区：'+l.region);
  if(own)tip.push('甲方负责人：'+own);
  return '<div class="card-projects"><span class="card-project-tag" title="'+h(tip.join(' / '))+'">📋 '+h(name)+(bits.length?(' · '+h(bits.join(' · '))):'')+'</span></div>';
}

/**
 * 联系人 —— 客户卡片底部那一行：👤 姓名 + 手机/座机/邮箱药丸。
 * 客户表单里联系人有姓名/部门/职务/房号，招标公告基本只给姓名和电话，
 * 没有的就不渲染（空着），不编造。
 */
/**
 * 这个人的所有号码，手机和座机分开。
 * 同一联系人挂几个号在招标公告里很常见（座机连写、手机两个），
 * 只显示一个等于让销售「换个号码就打不通」。
 * 手机和座机必须分流：座机塞进手机栏，发短信失败，导出的名单也是错的。
 * @returns {{mobiles:string[], telnums:string[]}}
 */
function leadPhonesOf(l){
  l=l||{};
  var mobs=[],tels=[];
  function one(s){
    var d=s.replace(/[^0-9]/g,'');
    if(/^20\d{6}$/.test(d))return;          // 20251119 这种日期别当号码
    if(/^1[3-9]\d{9}$/.test(d)){
      if(mobs.indexOf(d)<0)mobs.push(d);
    }else if(d.length>=7&&d.length<=13){
      var key=s.replace(/\s+/g,'');
      if(tels.indexOf(key)<0&&tels.indexOf(d)<0)tels.push(key);
    }
  }
  function push(v){
    var s=String(v||'').trim();
    if(!s)return;
    // 一段里可能连写多个号：「023-62292550 62293081」。
    // 拆开逐个认，后一个没带区号就继承前一个的（62293081 → 023-62293081）
    var parts=s.split(/\s+/).filter(Boolean);
    if(parts.length<=1){one(s);return}
    var area='';
    for(var i=0;i<parts.length;i++){
      var p=parts[i];
      var m=p.match(/^(0\d{2,3})[-－—]?\d{7,8}/);
      if(m)area=m[1];
      else if(area&&/^\d{7,8}$/.test(p.replace(/\D/g,'')))p=area+'-'+p.replace(/\D/g,'');
      one(p);
    }
  }
  push(l.contact_mobile);
  var raw=String(l.contact_phone||'').trim();
  if(raw.charAt(0)==='['){
    // 线索表单存多号用 JSON 数组，采集端用 ' / ' 连接，两种都要认
    try{var arr=JSON.parse(raw);if(Array.isArray(arr))arr.forEach(push)}catch(e){}
  }else{
    raw.split(/[\/、,，;；\n]+/).forEach(push);
  }
  return {mobiles:mobs,telnums:tels};
}

/** 手机 / 座机药丸：最多各两个，其余折成 +N，完整列表放 title */
function leadContactHtml(l){
  l=l||{};
  var out='';
  var nm=String(l.contact_name||'').trim();
  if(nm)out+='<span class="card-contact-count">👤 '+h(nm)+'</span>';
  var ph=leadPhonesOf(l);
  var maxShow=2;
  var tip=function(a){return h(a.join(' / '))};
  for(var i=0;i<ph.mobiles.length&&i<maxShow;i++){
    out+='<a class="contact-phone-link" href="tel:'+h(ph.mobiles[i])+'" title="'+tip(ph.mobiles)+'" onclick="event.stopPropagation()"><span class="ph-icon">📱</span>'+h(ph.mobiles[i])+'</a>';
  }
  if(ph.mobiles.length>maxShow)out+='<span style="font-size:11px;color:var(--text3)" title="'+tip(ph.mobiles.slice(maxShow))+'">+'+(ph.mobiles.length-maxShow)+'</span>';
  for(var j=0;j<ph.telnums.length&&j<maxShow;j++){
    out+='<a class="contact-phone-link" href="tel:'+h(ph.telnums[j].replace(/[^0-9+]/g,''))+'" title="'+tip(ph.telnums)+'" onclick="event.stopPropagation()"><span class="ph-icon">📞</span>'+h(ph.telnums[j])+'</a>';
  }
  if(ph.telnums.length>maxShow)out+='<span style="font-size:11px;color:var(--text3)" title="'+tip(ph.telnums.slice(maxShow))+'">+'+(ph.telnums.length-maxShow)+'</span>';
  if(l.contact_email)out+='<a class="contact-phone-link" href="mailto:'+h(l.contact_email)+'" onclick="event.stopPropagation()"><span class="ph-icon">📧</span>'+h(l.contact_email)+'</a>';
  return out?'<div class="card-contact">'+out+'</div>':'';
}

/**
 * 采集附注（卡片最后一行小字）：来源站点 / 客户库已有 / 附件 / 公告原文 / 品目关键词。
 * 预算、日期、地区已经进了项目气泡，这里不重复；
 * 招标代理机构的信息刻意不展示 —— 客户要跟的是甲方，代理公司不是客户。
 * @param {string} extra 品目、关键词这类不占主位置的补充信息
 */
function leadFetchedMetaHtml(l,extra){
  var bd='';
  if(l.auto_fetched||l.source_url){
    var site=LEAD_SITE_LABEL[l.source_site]||'';
    if(site)bd+='<span>来源：'+h(site)+'</span>';
  }
  if(l.client_id)bd+='<span style="color:var(--success);font-weight:600">✓ 客户库已有</span>';
  if(l.attachments&&l.attachments.length)bd+=leadAttLinksHtml(l.attachments);
  if(l.source_url)bd+='<a href="'+h(l.source_url)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--primary);text-decoration:none">📄 公告原文</a>';
  if(extra)bd+='<span title="'+h(extra)+'">'+h(extra)+'</span>';
  return bd?'<div class="card-fetch">'+bd+'</div>':'';
}

/** 名称像招标代理 / 工程管理 / 造价咨询公司 —— 这类不是客户，历史数据里还有残留 */
var LEAD_AGENCY_RE=/(招标代理|招标有限|采购代理|工程管理|项目管理|工程咨询|造价咨询|建设咨询|招标咨询|工程监理|代理有限)/;
function leadSuspectAgency(l){
  return !!(l&&LEAD_AGENCY_RE.test(String(l.name||'')));
}

/**
 * 线索卡片 = 客户卡片。
 * 同一家单位今天在线索里、明天就进了客户库，两套视觉只会让人反复重新认。
 * 直接复用 .client-card / .card-name / .card-projects / .card-contact 全套类名。
 * @param {object} l      lead_pool 行
 * @param {object} opts   {mode:'pending'|'pool'|'mine', actions:'按钮 HTML'}
 */
function leadClientCardHtml(l,opts){
  opts=opts||{};
  var mode=opts.mode||'pool';
  var stMap={new:'新线索',assigned:'已分配',contacted:'已联系',converted:'已转化',recycled:'已回收',junk:'无效',lost:'已失效'};
  var stTxt=mode==='pending'?'待审核':(stMap[l.status]||l.status||'线索');
  var stCls=mode==='pending'?'pending':(l.status||'');
  var addr=String(l.contact_addr||l.address||'').trim();
  var html='<div class="client-card lead-as-client" onclick="openLeadForm(\''+h(l.id)+'\')">';
  html+=leadCardTypesHtml(l);
  html+='<div class="card-name-row"><div class="card-name" title="'+h(l.name||'')+'">'+h(l.name||'（未填单位）')+'</div>'
    +'<span class="lead-status-badge '+h(stCls)+'">'+h(stTxt)+'</span></div>';
  if(addr)html+='<div class="card-addr" title="'+h(addr)+'">📍 '+h(addr)+'</div>';
  html+=leadCardProjectHtml(l);
  html+=leadWinHtml(l);
  html+=leadContactHtml(l);
  // 品目、关键词这类「为什么抓进来」的信息并到最后一行，不再单独占一行
  var extra=[];
  if(mode==='pending'&&l.notes){
    String(l.notes).replace(/^自动采集\s*[·,，]?\s*/,'').split('·').forEach(function(x){
      x=String(x||'').trim();
      if(/^品目|^关键词/.test(x))extra.push(x);
    });
  }
  html+=leadFetchedMetaHtml(l,extra.join(' · '));
  // 历史数据里混进来的代理公司：审核时得让人一眼看见，否则通过就成了「代理客户」。
  // 这是唯一还单独占一行的附注——它是「别通过」的红灯，不能缩成小字
  if(leadSuspectAgency(l))html+='<div class="pending-why" style="color:var(--danger);font-weight:600">⚠️ 疑似招标代理公司，不是甲方，建议忽略</div>';
  if(opts.actions)html+='<div class="lead-actions" onclick="event.stopPropagation()">'+opts.actions+'</div>';
  html+='</div>';
  return html;
}

/** 招标公告附件：最多列 3 个可直接下载的，其余折叠成「+N」 */
/**
 * 招标公告附件：卡片上只留一个入口「📎 附件 2」。
 * 公告附件名动辄二十字（「（挂网稿）口腔CT机房辐射防护…」），排三个就把整行吃掉了；
 * 名字放进 title，点一下打开第一个能直链的。
 */
function leadAttLinksHtml(atts){
  var n=atts.length,first='',names=[];
  if(!n)return '';
  for(var i=0;i<n;i++){
    var a=atts[i]||{};
    names.push(String(a.name||'附件'));
    if(!first&&a.url)first=a.url;
  }
  var tip='附件：'+names.join(' / ');
  if(first)return '<a href="'+h(first)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="color:var(--primary);text-decoration:none" title="'+h(tip)+'">📎 附件 '+n+'</a>';
  // 交易网的附件拿不到直链，只能提示去原文下
  return '<span title="'+h(tip+'（需到公告原文下载）')+'">📎 附件 '+n+'</span>';
}

/** 复制电话到剪贴板（手机上点一下就能拨） */
function copyLeadPhone(p){
  var t=String(p||'').trim();
  if(!t)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(function(){showToast('已复制 '+t)},function(){showToast(t)});
  }else{showToast(t)}
}

function renderLeads(){
  // Sales pipeline leads (assigned to current user)
  var list=allLeads||[];
  var q=(document.getElementById('lead-search')||{}).value||'';
  q=q.trim().toLowerCase();
  var stage=(document.getElementById('lead-stage-filter')||{}).value||'all';
  if(q)list=list.filter(function(l){return(l.name||'').toLowerCase().indexOf(q)>=0||(l.contact_name||'').toLowerCase().indexOf(q)>=0||(l.contact_phone||'').indexOf(q)>=0});
  if(stage!=='all')list=list.filter(function(l){return l.stage===stage||l.status===stage});
  var grid=document.getElementById('sales-lead-grid'),empty=document.getElementById('sales-lead-empty');
  if(!list.length){grid.innerHTML='';if(empty)empty.classList.remove('hidden');return}
  if(empty)empty.classList.add('hidden');
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var assignee='';
    if(l.assigned_to&&allUsers){var u=allUsers.find(function(x){return x.user_id===l.assigned_to});assignee=u?(u.display_name||u.email||''):''}
    var acts='';
    if(assignee)acts+='<span style="font-size:11px;color:var(--text3);margin-right:2px">分配：'+h(assignee)+'</span>';
    acts+='<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    var li=_leadProjectCache.length;
    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||'',budget:l.budget||null});
    acts+='<button class="btn-lead-success" onclick="event.stopPropagation();openProjectFormFromLeadIdx('+li+')">转项目</button>';
    acts+='<button class="btn-lead-danger" onclick="event.stopPropagation();deleteLead(\''+l.id+'\')">删除</button>';
    html+=leadClientCardHtml(l,{mode:'mine',actions:acts});
  }
  grid.innerHTML=html;
}

function renderPoolLeads(){
  // Lead pool (unassigned leads)
  var list=poolLeads||[];
  var q=(document.getElementById('lead-pool-search')||{}).value||'';
  q=q.trim().toLowerCase();
  var filter=(document.getElementById('lead-pool-filter')||{}).value||'all';
  if(q)list=list.filter(function(l){return(l.name||'').toLowerCase().indexOf(q)>=0||(l.contact_name||'').toLowerCase().indexOf(q)>=0||(l.contact_phone||'').indexOf(q)>=0});
  if(filter!=='all')list=list.filter(function(l){return l.status===filter});
  // Stats
  var total=poolLeads.length,converted=0;
  for(var i=0;i<poolLeads.length;i++){if(poolLeads[i].status==='converted')converted++}
  var statsBar=document.getElementById('leads-stats-bar');
  if(statsBar)statsBar.innerHTML='<div class="stat-card"><div class="stat-num">'+total+'</div><div class="stat-label">公海线索</div></div><div class="stat-card"><div class="stat-num">'+list.length+'</div><div class="stat-label">'+(filter!=='all'||q?'筛选结果':'当前显示')+'</div></div>';
  var grid=document.getElementById('lead-grid'),empty=document.getElementById('lead-empty');
  if(!list.length){grid.innerHTML='';if(empty)empty.classList.remove('hidden');return}
  if(empty)empty.classList.add('hidden');
  var html='';
  for(var i=0;i<list.length;i++){
    var l=list[i];
    var acts='<button class="btn-lead-success" onclick="event.stopPropagation();convertLeadToClient(\''+l.id+'\')">✓ 转为客户</button>';
    acts+='<button class="btn-lead-primary" onclick="event.stopPropagation();assignLead(\''+l.id+'\')">分配</button>';
    acts+='<button class="btn-lead-primary" onclick="event.stopPropagation();openLeadForm(\''+l.id+'\')">编辑</button>';
    var li=_leadProjectCache.length;
    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||'',budget:l.budget||null});
    acts+='<button class="btn-lead-primary" onclick="event.stopPropagation();openProjectFormFromLeadIdx('+li+')">转项目</button>';
    acts+='<button class="btn-lead-danger" onclick="event.stopPropagation();deleteLead(\''+l.id+'\')">删除</button>';
    html+=leadClientCardHtml(l,{mode:'pool',actions:acts});
  }
  grid.innerHTML=html;
}

// === Lead Company Name Autocomplete ===
var leadCompSuggIdx=-1,leadCompSuggList=[];
function onLeadCompanyInput(){
  var inp=document.getElementById('lf-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  // 客户库懒加载
  if(!allClients||!allClients.length){
    sb.from('clients').select('*').eq('company_id',currentCompanyId).order('name').then(function(r){if(r.data){allClients=r.data;onLeadCompanyInput()}});
    return;
  }
  var matches=[];
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i];var cn=(c.name||'').toLowerCase();
    if(cn.indexOf(val)>=0)matches.push(c);
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  var clientIdxMap={};
  for(var j=0;j<matches.length;j++)clientIdxMap[matches[j].id]=j;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.industry||'')+(c.address?' · '+escHtml(c.address).substring(0,15):'')+'</div></div>'}).join('');
  dd.classList.remove('hidden');
}
function onLeadCompanyKey(e){
  var dd=document.getElementById('lead-name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadCompSuggIdx=Math.min(leadCompSuggIdx+1,leadCompSuggList.length-1);updateLeadCompActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadCompSuggIdx=Math.max(leadCompSuggIdx-1,0);updateLeadCompActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadCompSuggIdx>=0)selectLeadCompany(leadCompSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadCompSuggIdx=-1}
}
function updateLeadCompActive(){
  var items=document.querySelectorAll('#lead-name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadCompSuggIdx);
  if(leadCompSuggIdx>=0&&items[leadCompSuggIdx])items[leadCompSuggIdx].scrollIntoView({block:'nearest'});
}
function fmtMulti(v){if(!v)return'';if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return v}}if(Array.isArray(v))return v.filter(function(x){return x}).join('\n');return String(v);}
function onLeadTypeChange(){
  var type=document.getElementById('lf-customer-type').value;
  var crEl=document.getElementById('lf-credit-code');
  var addrEl=document.getElementById('lf-address');
  var clientId=document.getElementById('lf-client-id').value;
  if(type==='B2B'){
    crEl.readOnly=false;crEl.style.background='';crEl.style.color='';
    if(addrEl){addrEl.readOnly=false;addrEl.style.background='';addrEl.style.color='';}
    if(clientId){
      var client=(allClients||[]).find(function(c){return c.id===clientId});
      if(client&&client.credit_code)crEl.value=client.credit_code;
      if(client&&client.address&&addrEl)addrEl.value=client.address;
    }
  }else{
    crEl.value='';crEl.readOnly=true;crEl.style.background='var(--bg2)';crEl.style.color='var(--text3)';
    if(addrEl){addrEl.value='';addrEl.readOnly=true;addrEl.style.background='var(--bg2)';addrEl.style.color='var(--text3)';}
  }
}
function selectLeadCompany(idx){
  var client=leadCompSuggList[idx];if(!client)return;
  document.getElementById('lf-name').value=client.name||'';
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  // 锁定 client_id
  document.getElementById('lf-client-id').value=client.id||'';
  // 自动填充客户信息
  if(client.industry)document.getElementById('lf-industry').value=client.industry;
  if(client.scale)document.getElementById('lf-scale').value=client.scale;
  var cc=client.credit_code||'';if(!cc){try{var ci=typeof client.company_info==='string'?JSON.parse(client.company_info):(client.company_info||{});cc=ci.credit_code||'';}catch(e){}}if(cc)document.getElementById('lf-credit-code').value=cc;
  if(client.address)document.getElementById('lf-address')?document.getElementById('lf-address').value=client.address:null;
  // 客户类型
  if(client.type){try{var types=JSON.parse(client.type);if(Array.isArray(types)&&types.length){var t=types[0]||'';document.getElementById('lf-customer-type').value=t.indexOf('B2B')===0?'B2B':t.indexOf('B2C')===0?'B2C':''}}catch(e){}if(!document.getElementById('lf-customer-type').value&&client.credit_code)document.getElementById('lf-customer-type').value='B2B';}
  onLeadTypeChange();
  // 自动填充联系人（从 allContacts 表按 client_id 查找）
  var contacts=(allContacts||[]).filter(function(ct){return ct.client_id===client.id});
  function firstVal(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){}}if(Array.isArray(v))v=v[0]||'';return String(v||'');}
  if(contacts.length>0){
    document.getElementById('lf-contact-name').value=contacts[0].name||'';
    document.getElementById('lf-contact-phone').value=fmtMulti(contacts[0].phone);
    document.getElementById('lf-contact-email').value=fmtMulti(contacts[0].email);
  } else {
    document.getElementById('lf-contact-name').value='';
    document.getElementById('lf-contact-phone').value='';
    document.getElementById('lf-contact-email').value='';
  }
  // 归属销售默认填充当前用户
  if(!document.getElementById('lf-assigned-sales').value){
    document.getElementById('lf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  }
}

// === Lead Contact picker — from selected client's contacts only ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactPicker(){
  var clientId=document.getElementById('lf-client-id').value;
  if(!clientId){showToast('请先选择客户');return}
  if(!allClients||!allClients.length){showToast('客户数据未加载');return}
  var client=allClients.find(function(c){return c.id===clientId});
  if(!client){showToast('未找到关联客户');return}
  var contacts=(allContacts||[]).filter(function(ct){return ct.client_id===clientId});
  if(contacts.length<=1){showToast('该客户只有一个联系人');return}
  leadContactSuggList=contacts;
  function pickPhone(ct){var p=ct.phone;if(typeof p==='string'){try{p=JSON.parse(p)}catch(e){}}if(Array.isArray(p))p=p[0]||'';return String(p||'');}
  function pickEmail(ct){var e=ct.email;if(typeof e==='string'){try{e=JSON.parse(e)}catch(e){}}if(Array.isArray(e))e=e[0]||'';return String(e||'');}
  var html='';
  for(var i=0;i<contacts.length;i++){
    var ct=contacts[i];
    var ph=pickPhone(ct),em=pickEmail(ct);
    html+='<div class="name-suggestion" style="cursor:pointer;padding:8px 12px;border-bottom:1px solid var(--border)" onmousedown="selectLeadContact('+i+')"><div class="ns-name">'+escHtml(ct.name||'')+'</div><div class="ns-detail">📞 '+escHtml(ph)+(em?' · 📧 '+escHtml(em):'')+(ct.position?' · '+escHtml(ct.position):'')+'</div></div>';
  }
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd){dd.innerHTML=html;dd.classList.remove('hidden');}
}
function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(!dd||dd.classList.contains('hidden'))return;
  if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}

function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  function pv(v){if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){}}if(Array.isArray(v))v=v[0]||'';return String(v||'');}
  document.getElementById('lf-contact-name').value=m.name||'';
  document.getElementById('lf-contact-phone').value=fmtMulti(m.phone);
  document.getElementById('lf-contact-email').value=fmtMulti(m.email);
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd)dd.classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
}


function openLeadForm(id){
  leadEditId=id||null;
  document.getElementById('lead-form-title').textContent=id?'编辑线索':'新建线索';
  document.getElementById('lead-btn-delete').classList.toggle('hidden',!id);
  if(!id){
    document.getElementById('lf-creator').value=currentUser?(currentUser.realname||currentUser.name||currentUser.email||''):'';
    document.getElementById('lf-created-at').value=new Date().toLocaleString('zh-CN');
  }
  document.getElementById('lf-name').value='';
  document.getElementById('lf-contact-name').value='';
  document.getElementById('lf-contact-phone').value='';
  document.getElementById('lf-contact-email').value='';
  document.getElementById('lf-source').value='';
  document.getElementById('lf-industry').value='';
  document.getElementById('lf-scale').value='';
  document.getElementById('lf-max-recycle').value='3';
  document.getElementById('lf-recycle-days').value='30';
  document.getElementById('lf-status').value='new';
  document.getElementById('lf-notes').value='';
  document.getElementById('lf-project-name').value='';
  document.getElementById('lf-client-id').value='';
  document.getElementById('lf-lead-id').value='';
  document.getElementById('lf-opportunity-id').value='';
  document.getElementById('lf-customer-type').value='';
  document.getElementById('lf-credit-code').value='';
  document.getElementById('lf-assigned-sales').value='';
  document.getElementById('lf-department').value='';
  document.getElementById('lf-creator').value='';
  document.getElementById('lf-created-at').value='';
  if(id){
    var l=(allLeads||[]).concat(poolLeads||[]).concat(pendingLeads||[]).find(function(x){return x.id==id||String(x.id)===String(id)});
    if(l){
      document.getElementById('lf-name').value=l.name||'';
      document.getElementById('lf-contact-name').value=l.contact_name||'';
      // 手机、座机都放进同一个输入框（第一行手机），审核时能直接改号码。
      // 一个人多个号就一行一个，保存时再按号码形态分流
      (function(){
        var ph=leadPhonesOf(l);
        document.getElementById('lf-contact-phone').value=ph.mobiles.concat(ph.telnums).join('\n');
      })();
      document.getElementById('lf-contact-email').value=l.contact_email||'';
      var _addrIn=document.getElementById('lf-address');
      if(_addrIn)_addrIn.value=l.contact_addr||l.address||'';
      document.getElementById('lf-source').value=l.source||'';
      document.getElementById('lf-industry').value=l.industry||'';
      document.getElementById('lf-scale').value=l.scale||'';
      document.getElementById('lf-max-recycle').value=l.max_recycle_count||3;
      document.getElementById('lf-recycle-days').value=l.recycle_days||30;
      document.getElementById('lf-status').value=l.status||'new';
      document.getElementById('lf-notes').value=l.notes||'';
      document.getElementById('lf-project-name').value=l.project_name||'';
      document.getElementById('lf-client-id').value=l.client_id||'';
      document.getElementById('lf-lead-id').value=l.lead_id||'';
      document.getElementById('lf-opportunity-id').value=l.opportunity_id||'';
      document.getElementById('lf-customer-type').value=l.customer_type||'';
      document.getElementById('lf-credit-code').value=l.credit_code||'';
      document.getElementById('lf-assigned-sales').value=l.assigned_sales||'';
      document.getElementById('lf-department').value=l.department||'';
      document.getElementById('lf-creator').value=l.creator||'';
      document.getElementById('lf-created-at').value=l.created_at?new Date(l.created_at).toLocaleString('zh-CN'):'';
      // 同步关联客户的最新信用代码、地址、行业、联系人
      syncLeadFromClient(l.client_id);
    }
  }
  document.getElementById('lead-form-modal').classList.remove('hidden');
}
function syncLeadFromClient(clientId){
  if(!clientId||!allClients||!allClients.length)return;
  var c=allClients.find(function(x){return x.id===clientId||String(x.id)===String(clientId)});
  if(!c)return;
  // 同步信用代码：优先从 company_info JSONB，兼容 credit_code 独立列
  var cc='';
  try{var ci=typeof c.company_info==='string'?JSON.parse(c.company_info):(c.company_info||{});cc=c.credit_code||ci.credit_code||'';}catch(e){cc=c.credit_code||'';}
  if(cc){document.getElementById('lf-credit-code').value=cc;}
  // 只补空着的：自动采集的线索本身带着采购人地址/联系人，
  // 不能被客户档案里那份覆盖掉（否则审核时看到的是老资料，改的也是老资料）
  var _addrEl2=document.getElementById('lf-address');
  if(c.address&&_addrEl2&&!_addrEl2.value.trim())_addrEl2.value=c.address;
  if(c.industry&&!document.getElementById('lf-industry').value)document.getElementById('lf-industry').value=c.industry;
  // 同步联系人
  try{var cts=allContacts.filter(function(ct){return ct.client_id===clientId||String(ct.client_id)===String(clientId)});
    if(cts.length>0){
      var cnEl=document.getElementById('lf-contact-name');
      if(cnEl&&!cnEl.value.trim())cnEl.value=cts[0].name||'';
      var phEl=document.getElementById('lf-contact-phone');
      if(phEl&&!phEl.value.trim()){
        var lines=[];
        fmtMulti(cts[0].phone).split('\n').forEach(function(x){x=String(x||'').trim();if(x&&lines.indexOf(x)<0)lines.push(x)});
        fmtMulti(cts[0].landline).split('\n').forEach(function(x){x=String(x||'').trim();if(x&&lines.indexOf(x)<0)lines.push(x)});
        phEl.value=lines.join('\n');
      }
      var emEl=document.getElementById('lf-contact-email');
      if(emEl&&!emEl.value.trim())emEl.value=fmtMulti(cts[0].email);
    }}
  catch(e){}
}

function closeLeadForm(){document.getElementById('lead-form-modal').classList.add('hidden');leadEditId=null}

async function saveLead(){
  var name=document.getElementById('lf-name').value.trim();
  if(!name){showToast('请输入线索名称');return}
  // 手机、座机同框录入（跟客户表单一样分开存）：第一行手机存 contact_mobile，
  // 其余存 contact_phone。手机号单独一列，销售打电话、短信都用得上。
  var _phLines=String((document.getElementById('lf-contact-phone')||{}).value||'')
    .split('\n').map(function(x){return String(x).trim()}).filter(Boolean);
  var _mob='',_tels=[];
  for(var _pi=0;_pi<_phLines.length;_pi++){
    var _d=_phLines[_pi].replace(/[-－—()（）\s]/g,'');
    if(!_mob&&/^1[3-9]\d{9}$/.test(_d))_mob=_d;
    else _tels.push(_phLines[_pi]);
  }
  var lead={
    name:name,
    contact_name:document.getElementById('lf-contact-name').value.trim(),
    contact_phone:_tels.join(' / '),
    contact_mobile:_mob,
    contact_addr:String((document.getElementById('lf-address')||{}).value||'').trim(),
    contact_email:document.getElementById('lf-contact-email').value.trim(),
    source:document.getElementById('lf-source').value,
    industry:document.getElementById('lf-industry').value,
    scale:document.getElementById('lf-scale').value,
    max_recycle_count:parseInt(document.getElementById('lf-max-recycle').value)||3,
    recycle_days:parseInt(document.getElementById('lf-recycle-days').value)||30,
    status:document.getElementById('lf-status').value,
    project_name:document.getElementById('lf-project-name').value.trim(),
    client_id:document.getElementById('lf-client-id').value||null,
    customer_type:document.getElementById('lf-customer-type').value,
    credit_code:document.getElementById('lf-credit-code').value.trim(),
    assigned_sales:document.getElementById('lf-assigned-sales').value.trim(),
    department:document.getElementById('lf-department').value,
    creator:document.getElementById('lf-creator').value.trim(),
    notes:document.getElementById('lf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!lead.client_id&&lead.name){
    try{var {data:cm}=await sb.from('clients').select('id').eq('company_id',currentCompanyId).ilike('name',lead.name).limit(1);if(cm&&cm.length)lead.client_id=cm[0].id}catch(e){}
  }
  if(!leadEditId){
    lead.company_id=currentCompanyId;
    lead.created_by=currentUser.id;
    // Auto-generate lead_id: LEAD+YYYYMMDD+3-digit seq
    var today=new Date();
    var yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
    var datePrefix='LEAD'+yyyy+mm+dd;
    try{var {data:cnt}=await sb.from('lead_pool').select('lead_id',{count:'exact',head:true}).like('lead_id',datePrefix+'%');var seq=(cnt||0)+1;lead.lead_id=datePrefix+String(seq).padStart(3,'0');}catch(e){lead.lead_id=datePrefix+'001';}
    if(leadFormSource==='sales'){lead.assigned_to=currentUser.id;lead.status='assigned';lead.assigned_at=new Date().toISOString();}
    var {error}=await sb.from('lead_pool').insert(lead);
    if(error){console.error('[saveLead] error:',error.message,'details:',error.details,'hint:',error.hint,'code:',error.code);showToast('创建失败: '+error.message);return}
  }else{
    var {error}=await sb.from('lead_pool').update(lead).eq('id',leadEditId);
    if(error){showToast('更新失败: '+error.message);return}
  }
  closeLeadForm();
  await loadPoolLeads();
  if(typeof loadPendingLeads==='function')await loadPendingLeads();
  if(currentUser&&currentUser.id)await loadLeads();
  showToast(leadEditId?'已更新':'已创建');
}

async function deleteLead(id){
  if(!id)return;
  if(leadEditId===id)closeLeadForm();
  var _delErr=(await sb.from('lead_pool').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  await loadPoolLeads();
  if(currentUser&&currentUser.id)await loadLeads();
  showToast('已删除');
}

function assignLead(id){
  leadAssignId=id;
  var sel=document.getElementById('la-user-select');
  sel.innerHTML='<option value="">选择用户</option>';
  for(var i=0;i<allUsers.length;i++)sel.innerHTML+='<option value="'+allUsers[i].user_id+'">'+escHtml(allUsers[i].display_name||allUsers[i].email||allUsers[i].user_id)+'</option>';
  document.getElementById('lead-assign-modal').classList.remove('hidden');
}

async function doAssignLead(){
  var userId=document.getElementById('la-user-select').value;
  if(!userId){showToast('请选择用户');return}
  var {error}=await sb.from('lead_pool').update({assigned_to:userId,assigned_at:new Date().toISOString(),status:'assigned',updated_at:new Date().toISOString()}).eq('id',leadAssignId);
  document.getElementById('lead-assign-modal').classList.add('hidden');
  if(error){showToast('分配失败: '+error.message);return}
  await loadPoolLeads();await loadLeads();showToast('已分配');
}

async function convertLeadToClient(id){
  // 公海里的「转为客户」：和审核通过走同一条建客户逻辑（同名不重复建档、只补联系人）
  var l=(poolLeads||[]).concat(allLeads||[]).filter(function(x){return String(x.id)===String(id)})[0];
  if(!l){
    var {data:rows,error:le}=await sb.from('lead_pool').select('*').eq('id',id).limit(1);
    if(le||!rows||!rows.length){showToast('线索未找到: '+(le?le.message:'数据为空'));return}
    l=rows[0];
  }
  var r=await leadToClientProfile(l);
  if(r.error){showToast('转化失败: '+r.error);return}
  var now=new Date().toISOString();
  await safeWriteById('lead_pool','update',{
    status:'converted',client_id:r.clientId,converted_client_id:r.clientId,converted_at:now,updated_at:now
  },id,{allowProxy:false});
  await Promise.all([loadClients(),loadPoolLeads(),loadLeads()]);
  showToast(r.created?('已创建客户「'+r.clientName+'」'):('已并入客户「'+r.clientName+'」'+leadMergeSummary(r)));
}

function openLeadImport(){
  document.getElementById('li-csv').value='';
  document.getElementById('lead-import-modal').classList.remove('hidden');
}

async function importLeads(){
  var raw=document.getElementById('li-csv').value.trim();
  if(!raw){showToast('请粘贴CSV内容');return}
  var lines=raw.split('\n').filter(function(l){return l.trim()});
  var start=0;
  // Skip header if first line looks like header
  if(lines[0]&&(lines[0].indexOf('名称')>=0||lines[0].indexOf('name')>=0))start=1;
  var imported=0;
  for(var i=start;i<lines.length;i++){
    var cols=lines[i].split(',');
    if(!cols[0]||!cols[0].trim())continue;
    var lead={name:cols[0].trim(),contact_name:(cols[1]||'').trim(),contact_phone:(cols[2]||'').trim(),contact_email:(cols[3]||'').trim(),source:(cols[4]||'').trim(),industry:(cols[5]||'').trim(),scale:(cols[6]||'').trim(),notes:(cols[7]||'').trim(),status:'new',company_id:currentCompanyId,created_by:currentUser.id};
    var {error}=await sb.from('lead_pool').insert(lead);
    if(!error)imported++;
  }
  document.getElementById('lead-import-modal').classList.add('hidden');
  if(imported>0){await loadPoolLeads();showToast('已导入 '+imported+' 条线索')}
  else showToast('导入失败');
}

async function recycleStale(){
  var now=new Date();
  var {data:assignedLeads}=await sb.from('lead_pool').select('*').eq('company_id',currentCompanyId).in('status',['assigned','contacted']);
  var recycled=0;
  for(var i=0;i<(assignedLeads||[]).length;i++){
    var l=assignedLeads[i];
    var days=l.recycle_days||30;
    var assignedDate=l.assigned_at?new Date(l.assigned_at):null;
    if(!assignedDate)continue;
    var elapsed=(now-assignedDate)/(86400000);
    if(elapsed>=days){
      var rc=(l.recycle_count||0)+1;
      var maxRc=l.max_recycle_count||3;
      if(rc>=maxRc){
        await sb.from('lead_pool').update({status:'lost',updated_at:new Date().toISOString()}).eq('id',l.id);
      }else{
        await sb.from('lead_pool').update({status:'new',assigned_to:null,assigned_at:null,recycled_at:now.toISOString(),recycle_count:rc,updated_at:now.toISOString()}).eq('id',l.id);
      }
      recycled++;
    }
  }
  if(recycled>0){await loadPoolLeads();await loadLeads();showToast('已回收 '+recycled+' 条线索')}
  else showToast('没有需要回收的线索');
}



// === Collab: Follow-up Records ===
async function loadFollowups(){
  if(!currentCompanyId)return;
  var clientFilter=document.getElementById('fu-client-filter').value;
  var typeFilter=document.getElementById('fu-type-filter').value;
  // Populate client filter
  var sel=document.getElementById('fu-client-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+escHtml(cl.name)+'</option>'}
  }
  var q=sb.from('engagement_logs').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(clientFilter)q=q.eq('client_id',clientFilter);
  if(typeFilter)q=q.eq('type',typeFilter);
  var {data}=await q;
  var list=document.getElementById('followup-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无跟进记录</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var f=data[i];var cl2=allClients.find(function(x){return x.id===f.client_id});
    h+='<div class="schedule-item" style="border-left-color:#8B5CF6"><div class="sch-title"><span style="background:#EDE9FE;color:#7C3AED;padding:1px 6px;border-radius:4px;font-size:11px">'+escHtml(f.type||'其他')+'</span> '+(cl2?escHtml(cl2.name):'未知客户')+'</div><div style="font-size:13px;margin:4px 0">'+escHtml(f.content||'')+'</div>'+(f.outcome?'<div style="font-size:12px;color:#10B981">'+escHtml(f.outcome)+'</div>':'')+(f.next_step?'<div class="sch-meta">下一步: '+escHtml(f.next_step)+(f.next_date?' ('+f.next_date+')':'')+'</div>':'')+'<div class="sch-meta">'+new Date(f.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteEngagement(\''+f.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openFollowupForm(){
  var h='<div class="modal-overlay" id="followup-modal"><div class="modal-sheet"><h3>新增跟进记录</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="fu-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>跟进类型</label><select id="fu-type"><option value="电话">电话</option><option value="拜访">拜访</option><option value="微信">微信</option><option value="邮件">邮件</option><option value="会议">会议</option><option value="其他">其他</option></select></div>';
  h+='<div class="form-group"><label>跟进内容 *</label><textarea id="fu-content" rows="3" placeholder="请输入跟进内容..."></textarea></div>';
  h+='<div class="form-group"><label>结果</label><input id="fu-outcome" placeholder="跟进结果（可选）"></div>';
  h+='<div class="form-row"><div class="form-group"><label>下一步计划</label><input id="fu-next-step" placeholder="下一步"></div><div class="form-group"><label>下次跟进日期</label><input type="date" id="fu-next-date"></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveFollowup()">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveFollowup(){
  var clientId=document.getElementById('fu-client').value;
  var type=document.getElementById('fu-type').value;
  var content=document.getElementById('fu-content').value.trim();
  if(!clientId||!content){showToast('请填写客户和内容');return}
  var outcome=document.getElementById('fu-outcome').value.trim();
  var nextStep=document.getElementById('fu-next-step').value.trim();
  var nextDate=document.getElementById('fu-next-date').value||null;
  var {error}=await sb.from('engagement_logs').insert({company_id:currentCompanyId,client_id:clientId,type:type,content:content,outcome:outcome||null,next_step:nextStep||null,next_date:nextDate,created_by:currentUser.id});
  document.getElementById('followup-modal').remove();
  if(error){showToast('保存失败: '+error.message);return}
  loadFollowups();showToast('已保存');
}

// === Collab: Department Messages ===
async function loadMessages(){
  if(!currentCompanyId)return;
  var deptFilter=document.getElementById('msg-dept-filter').value;
  var sel=document.getElementById('msg-dept-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];sel.innerHTML+='<option value="'+d.id+'">'+escHtml(d.name)+'</option>'}
  }
  var q=sb.from('dept_messages').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(deptFilter)q=q.eq('dept_id',deptFilter);
  var {data}=await q;
  var list=document.getElementById('msg-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无消息</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var m=data[i];
    var user=allUsers.find(function(u){return u.user_id===m.user_id});
    var dept=allDepartments.find(function(d){return d.id===m.dept_id});
    var userName=user?(user.display_name||user.email||''):'未知';
    h+='<div class="schedule-item" style="border-left-color:#10B981"><div class="sch-title">'+escHtml(userName)+(dept?' <span style="font-size:11px;color:var(--text3)">@'+escHtml(dept.name)+'</span>':'')+'</div><div style="font-size:14px;margin:4px 0">'+escHtml(m.content)+'</div>'+(m.attachments&&m.attachments.length?'<div style="font-size:11px;color:var(--primary)">附件: '+m.attachments.length+'个</div>':'')+'<div class="sch-meta">'+new Date(m.created_at).toLocaleString('zh-CN')+'</div></div>';
  }
  list.innerHTML=h;
}

function openMsgForm(){
  var h='<div class="modal-overlay" id="msg-modal"><div class="modal-sheet"><h3>发送部门消息</h3>';
  h+='<div class="form-group"><label>目标部门</label><select id="msg-dept"><option value="">全公司</option>';
  for(var i=0;i<allDepartments.length;i++)h+='<option value="'+allDepartments[i].id+'">'+escHtml(allDepartments[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>消息内容 *</label><textarea id="msg-content" rows="3" placeholder="输入消息..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="sendMsg()">发送</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function sendMsg(){
  var deptId=document.getElementById('msg-dept').value||null;
  var content=document.getElementById('msg-content').value.trim();
  if(!content){showToast('请输入消息内容');return}
  var {error}=await sb.from('dept_messages').insert({company_id:currentCompanyId,dept_id:deptId?parseInt(deptId):null,user_id:currentUser.id,content:content});
  document.getElementById('msg-modal').remove();
  if(error){showToast('发送失败: '+error.message);return}
  loadMessages();showToast('已发送');
}

// ============== COLLAB OFFICE MODULE ==============
var collabActiveTab='schedule';

function switchCollabTab(tab){  // Hide all non-mo collab panels when showing mo panels
  if(tab.startsWith("mo-")){
    var regularPanels=document.querySelectorAll("#collab-view .collab-panel");
    for(var rp=0;rp<regularPanels.length;rp++)regularPanels[rp].classList.add("hidden");
  } else {
    // Hide mo panels when showing regular panels
    var moPs=document.querySelectorAll("#collab-view .mo-panel");
    for(var mp2=0;mp2<moPs.length;mp2++)moPs[mp2].classList.add("hidden");
  }

  // [INTEGRATED] Handle my-office panels (overview + docs only)
  var moPanels=document.querySelectorAll("#collab-view .mo-panel");
  for(var mp=0;mp<moPanels.length;mp++)moPanels[mp].classList.toggle("hidden",moPanels[mp].id!==tab);
  // Init on demand
  if(tab==="mo-overview"&&typeof renderMyOfficeOverview==="function")renderMyOfficeOverview();
  else if(tab==="mo-docs"&&typeof renderMyOfficeDocs==="function")renderMyOfficeDocs("all");


  collabActiveTab=tab;
  var tabs=document.querySelectorAll('.collab-subtab');

  for(var i=0;i<tabs.length;i++)tabs[i].classList.toggle('active',tabs[i].getAttribute('data-ctab')===tab);
  var panels={schedule:'collab-schedule-panel',task:'collab-task-panel',approval:'collab-approval-panel',comment:'collab-comment-panel',followup:'collab-followup-panel',msg:'collab-msg-panel'};
  for(var k in panels){
    var el=document.getElementById(panels[k]);

    if(el)el.classList.toggle('hidden',tab!==k)
  }

  if(tab==='schedule')loadSchedules();
  else if(tab==='task')loadTasks();
  else if(tab==='approval')loadApprovals();
  else if(tab==='comment')loadComments();
  else if(tab==='followup')loadFollowups();
  else if(tab==='msg')loadMessages();
}

// === 1. Schedules ===
async function loadSchedules(){
  if(!currentCompanyId){dbg('[loadSchedules] NO currentCompanyId, returning');return;}
  var today=new Date().toISOString().slice(0,10);
  var {data}=await sb.from('schedules').select('*').eq('company_id',currentCompanyId).gte('start_time',today).order('start_time');
  var list=document.getElementById('schedule-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">今日暂无日程</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var s=data[i];
    var time=s.all_day?'全天':new Date(s.start_time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
    h+='<div class="schedule-item" style="border-left-color:'+(s.color||'#4F6EF7')+'"><div class="sch-title">'+escHtml(s.title)+' <span style="font-size:11px;color:var(--text3)">'+time+'</span></div>'+(s.description?'<div style="font-size:13px;color:var(--text2)">'+escHtml(s.description)+'</div>':'')+(s.location?'<div class="sch-meta">📍 '+escHtml(s.location)+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editSchedule(\''+s.id+'\')\">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteSchedule(\''+s.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openScheduleForm(id){
  var s=id?allSchedules.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="schedule-modal"><div class="modal-sheet"><h3>'+(s?'编辑日程':'新建日程')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="sch-title" value="'+(s?escAttr(s.title):'')+'"></div>';
  h+='<div class="form-row"><div class="form-group"><label>开始时间 *</label><input type="datetime-local" id="sch-start" value="'+(s?s.start_time.slice(0,16):'')+'"></div><div class="form-group"><label>结束时间</label><input type="datetime-local" id="sch-end" value="'+(s&&s.end_time?s.end_time.slice(0,16):'')+'"></div></div>';
  h+='<div class="form-row"><div class="form-group"><label><input type="checkbox" id="sch-allday" '+(s&&s.all_day?'checked':'')+'> 全天</label></div><div class="form-group"><label>颜色</label><input type="color" id="sch-color" value="'+(s?s.color||'#4F6EF7':'#4F6EF7')+'"></div></div>';
  h+='<div class="form-group"><label>地点</label><input id="sch-location" value="'+(s?escAttr(s.location||''):'')+'"></div>';
  h+='<div class="form-group"><label>描述</label><textarea id="sch-desc" rows="2">'+(s?escHtml(s.description||''):'')+'</textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveSchedule(\''+(s?s.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveSchedule(id){
  var title=document.getElementById('sch-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var start=document.getElementById('sch-start').value;
  if(!start){showToast('请选择开始时间');return}
  var end=document.getElementById('sch-end').value||null;
  var allDay=document.getElementById('sch-allday').checked;
  var color=document.getElementById('sch-color').value;
  var location=document.getElementById('sch-location').value.trim();
  var desc=document.getElementById('sch-desc').value.trim();
  var obj={title:title,start_time:new Date(start).toISOString(),end_time:end?new Date(end).toISOString():null,all_day:allDay,color:color,location:location||null,description:desc||null,company_id:currentCompanyId,user_id:currentUser.id};
  var err;
  if(id){var r=await sb.from('schedules').update(obj).eq('id',id);err=r.error}
  else{var r2=await sb.from('schedules').insert(obj);err=r2.error}
  document.getElementById('schedule-modal').remove();
  if(err){showToast('保存失败: '+err.message);return}
  loadSchedules();showToast('已保存');
}

async function deleteSchedule(id){
  var _delErr=(await sb.from('schedules').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  loadSchedules();showToast('已删除');
}

// === 2. Tasks ===
async function loadTasks(){
  if(!currentCompanyId)return;
  var filter=document.getElementById('task-filter').value;
  var q=sb.from('tasks').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(filter!=='all')q=q.eq('status',filter);
  var {data}=await q;
  var list=document.getElementById('task-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无任务</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var t=data[i];
    var prio=t.priority||'normal';
    var statusLabel={todo:'待办',in_progress:'进行中',done:'已完成',cancelled:'已取消'}[t.status]||t.status;
    h+='<div class="task-item task-priority-'+prio+'"><div class="task-title">'+escHtml(t.title)+' <span class="status-badge status-'+(t.status==='in_progress'?'progress':t.status)+'">'+statusLabel+'</span></div>'+(t.description?'<div style="font-size:13px;color:var(--text2)">'+escHtml(t.description)+'</div>':'')+(t.due_date?'<div class="task-meta">📅 截止: '+t.due_date+'</div>':'')+'<div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><button class="btn-sm" style="font-size:11px;padding:2px 8px" onclick="editTask(\''+t.id+'\')\">编辑</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="deleteTask(\''+t.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openTaskForm(id){
  var t=id?allTasks.find(function(x){return x.id===id}):null;
  var h='<div class="modal-overlay" id="task-modal"><div class="modal-sheet"><h3>'+(t?'编辑任务':'新建任务')+'</h3>';
  h+='<div class="form-group"><label>标题 *</label><input id="ta-title" value="'+(t?escAttr(t.title):'')+'"></div>';
  h+='<div class="form-group"><label>描述</label><textarea id="ta-desc" rows="2">'+(t?escHtml(t.description||''):'')+'</textarea></div>';
  h+='<div class="form-row"><div class="form-group"><label>优先级</label><select id="ta-priority"><option value="urgent"'+(t&&t.priority==='urgent'?' selected':'')+'>紧急</option><option value="high"'+(t&&t.priority==='high'?' selected':'')+'>高</option><option value="normal"'+(t&&t.priority==='normal'?' selected':'')+'>普通</option><option value="low"'+(t&&t.priority==='low'?' selected':'')+'>低</option></select></div><div class="form-group"><label>截止日期</label><input type="date" id="ta-due" value="'+(t&&t.due_date?t.due_date:'')+'"></div></div>';
  h+='<div class="form-row"><div class="form-group"><label>状态</label><select id="ta-status"><option value="todo"'+(t&&t.status==='todo'?' selected':'')+'>待办</option><option value="in_progress"'+(t&&t.status==='in_progress'?' selected':'')+'>进行中</option><option value="done"'+(t&&t.status==='done'?' selected':'')+'>已完成</option></select></div><div class="form-group"><label>分配给</label><select id="ta-assigned">'+(function(){var o='<option value="">自己</option>';for(var k=0;k<allUsers.length;k++){var u=allUsers[k];o+='<option value="'+u.user_id+'"'+(t&&t.assigned_to===u.user_id?' selected':'')+'>'+(u.display_name||u.email||u.user_id)+'</option>'}return o})()+'</select></div></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveTask(\''+(t?t.id:'')+'\')">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveTask(id){
  var title=document.getElementById('ta-title').value.trim();
  if(!title){showToast('请输入标题');return}
  var desc=document.getElementById('ta-desc').value.trim();
  var priority=document.getElementById('ta-priority').value;
  var due=document.getElementById('ta-due').value||null;
  var status=document.getElementById('ta-status').value;
  var assigned=document.getElementById('ta-assigned').value||currentUser.id;
  var obj={title:title,description:desc||null,priority:priority,due_date:due,status:status,assigned_to:assigned,assigned_by:currentUser.id,company_id:currentCompanyId};
  if(status==='done')obj.completed_at=new Date().toISOString();
  var err;
  if(id){var r=await sb.from('tasks').update(obj).eq('id',id);err=r.error}
  else{var r2=await sb.from('tasks').insert(obj);err=r2.error}
  document.getElementById('task-modal').remove();
  if(err){showToast('保存失败: '+err.message);return}
  loadTasks();showToast('已保存');
}

async function deleteTask(id){
  var _delErr=(await sb.from('tasks').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  loadTasks();showToast('已删除');
}

function editTask(id){openTaskForm(id)}
function editSchedule(id){openScheduleForm(id)}

// === 3. Approvals ===
async function loadApprovals(){
  if(!currentCompanyId)return;
  var filter=document.getElementById('approval-filter').value;
  var q=sb.from('approval_requests').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(filter!=='all')q=q.eq('status',filter);
  var {data}=await q;
  var list=document.getElementById('approval-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无审批</div>';return}
  var h='',statusMap={pending:'待审批',approved:'已通过',rejected:'已驳回',cancelled:'已取消'};
  for(var i=0;i<data.length;i++){
    var a=data[i];
    h+='<div class="approval-item approval-'+(a.status==='pending'?'pending':a.status==='approved'?'approved':a.status==='rejected'?'rejected':'')+'"><div class="appr-title">'+escHtml(a.title)+' <span class="status-badge status-'+(a.status==='pending'?'progress':a.status==='approved'?'done':a.status==='rejected'?'cancelled':'cancelled')+'">'+statusMap[a.status]+'</span></div><div class="appr-meta">'+escHtml(a.type)+' · 步骤 '+a.current_step+'/'+a.total_steps+' · '+new Date(a.created_at).toLocaleDateString('zh-CN')+'</div>'+(a.status==='pending'?'<div style="margin-top:6px"><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#10B981;color:#fff;border:none;border-radius:4px;margin-right:4px" onclick="approveAction('+a.id+',\'approve\')">通过</button><button class="btn-sm" style="font-size:11px;padding:2px 8px;background:#EF4444;color:#fff;border:none;border-radius:4px" onclick="approveAction('+a.id+',\'reject\')">驳回</button></div>':'')+'</div>';
  }
  list.innerHTML=h;
}

function openApprovalForm(){
  var types=['报价审批','合同审批','折扣审批','出差申请','报销申请','客户转移','投标材料审批','公章使用申请','项目立项审批','交付验收审批','自定义'];
  var h='<div class="modal-overlay" id="approval-modal"><div class="modal-sheet"><h3>发起审批</h3>';
  h+='<div class="form-group"><label>审批类型</label><select id="ap-type">';
  for(var i=0;i<types.length;i++)h+='<option value="'+types[i]+'">'+types[i]+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>标题 *</label><input id="ap-title" placeholder="审批标题"></div>';
  h+='<div class="form-group"><label>内容说明</label><textarea id="ap-content" rows="3" placeholder="请输入审批内容和理由..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&apos;.modal-overlay&apos;).remove()">取消</button><button class="btn-save" onclick="submitApproval()">提交</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function submitApproval(){
  var type=document.getElementById('ap-type').value;
  var title=document.getElementById('ap-title').value.trim();
  var content=document.getElementById('ap-content').value.trim();
  if(!title){showToast('请输入标题');return}
  var {error}=await sb.from('approval_requests').insert({company_id:currentCompanyId,requestor_id:currentUser.id,title:title,type:type,content:{detail:content||''},status:'pending',total_steps:1});
  document.getElementById('approval-modal').remove();
  if(error){showToast('提交失败: '+error.message);return}
  loadApprovals();showToast('已提交');
}

async function approveAction(requestId,action){
  var {data:req}=await sb.from('approval_requests').select('*').eq('id',requestId).single();
  if(!req){showToast('审批不存在');return}
  var newStatus=action==='approve'?'approved':'rejected';
  var {error}=await sb.from('approval_requests').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',requestId);
  if(error){showToast('操作失败: '+error.message);return}
  await sb.from('approval_actions').insert({company_id:currentCompanyId,request_id:requestId,approver_id:currentUser.id,action:action,step:req.current_step||1});
  loadApprovals();showToast(action==='approve'?'已通过':'已驳回');
}

// === 4. Client Comments / Collaboration ===
var commentClientsList=[];
async function loadComments(){
  if(!currentCompanyId)return;
  var clientFilter=document.getElementById('comment-client-filter').value;
  // Load client options if empty
  if(!commentClientsList.length){
    var sel=document.getElementById('comment-client-filter');
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value="'+cl.id+'">'+escHtml(cl.name)+'</option>';commentClientsList.push(cl)}
  }
  var q=sb.from('client_comments').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(clientFilter)q=q.eq('client_id',clientFilter);
  var {data}=await q;
  var list=document.getElementById('comment-list');
  if(!data||!data.length){list.innerHTML='<div class="empty" style="padding:20px">暂无评论</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var cm=data[i];
    var cl=allClients.find(function(x){return x.id===cm.client_id});
    h+='<div class="comment-item"><div class="cmt-title">'+escHtml(cm.content)+'</div><div class="cmt-meta">客户: '+(cl?escHtml(cl.name):'未知')+' · '+new Date(cm.created_at).toLocaleString('zh-CN')+'<button class="btn-sm" style="font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px" onclick="deleteComment(\''+cm.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openCommentForm(){
  var h='<div class="modal-overlay" id="comment-modal"><div class="modal-sheet"><h3>添加客户评论</h3>';
  h+='<div class="form-group"><label>客户 *</label><select id="cm-client"><option value="">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value="'+allClients[i].id+'">'+escHtml(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class="form-group"><label>评论内容 *</label><textarea id="cm-content" rows="3" placeholder="输入评论..."></textarea></div>';
  h+='<div class="modal-actions"><button class="btn-cancel" onclick="this.closest(&quot;.modal-overlay&quot;).remove()">取消</button><button class="btn-save" onclick="saveComment()">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveComment(){
  var clientId=document.getElementById('cm-client').value;
  var content=document.getElementById('cm-content').value.trim();
  if(!clientId||!content){showToast('请填写完整信息');return}
  var {error}=await sb.from('client_comments').insert({company_id:currentCompanyId,client_id:parseInt(clientId),user_id:currentUser.id,content:content});
  document.getElementById('comment-modal').remove();
  if(error){showToast('保存失败: '+error.message);return}
  loadComments();showToast('已保存');
}

async function deleteComment(id){
  var _delErr=(await sb.from('client_comments').delete().eq('id',id)).error;if(_delErr){showToast('删除失败: '+_delErr.message);return}
  loadComments();showToast('已删除');
}

// ============ NEW: Birthday Reminder ============
function checkBirthdayReminders(){
  if(!allContacts||!allContacts.length)return;
  var now=new Date(),today=now.toISOString().slice(5,10); // MM-DD
  var birthdays=[];
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];
    if(!co.birthday)continue;
    var bd=co.birthday.slice(5,10);
    var bDate=new Date(now.getFullYear()+(bd<today?1:0),parseInt(bd.slice(0,2))-1,parseInt(bd.slice(3,5)));
    var diff=Math.ceil((bDate-now)/86400000);
    if(diff>=0&&diff<=7){
      var client=allClients.find(function(c){return c.id===co.client_id});
      birthdays.push({contact:co,client:client?client.name:'',date:bDate,diff:diff});
    }
  }
  if(birthdays.length>0)showBirthdayReminder(birthdays);
}

function showBirthdayReminder(contacts){
  var el=document.getElementById('birthday-reminders');
  if(!el)return;
  var section=document.getElementById('birthday-section');
  if(section)section.style.display='block';
  var html='';
  for(var i=0;i<contacts.length;i++){
    var b=contacts[i];
    html+='<div class="birthday-card"><div class="bd-icon">🎂</div><div class="bd-info"><div class="bd-name">'+h(b.contact.name||'未命名')+'</div><div class="bd-date">'+b.date.toLocaleDateString('zh-CN')+' ('+(b.diff===0?'今天':b.diff+'天后')+')</div>'+(b.client?'<div class="bd-client">'+h(b.client)+'</div>':'')+'</div></div>';
  }
  el.innerHTML=html;
  el.style.display='block';
}

/* ===== 合同到期提醒（经营总览页） ===== */
function loadDashReminders(){
  var remEl=document.getElementById('dash-reminders');
  if(!remEl)return;
  if(!currentCompanyId){remEl.innerHTML='<div class="empty-state">🎉 暂无待处理提醒</div>';return}
  var today=new Date().toISOString().slice(0,10);
  sb.from('contracts').select('id,title,total_amount,end_date').eq('company_id',currentCompanyId).not('archive_status','eq','archived').order('end_date',{ascending:true}).limit(5).then(function(r){
    if(r&&r.error){remEl.innerHTML='<div class="empty-state">加载提醒失败</div>';return}
    var rows=((r&&r.data)||[]).filter(function(c){return c&&c.end_date});
    if(!rows.length){remEl.innerHTML='<div class="empty-state">🎉 暂无待处理提醒</div>';return}
    var html='<div class="reminder-list">';
    for(var i=0;i<rows.length;i++){
      var c=rows[i];var isOver=c.end_date<today;
      var d=new Date(c.end_date);
      html+='<div class="reminder-item'+(isOver?' reminder-overdue':'')+'"><span class="reminder-icon">'+(isOver?'🔴':'🟡')+'</span><div class="reminder-info"><span class="reminder-title">'+h(c.title||('合同#'+c.id))+'</span><span class="reminder-detail">'+(c.total_amount?' · ¥'+Number(c.total_amount).toLocaleString('zh-CN'):'')+'</span></div><span class="reminder-date">'+(isNaN(d.getTime())?h(c.end_date):d.toLocaleDateString('zh-CN'))+'</span></div>';
    }
    html+='</div>';
    remEl.innerHTML=html;
  }).catch(function(){remEl.innerHTML='<div class="empty-state">加载提醒失败</div>'});
}

