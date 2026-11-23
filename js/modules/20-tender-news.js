// ==========================================================================
// grsds · 20-tender-news.js — 项目标讯
// 把 clients.projects 里的项目按「一条项目一行」聚合展示，与客户列表解耦。
// 客户卡片只保留客户自身信息；项目名 / 招标日期 / 中标单位 / 中标人 / 金额
// 统一在这里查。依赖 05 的项目助手、07 的金额助手、01 的搜索与分页助手。
// ==========================================================================
var _tenderRows=[],_tenderFiltered=[],_tenderPage=1;
var TENDER_PAGE_SIZE=20;
var _debouncedRenderTender=null;

function tenderText(v){return String(v==null?'':v).trim()}
function tenderNum(v){var n=parseFloat(String(v||'').replace(/[,，\s]/g,''));return isNaN(n)?0:n}

// 一条项目一行：同一个客户的多条 projects 会拆成多行，各自带甲方客户引用
function tenderRowsBuild(){
  var out=[],clients=allClients||[];
  for(var i=0;i<clients.length;i++){
    var c=clients[i];
    if(!c||c.deleted_at)continue;
    var projs=[];
    try{projs=JSON.parse(c.projects||'[]');if(!Array.isArray(projs))projs=[]}catch(e){projs=[]}
    if(!projs.length&&c.project)projs=[{project_name:c.project,bidding_date:c.bidding_date||''}];
    for(var j=0;j<projs.length;j++){
      var p=projs[j]||{};
      var name=tenderText(p.project_name)||'未命名项目';
      var date=tenderText(p.bidding_date).slice(0,10);
      var bidders=(typeof projectBiddersOf==='function')?projectBiddersOf(p):[];
      var persons=(typeof projectBidderPersonsOf==='function')?projectBidderPersonsOf(p):[];
      var owners=(typeof projectOwnersOf==='function')?projectOwnersOf(p):[];
      var amount=(typeof ordProjBidAmount==='function')?ordProjBidAmount(p):0;
      var src=tenderText(p.ai_source);
      var hay=[name,tenderText(c.name),date,tenderText(p.bidder_company),tenderText(p.bidder_name),
        tenderText(p.client_owner),src,tenderText(p.notes)].concat(bidders);
      for(var _pi=0;_pi<persons.length;_pi++)hay.push(tenderText(persons[_pi]&&persons[_pi].name));
      for(var _oi=0;_oi<owners.length;_oi++)hay.push(tenderText(owners[_oi]&&owners[_oi].name));
      out.push({
        key:String(c.id||'')+'|'+j+'|'+date+'|'+name,
        client:c, project:p, name:name, date:date, year:date.slice(0,4),
        amount:tenderNum(amount), bidders:bidders, persons:persons, owners:owners, source:src,
        hay:hay.join(' ').toLowerCase()
      });
    }
  }
  // 招标日期倒序；没日期的排最后，同日按项目名排，保证翻页稳定
  out.sort(function(a,b){
    if(!a.date&&b.date)return 1;
    if(a.date&&!b.date)return -1;
    if(a.date!==b.date)return a.date<b.date?1:-1;
    return a.name.localeCompare(b.name,'zh-CN');
  });
  return out;
}

function tenderFillSelects(){
  var ys=document.getElementById('tender-year'),ts=document.getElementById('tender-type');
  if(ys){
    var years={};
    for(var i=0;i<_tenderRows.length;i++)if(_tenderRows[i].year)years[_tenderRows[i].year]=1;
    var list=Object.keys(years).sort().reverse();
    var keep=ys.value||'all';
    ys.innerHTML='<option value="all">全部年份</option>'+list.map(function(y){return '<option value="'+y+'">'+y+' 年</option>'}).join('');
    ys.value=(keep==='all'||list.indexOf(keep)>=0)?keep:'all';
  }
  if(ts&&typeof allTypes==='function'){
    var types=allTypes(),keepT=ts.value||'all';
    ts.innerHTML='<option value="all">全部客户类型</option>'+types.map(function(t){return '<option value="'+h(t)+'">'+h(t)+'</option>'}).join('');
    ts.value=(keepT==='all'||types.indexOf(keepT)>=0)?keepT:'all';
  }
}

function tenderFilter(){
  var q=(document.getElementById('tender-search')||{value:''}).value.trim().toLowerCase();
  var year=(document.getElementById('tender-year')||{value:'all'}).value;
  var type=(document.getElementById('tender-type')||{value:'all'}).value;
  var sort=(document.getElementById('tender-sort')||{value:'date'}).value;
  var list=_tenderRows.filter(function(r){
    if(q&&r.hay.indexOf(q)<0)return false;
    if(year!=='all'&&r.year!==year)return false;
    if(type!=='all'){
      var types=(typeof parseTypes==='function')?parseTypes(r.client.type):[];
      if(types.indexOf(type)<0)return false;
    }
    return true;
  });
  if(sort==='amount')list.sort(function(a,b){return b.amount-a.amount});
  else if(sort==='client')list.sort(function(a,b){return tenderText(a.client.name).localeCompare(tenderText(b.client.name),'zh-CN')});
  return list;
}

function tenderStats(){
  var total=_tenderRows.length,clients={},sum=0,recent=0;
  var thisYear=String(new Date().getFullYear());
  for(var i=0;i<_tenderRows.length;i++){
    var r=_tenderRows[i];
    if(r.client&&r.client.id)clients[r.client.id]=1;
    sum+=r.amount;
    if(r.date&&r.year===thisYear)recent++;
  }
  var box=document.getElementById('tender-stats');
  if(!box)return;
  box.innerHTML=
    '<div class="stat-card"><div class="stat-num">'+total+'</div><div class="stat-label">项目标讯</div></div>'+
    '<div class="stat-card"><div class="stat-num">'+Object.keys(clients).length+'</div><div class="stat-label">涉及客户</div></div>'+
    '<div class="stat-card"><div class="stat-num">'+recent+'</div><div class="stat-label">今年项目</div></div>'+
    '<div class="stat-card"><div class="stat-num"'+(sum>0?' title="¥'+sum.toLocaleString('zh-CN')+'"':'')+'>'+(sum>0?'¥'+(typeof formatMoney==='function'?formatMoney(sum):sum):'—')+'</div><div class="stat-label">中标金额合计</div></div>';
}

// 项目明细气泡（原客户卡片上的 .card-project-tag，随之迁到标讯页）。
// tooltip 保留逐包公司/中标人、联合体家数、预算、甲方负责人职务，信息一条不丢。
function tenderProjectTag(p){
  p=p||{};
  var pname=tenderText(p.project_name);
  var persons=(typeof projectBidderPersonsOf==='function')?projectBidderPersonsOf(p):[];
  var bdNames=persons.map(function(o){return tenderText(o&&o.name)}).filter(Boolean);
  var bd=bdNames.join('、');
  var owners=(typeof projectOwnersOf==='function')?projectOwnersOf(p):[];
  var coNames=owners.map(function(o){return tenderText(o&&o.name)}).filter(Boolean);
  var co=coNames.join('、');
  var bidList=(typeof projectBiddersOf==='function')?projectBiddersOf(p):[];
  var packsAll=(typeof projectPackagesOf==='function')?projectPackagesOf(p):[];
  var packed=packsAll.length>1,packs=packed?packsAll:[];
  if(!pname&&!bd&&!co&&!bidList.length&&!packs.length)return null;
  var tip=[];
  if(packed){
    for(var pk=0;pk<packs.length;pk++){
      var pp=packs[pk]||{},ppn=tenderText(pp.name)||('包'+(pk+1));
      var ppCo=(pp.bidders||[]).map(function(o){return tenderText(o&&o.name)}).filter(Boolean).join('、');
      var ppPs=(pp.persons||[]).map(function(o){return tenderText(o&&o.name)}).filter(Boolean).join('、');
      var ppAmt=tenderText(pp.bid_amount),ppBud=tenderText(pp.project_budget);
      tip.push(h(ppn+':'+(ppCo||'-')+(ppPs?' · '+ppPs:'')+(ppBud?' · 预算 '+formatMoney(ppBud):'')+(ppAmt?' · 金额 '+formatMoney(ppAmt):'')));
    }
  }else{
    if(bd)tip.push('中标人:'+h((typeof bidderLabel==='function'?bidderLabel(p):'')||bd));
    if(bidList.length)tip.push('中标公司:'+h(bidList.join('、'))+(bidList.length>1?'（联合体 '+bidList.length+' 家）':''));
  }
  if(p.project_budget)tip.push((packed?'预算合计:':'预算:')+h(formatMoney(p.project_budget)));
  if(co){
    var ac=allContacts||[];
    var ownTxt=owners.map(function(o){
      var pos='';
      if(o.cid){for(var ai=0;ai<ac.length;ai++){if(String(ac[ai].id)===String(o.cid)){pos=tenderText(ac[ai].position);break}}}
      return o.name+(pos?'（'+pos+'）':'');
    }).filter(Boolean).join('、');
    tip.push('甲方负责人:'+h(ownTxt));
  }
  var coShort=coNames.length>2?coNames.slice(0,2).join('、')+' 等'+coNames.length+'人':co;
  var bdShort=bdNames.length>2?bdNames.slice(0,2).join('、')+' 等'+bdNames.length+'人':bd;
  var text='📋 '+h(pname||'未命名项目')+(packed?' · 分'+packs.length+'包':(bidList.length>1?' · 联合'+bidList.length+'家':''))
    +(bd?' · '+h(bdShort):'')+(co?' · 👤'+h(coShort):'');
  return {tip:tip.join(' / '),text:text};
}

function tenderOpenClient(id){if(id&&typeof openClient360==='function')openClient360(id)}

function renderTenderList(){
  var box=document.getElementById('tender-list');
  if(!box)return;
  var list=tenderFilter();
  _tenderFiltered=list;
  var size=TENDER_PAGE_SIZE,pages=Math.max(1,Math.ceil(list.length/size));
  if(_tenderPage<1)_tenderPage=1;
  if(_tenderPage>pages)_tenderPage=pages;
  var pageList=list.slice((_tenderPage-1)*size,_tenderPage*size);
  tenderStats();
  var empty=document.getElementById('tender-empty');
  if(!pageList.length){
    box.innerHTML='';
    if(empty)empty.classList.remove('hidden');
    var pg0=document.getElementById('tender-pager');if(pg0)pg0.classList.add('hidden');
    return;
  }
  if(empty)empty.classList.add('hidden');
  var html='';
  for(var i=0;i<pageList.length;i++){
    var r=pageList[i],c=r.client||{},p=r.project||{};
    var src=(r.source&&typeof isAiSource==='function'&&isAiSource(r.source))
      ?'<span class="tn-src">🤖 '+h(r.source)+'</span>':'';
    var amt=r.amount>0?'<span class="tn-amount">💰 '+(typeof formatMoney==='function'?formatMoney(r.amount):r.amount)+'</span>':'';
    var meta='<span class="tn-client" onclick="tenderOpenClient(\''+h(c.id||'')+'\')" title="打开客户档案">🏢 '+h(c.name||'未命名客户')+'</span>';
    if(r.bidders.length)meta+='<span class="tn-pill" title="中标单位">中标：'+h(r.bidders.join('、'))+'</span>';
    else if(tenderText(p.bidder_company))meta+='<span class="tn-pill" title="中标单位">中标：'+h(tenderText(p.bidder_company))+'</span>';
    var personNames=r.persons.map(function(o){return tenderText(o&&o.name)}).filter(Boolean);
    if(!personNames.length&&tenderText(p.bidder_name))personNames=[tenderText(p.bidder_name)];
    if(personNames.length)meta+='<span class="tn-pill">👤 '+h(personNames.join('、'))+'</span>';
    var ownerNames=r.owners.map(function(o){return tenderText(o&&o.name)}).filter(Boolean);
    if(!ownerNames.length&&tenderText(p.client_owner))ownerNames=[tenderText(p.client_owner)];
    if(ownerNames.length)meta+='<span class="tn-pill">甲方对接：'+h(ownerNames.join('、'))+'</span>';
    var packs=(typeof projectPackagesOf==='function')?projectPackagesOf(p):[];
    if(packs.length>1)meta+='<span class="tn-pill tn-pack">分'+packs.length+'包</span>';
    var budget=tenderNum(p.project_budget);
    if(budget>0)meta+='<span class="tn-pill">预算 '+(typeof formatMoney==='function'?formatMoney(budget):budget)+'</span>';
    var brief=tenderProjectTag(p);
    if(brief)meta+='<span class="tn-brief" title="'+brief.tip+'">'+brief.text+'</span>';
    html+='<div class="tn-card">'+
      '<div class="tn-head"><span class="tn-date">'+h(r.date||'日期未填')+'</span>'+
        '<span class="tn-title" title="'+h(r.name)+'">'+h(r.name)+'</span>'+src+amt+'</div>'+
      '<div class="tn-meta">'+meta+'</div>'+
      (tenderText(p.notes)?'<div class="tn-note">'+h(tenderText(p.notes))+'</div>':'')+
    '</div>';
  }
  box.innerHTML=html;
  var pg=document.getElementById('tender-pager');
  if(pg){
    pg.innerHTML=(typeof buildPagerHtml==='function')?buildPagerHtml(list.length,size,_tenderPage,pages,'goTenderPage'):'';
    pg.classList.toggle('hidden',pages<=1);
  }
}

function goTenderPage(n){_tenderPage=parseInt(n,10)||1;renderTenderList();try{window.scrollTo({top:0,behavior:'smooth'})}catch(e){window.scrollTo(0,0)}}
function tenderFilterChange(){_tenderPage=1;renderTenderList()}
function tenderSearchInput(){_tenderPage=1;if(!_debouncedRenderTender)_debouncedRenderTender=_debounce(function(){renderTenderList()},160);_debouncedRenderTender()}

async function openTenders(){
  var box=document.getElementById('tender-list');
  if(box&&!_tenderRows.length)box.innerHTML='<div class="tn-loading">正在汇总项目标讯...</div>';
  try{
    if(!allClients||!allClients.length)await loadClients({cache:true});
  }catch(e){console.error('[tenders] loadClients failed:',e)}
  _tenderRows=tenderRowsBuild();
  tenderFillSelects();
  _tenderPage=1;
  renderTenderList();
}
