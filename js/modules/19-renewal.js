// ==========================================================================
// grsds · 19-renewal.js — 年度复购商机（周期性采购）
//
// 场景：等保测评、维保、年费、年度审计这类「每年都要做一次」的项目，
// 去年招标过一次，今年到点就该主动把商机递到销售面前 —— 而不是等客户来找。
//
// 数据落在 clients.projects 每个项目对象上（纯增量字段，老数据零影响）：
//   recur          是否周期性采购
//   recur_months   周期（月），默认 12
//   recur_next     手工指定的下次到期日（可空；空则按 招标日 + 周期 自动算）
//   recur_snooze   「稍后提醒」到某日之前不再打扰
//   recur_off      「不再提醒」（保留项目本身的复购属性，只是不弹商机）
//   is_renewal     这一单是不是「复购项目」（纯标记，不影响提醒；复购统计用）
//                  true=是 / false=明确不是 / 缺失=按同名旧项目自动认定
//
// 三个必须守住的判断（改之前先看这里）：
//   1) 到期日 = 最近一次招标日 + 周期。用招标日而不是中标日，因为等保测评这类
//      服务通常提前 1~2 个月启动招标，招标日才是「该开始跟进」的信号。
//   2) 同一客户里有同名项目、且招标日期更晚 → 说明新一轮已经做过，旧记录闭嘴。
//      这就是「跟进完录一条新项目」的自动闭环，不需要额外点「已完成」。
//   3) 只有进入窗口（到期前 60 天 ~ 逾期）才算商机；明年的事不提前报。
// ==========================================================================

var RN_DEFAULT_MONTHS=12;   // 默认周期：一年
var RN_LEAD_DAYS=60;        // 提前 60 天进入商机窗口（够走一轮招标流程）
var RN_SNOOZE_DAYS=30;      // 「稍后提醒」推迟 30 天
// 项目名命中这些词时，表单里自动勾上「周期性采购」——典型的年度服务
var RN_KEYWORD_RE=/等保|等级保护|测评|维保|年费|年检|年度|续费|续签|续约|运维|审计|巡检|驻场/;
// 老数据（项目对象上压根没有 recur 字段）默认按周期性处理时用的**更窄**的关键词：
// 「运维 / 审计 / 巡检」可能是多年一签，不适合自动认定，只用于表单里提示
var RN_INFER_RE=/等保|等级保护|测评|维保|年费|年检|年度|续费|续签|续约/;

// ── 日期工具（本模块自足，不依赖别处的实现） ──
function rnParseYmd(s){
  var m=String(s==null?'':s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(!m)return null;
  var y=parseInt(m[1],10),mo=parseInt(m[2],10),da=parseInt(m[3],10);
  if(!y||!mo||!da||mo>12||da>31)return null;
  var d=new Date(y,mo-1,da);
  return isNaN(d.getTime())?null:d;
}
function rnFmtYmd(d){
  if(!d||isNaN(d.getTime()))return '';
  var y=d.getFullYear(),m=String(d.getMonth()+1),dd=String(d.getDate());
  if(m.length<2)m='0'+m;
  if(dd.length<2)dd='0'+dd;
  return y+'-'+m+'-'+dd;
}
function rnToday(){return rnFmtYmd(new Date())}
function rnAddDays(ymd,n){
  var d=rnParseYmd(ymd);
  if(!d)return '';
  d.setDate(d.getDate()+(parseInt(n,10)||0));
  return rnFmtYmd(d);
}
// 加月份必须做「月末钳制」：1/31 加 1 个月是 2/28，绝不是 3/3
// （Date.setMonth 会自动溢出到下一月，这里先把日归一再去设月份）
function rnAddMonths(ymd,months){
  var d=rnParseYmd(ymd);
  if(!d)return '';
  var day=d.getDate();
  months=parseInt(months,10)||0;
  d.setDate(1);
  d.setMonth(d.getMonth()+months);
  var lastDay=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
  if(day>lastDay)day=lastDay;
  d.setDate(day);
  return rnFmtYmd(d);
}
// to - from 的天数：正数=还有几天，负数=已经过了几天
function rnDiffDays(from,to){
  var a=rnParseYmd(from),b=rnParseYmd(to);
  if(!a||!b)return 0;
  return Math.round((b.getTime()-a.getTime())/86400000);
}

// ── 项目上的复购配置 ──
// recur 字段的三种状态必须区分开：
//   true  —— 明确是周期性采购
//   false —— 用户明确取消（用于压住下面的自动认定，否则「等保」项目取消不掉）
//   缺失  —— 本功能上线前的老数据：项目名像年度服务的，默认认定成周期性，
//            不然去年招标的等保测评一条都不会提醒，等于白做
function projectRecurInferred(p){
  if(!p)return false;
  if(p.recur===true)return true;
  if(p.recur===false)return false;
  return RN_INFER_RE.test(String(p.project_name||''));
}
function projectRecurOf(p){
  if(!projectRecurInferred(p))return null;
  var months=parseInt(p.recur_months,10);
  if(!(months>0)||months>240)months=RN_DEFAULT_MONTHS;
  return {
    months:months,
    anchor:String(p.bidding_date||'').slice(0,10),
    next:String(p.recur_next||'').slice(0,10),
    off:!!p.recur_off,
    snooze:String(p.recur_snooze||'').slice(0,10)
  };
}

// 下次应续做的日期；算不出来（没招标日期又没手工指定）返回 ''
function projectRenewalDue(p){
  var r=projectRecurOf(p);
  if(!r||r.off)return '';
  if(rnParseYmd(r.next))return rnFmtYmd(rnParseYmd(r.next));
  if(!r.anchor)return '';
  return rnAddMonths(r.anchor,r.months);
}

// 这一轮复购的预估金额。返回 {amount, src}
//   src='estimate' → 用户在商机卡上手工填的预估（renew_estimate）
//   src='last'     → 沿用上次招标金额（分包按各包累加）
//   src='none'     → 上次没填金额，交不出来
// 为什么不直接用「上次金额」当唯一口径：等保测评这类每年价格会小幅波动，
// 招标规模也可能调整，销售心里有个数时要能覆盖掉。
function projectRenewalAmount(p){
  p=p||{};
  var raw=String(p.renew_estimate==null?'':p.renew_estimate).trim();
  if(raw!==''){
    var est=parseFloat(raw);
    if(!isNaN(est)&&est>=0)return {amount:est,src:'estimate'};
  }
  var v=(typeof projectBidAmount==='function')?projectBidAmount(p):0;
  if(v>0)return {amount:v,src:'last'};
  return {amount:0,src:'none'};
}

// 金额文本（不带 ¥）。本模块自足实现，避免依赖 07-orders 的 formatMoney：
// 19 在 07 之后加载，运行时虽然能用，但客户卡片（05）要显示金额时是前向引用，
// 直接调 formatMoney 会被 lint-hoisting 盯上。统一从这里取。
function rnMoney(v){
  v=parseFloat(v);
  if(isNaN(v)||v<=0)return '';
  if(v>=10000){
    var w=v/10000;
    return (w>=100?w.toFixed(0):w.toFixed(1))+'万';
  }
  return String(Math.round(v));
}

// ============================================================
// 「这个项目是不是复购项目」判定
//
// 注意：这跟上面的 recur（周期性采购）是两件事，不要合并——
//   recur        → 明年还要不要再提醒我（面向未来）
//   is_renewal   → 这一单本身是不是把老项目又做了一遍（面向这一单的性质）
// 一个三年一签的项目可以是复购（第二次签），但不该每年提醒；
// 一个每年的维保如果不勾 recur，也只是「标记了是复购、不提醒」。
//
// 三种状态，和 recur 完全一致的约定：
//   is_renewal===true  → 是复购（用户明确标的）
//   is_renewal===false → 明确不是（压住下面按同名做的自动认定，否则取消不掉）
//   字段缺失           → 同客户里「同名 + 更早还有一次」就认定是复购。
//                        本功能上线前录的项目没有这个字段，不做推定的话
//                        所有存量客户都会被算成「从没复购过」，统计永远是 0。
// ============================================================
function projectRenewalOf(p,allProjs){
  var prev=null;
  if(p&&allProjs&&allProjs.length){
    var nm=rnNormName(p.project_name);
    var self=String(p.bidding_date||'').slice(0,10);
    // 自己没填招标日期就不推定：分不清谁先谁后，宁可不算
    if(nm&&self){
      for(var i=0;i<allProjs.length;i++){
        var q=allProjs[i];
        if(!q||q===p)continue;
        if(rnNormName(q.project_name)!==nm)continue;
        var qd=String(q.bidding_date||'').slice(0,10);
        if(!qd||qd>=self)continue;          // 只要更早的那一次
        if(!prev||qd>String(prev.bidding_date||'').slice(0,10))prev=q;
      }
    }
  }
  var is;
  if(p&&p.is_renewal===true)is=true;
  else if(p&&p.is_renewal===false)is=false;
  else is=!!prev;
  return {is:is,prev:prev,prevDate:prev?String(prev.bidding_date||'').slice(0,10):''};
}

// 供别的模块用（13 的招标统计、05 的表单）——19 是最后加载的，
// 在它之前加载的模块调用时必须先做 typeof 判断，没有这个函数就走保守分支。
function projectIsRenewal(p,allProjs){
  if(!p)return false;
  if(p.is_renewal===true)return true;
  if(p.is_renewal===false)return false;
  return projectRenewalOf(p,allProjs).is;
}

// 项目名归一化：去掉年份后缀（「（2026 年度）」/「(2026)」/「2026年度」）、空白和标点，
// 只留主体名。这样「去跟进」开单时自动加年份的新项目，能和去年的同名项目对上——
// 否则今年的等保测评叫「等保测评（2026 年度）」，跟去年那条永远对不上，
// 旧商机不会闭环、复购也认不出来。
function rnNormName(s){
  return String(s==null?'':s)
    .replace(/[（(]\s*\d{4}\s*年度?\s*[)）]/g,'')
    .replace(/\d{4}\s*年度?/g,'')
    .replace(/[\s·・,，、;；\-—_/\\.。:：]+/g,'')
    .toLowerCase();
}

function rnProjectsOf(c){
  var a=[];
  if(!c)return a;
  try{a=JSON.parse(c.projects||'[]');if(!Array.isArray(a))a=[]}catch(e){a=[]}
  return a;
}

// 单个客户的复购商机列表（默认只返回窗口内的：逾期 / 60 天内到期）
function clientRenewalOpps(c,opts){
  opts=opts||{};
  var today=opts.today||rnToday();
  var lead=opts.leadDays==null?RN_LEAD_DAYS:opts.leadDays;
  var out=[];
  if(!c)return out;
  var projs=rnProjectsOf(c);
  for(var i=0;i<projs.length;i++){
    var p=projs[i]||{};
    var r=projectRecurOf(p);
    if(!r||r.off)continue;
    if(r.snooze&&r.snooze>=today)continue;      // 已点「稍后」
    var due=projectRenewalDue(p);
    if(!due)continue;
    // 同名且更晚的一条已存在 → 这一轮已经做过了
    var nm=rnNormName(p.project_name),superseded=false;
    if(nm&&r.anchor){
      for(var j=0;j<projs.length;j++){
        if(j===i)continue;
        var q=projs[j]||{};
        if(rnNormName(q.project_name)!==nm)continue;
        var qd=String(q.bidding_date||'').slice(0,10);
        if(qd&&qd>r.anchor){superseded=true;break}
      }
    }
    if(superseded)continue;
    var days=rnDiffDays(today,due);
    var state=days<0?'overdue':(days<=lead?'due':'future');
    if(!opts.includeFuture&&state==='future')continue;
    var amt=projectRenewalAmount(p);
    out.push({
      idx:i,client:c,project:p,due:due,days:days,state:state,
      months:r.months,anchor:r.anchor,
      amount:amt.amount,amountSrc:amt.src,
      name:String(p.project_name||'').trim()||'未命名项目'
    });
  }
  out.sort(function(a,b){return a.due<b.due?-1:(a.due>b.due?1:0)});
  return out;
}

// 全部客户的复购商机（经营总览用）
function allRenewalOpps(opts){
  var out=[];
  for(var i=0;i<allClients.length;i++){
    var list=clientRenewalOpps(allClients[i],opts);
    for(var j=0;j<list.length;j++)out.push(list[j]);
  }
  out.sort(function(a,b){return a.due<b.due?-1:(a.due>b.due?1:0)});
  return out;
}

function rnStateBadge(o){
  if(o.state==='overdue')return '<span class="rn-badge rn-badge-over">逾期 '+Math.abs(o.days)+' 天</span>';
  if(o.days===0)return '<span class="rn-badge rn-badge-due">今天到期</span>';
  if(o.state==='due')return '<span class="rn-badge rn-badge-due">还有 '+o.days+' 天</span>';
  return '<span class="rn-badge rn-badge-future">还有 '+o.days+' 天</span>';
}

// 商机金额合计：金额交不出来的单独计数，不当作 0 悄悄拉低合计
function rnRenewalSum(list){
  var sum=0,known=0,miss=0;
  for(var i=0;i<(list||[]).length;i++){
    var v=parseFloat(list[i].amount)||0;
    if(v>0){sum+=v;known++}else{miss++}
  }
  return {sum:sum,known:known,miss:miss};
}

// 单条商机的金额徽标。点一下就能改预估（不改原项目金额），
// 因为「上次 18 万」≠「今年也一定 18 万」，销售得能覆盖。
function rnAmountChip(o){
  var cid=String(o.client.id).replace(/\\/g,'\\\\').replace(/'/g,"\\'");
  var act=' onclick="event.stopPropagation();renewalSetEstimate(\''+cid+'\','+o.idx+')"';
  if(!(o.amount>0)){
    return '<span class="rn-amt rn-amt-miss" title="这次复购大概能做多少，点一下补上（用于预估商机金额）"'+act+'>金额待补</span>';
  }
  var isEst=o.amountSrc==='estimate';
  var tip=(isEst?'手工填的预估金额':'按上次招标金额预估')+'，点一下修改';
  return '<span class="rn-amt" title="'+tip+'"'+act
    +'>¥'+rnMoney(o.amount)+'<i class="rn-amt-tag">'+(isEst?'预估':'上次')+'</i></span>';
}

// ============================================================
// 经营总览 · 复购商机卡片
// ============================================================
async function renderRenewalCard(){
  var box=document.getElementById('rn-list');
  if(!box)return;
  // 客户数据没加载过就先拉一次（和 openOrderForm 的做法一致，不另写一套读取逻辑）
  if(!allClients||!allClients.length){
    box.innerHTML='<div class="empty-state">加载中...</div>';
    try{await loadClients()}catch(e){console.warn('[renewal] loadClients failed',e)}
  }
  var list=allRenewalOpps();
  var cntEl=document.getElementById('rn-count');
  if(cntEl)cntEl.textContent=list.length?'（'+list.length+'）':'';
  var agg=rnRenewalSum(list);
  var amtEl=document.getElementById('rn-amount');
  if(amtEl){
    amtEl.textContent=agg.sum>0?('预估 ¥'+rnMoney(agg.sum)):'';
    amtEl.title=agg.sum>0
      ?('按上次招标金额/手工预估汇总'+(agg.miss?('，另有 '+agg.miss+' 项没金额未计入'):''))
      :'';
  }
  var head=document.getElementById('rn-head-hint');
  if(head){
    var over=0;
    for(var oi=0;oi<list.length;oi++)if(list[oi].state==='overdue')over++;
    var tips=[];
    if(over)tips.push('有 '+over+' 个已过应做时间，优先打电话');
    else if(list.length)tips.push('临近应做时间，提前接触');
    if(agg.miss)tips.push(agg.miss+' 项缺金额');
    head.textContent=tips.join(' · ');
  }
  if(!list.length){
    box.innerHTML='<div class="empty-state">🎉 暂无到期的复购商机</div>';
    return;
  }
  var html='<div class="rn-list">';
  for(var i=0;i<list.length;i++){
    var o=list[i];
    html+='<div class="rn-item'+(o.state==='overdue'?' rn-over':'')+'">'
      +'<div class="rn-main">'
        +'<div class="rn-title">'+rnStateBadge(o)+'<b class="rn-client">'+h(o.client.name)+'</b><span class="rn-proj">'+h(o.name)+'</span>'+rnAmountChip(o)+'</div>'
        +'<div class="rn-sub">上次招标 '+h(o.anchor||'-')+' → 应于 <b>'+h(o.due)+'</b> 续做 · 每 '+o.months+' 个月一次</div>'
      +'</div>'
      +'<div class="rn-acts">'
        +'<button class="rn-btn rn-btn-primary" onclick="renewalFollowUp(\''+o.client.id+'\','+o.idx+')">去跟进</button>'
        +'<button class="rn-btn" onclick="renewalSnooze(\''+o.client.id+'\','+o.idx+')">稍后</button>'
        +'<button class="rn-btn rn-btn-ghost" onclick="renewalStop(\''+o.client.id+'\','+o.idx+')">不再提醒</button>'
      +'</div>'
    +'</div>';
  }
  html+='</div>';
  box.innerHTML=html;
}

// ============================================================
// 客户 360 · 复购提醒（只在有这个客户的商机时才出现）
// ============================================================
function renewal360CardHtml(c){
  var list=clientRenewalOpps(c,{includeFuture:true});
  if(!list.length)return '';
  var html='<div class="c360-card"><div class="c360-card-title">🔁 年度复购</div>';
  var shown=Math.min(list.length,3);
  for(var i=0;i<shown;i++){
    var o=list[i];
    var tip=o.state==='future'
      ?('下次  '+o.due)
      :(o.state==='overdue'?('应于 '+o.due+' 续做（逾期 '+Math.abs(o.days)+' 天）'):('应于 '+o.due+' 续做'));
    var amtHtml;
    if(o.amount>0){
      amtHtml='<span class="rn-amt" style="font-size:11px;margin-left:0;flex-shrink:0" title="'
        +(o.amountSrc==='estimate'?'手工填的预估金额':'按上次招标金额预估')+'，点一下修改"'
        +' onclick="renewalSetEstimate(\''+c.id+'\','+o.idx+')">¥'+rnMoney(o.amount)+'</span>';
    }else{
      amtHtml='<span class="rn-amt rn-amt-miss" style="font-size:10px;margin-left:0;flex-shrink:0" title="点一下补上这次的预估金额"'
        +' onclick="renewalSetEstimate(\''+c.id+'\','+o.idx+')">待补</span>';
    }
    html+='<div class="c360-info-row" style="font-size:12px;align-items:center">'
      +'<span class="c360-info-label" style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+h(o.name)+'</span>'
      +amtHtml
      +'<span class="c360-info-value" style="flex:1;min-width:0;text-align:right">'+h(tip)+'</span>'
      +(o.state==='future'
        ?''
        :'<button onclick="renewalFollowUp(\''+c.id+'\','+o.idx+')" style="flex-shrink:0;margin-left:6px;font-size:11px;color:var(--primary);border:1px solid var(--primary);border-radius:12px;background:transparent;padding:2px 8px;cursor:pointer">去跟进</button>')
      +'</div>';
  }
  if(list.length>shown)html+='<div style="font-size:11px;color:var(--text3);padding-top:2px">还有 '+(list.length-shown)+' 项</div>';
  html+='</div>';
  return html;
}

// ============================================================
// 动作：去跟进 / 稍后提醒 / 不再提醒
// ============================================================

// 把改动写回 clients.projects。铁律：update 被 RLS 过滤会「命中 0 行却返回 200」，
// 所以必须判 hit，不能只看 error（见 01-core.js · safeWriteById 的说明）。
async function rnPatchProject(cid,idx,patch){
  var c=null;
  for(var i=0;i<allClients.length;i++){if(String(allClients[i].id)===String(cid)){c=allClients[i];break}}
  if(!c){showToast('客户不存在，可能已被删除');return false}
  var projs=rnProjectsOf(c);
  var p=projs[idx];
  if(!p){showToast('项目已变动，请刷新后重试');return false}
  for(var k in patch){
    if(!Object.prototype.hasOwnProperty.call(patch,k))continue;
    // 传 undefined 表示「删掉这个字段」，而不是存成 null ——
    // 清空预估金额时要回到「自动沿用上次金额」，不能留个 null 在 JSON 里
    if(patch[k]===undefined)delete p[k];else p[k]=patch[k];
  }
  var res=await safeWriteById('clients','update',{projects:JSON.stringify(projs)},c.id);
  if(!res||!res.hit){
    var msg=(res&&res.error&&res.error.message)?res.error.message:'没有写入任何数据';
    showToast('保存失败：'+msg);
    return false;
  }
  c.projects=JSON.stringify(projs);   // 本地同步，避免再拉一次全量
  return true;
}

function rnRefreshAll(){
  try{renderRenewalCard()}catch(e){}
  // 客户列表卡片上也有复购标记：只在客户页可见时重绘，避免影响当前滚动位置
  var cv=document.getElementById('client-view');
  if(cv&&!cv.classList.contains('hidden')){try{renderList()}catch(e){}}
  // 客户 360 开着就同步刷新当前 tab
  var m=document.getElementById('client360-modal');
  if(m&&!m.classList.contains('hidden')&&c360ClientId){
    try{switchClient360Tab(c360ActiveTab||'overview')}catch(e){}
  }
}

async function renewalSnooze(cid,idx){
  var until=rnAddDays(rnToday(),RN_SNOOZE_DAYS);
  if(!await rnPatchProject(cid,idx,{recur_snooze:until}))return;
  showToast('已推迟到 '+until+' 再提醒');
  rnRefreshAll();
}

async function renewalStop(cid,idx){
  if(!await uiConfirm('不再提醒这个项目的年度复购？\n（项目本身不受影响，客户详情里取消并重新勾选即可恢复）',{okText:'不再提醒'}))return;
  if(!await rnPatchProject(cid,idx,{recur_off:true}))return;
  showToast('已停止提醒');
  rnRefreshAll();
}

// 手工填这一轮的预估金额（不改项目历史中标额，只影响商机预估）
// 留空 = 清掉，回到「沿用上次招标金额」
async function renewalSetEstimate(cid,idx){
  var c=null;
  for(var i=0;i<allClients.length;i++){if(String(allClients[i].id)===String(cid)){c=allClients[i];break}}
  if(!c){showToast('客户不存在，可能已被删除');return}
  var projs=rnProjectsOf(c),p=projs[idx];
  if(!p){showToast('项目已变动，请刷新后重试');return}
  var cur=projectRenewalAmount(p);
  var def=cur.src==='estimate'?String(p.renew_estimate):(cur.amount>0?String(Math.round(cur.amount)):'');
  var v=await uiPrompt(
    '这次复购预估多少钱？（元）\n留空则沿用上次招标金额'+(cur.src==='last'&&cur.amount>0?('（¥'+rnMoney(cur.amount)+'）'):''),
    def,{okText:'保存',inputType:'number'});
  if(v===null)return;                       // 取消
  var raw=String(v).trim();
  var patch;
  if(raw===''){
    if(cur.src!=='estimate')return;         // 本来就没手填，什么都不用改
    patch={renew_estimate:undefined};       // 清掉 → 回到沿用上次
  }else{
    var n=parseFloat(raw);
    if(isNaN(n)||n<0){showToast('请输入有效金额');return}
    n=Math.round(n*100)/100;
    if(cur.src==='estimate'&&String(p.renew_estimate)===String(n))return;
    patch={renew_estimate:n};
  }
  if(!await rnPatchProject(cid,idx,patch))return;
  showToast(patch.renew_estimate===undefined?'已恢复为上次招标金额':'预估金额已更新');
  rnRefreshAll();
}

// 一键开单：客户、项目名、金额、备注都预填好，销售只需要补日期和阶段
async function renewalFollowUp(cid,idx){
  var c=null;
  for(var i=0;i<allClients.length;i++){if(String(allClients[i].id)===String(cid)){c=allClients[i];break}}
  if(!c){showToast('客户不存在，可能已被删除');return}
  var projs=rnProjectsOf(c),p=projs[idx];
  if(!p){showToast('项目已变动，请刷新后重试');return}
  var due=projectRenewalDue(p);
  var year=due?due.slice(0,4):String(new Date().getFullYear());
  var baseName=String(p.project_name||'').trim();
  var newName=baseName?baseName+'（'+year+' 年度）':('年度复购（'+year+'）');
  var lastBid=String(p.bidding_date||'').slice(0,10);
  try{
    switchTab('orders');
    // 等 switchBizTab 把订单视图切好，再开表单，避免被后续渲染覆盖
    await new Promise(function(r){setTimeout(r,120)});
    await openOrderForm();
    pickOrderClient(c.id,c.name);
    var pel=document.getElementById('of-project');
    if(pel)pel.value=newName;
    var amt=projectRenewalAmount(p).amount;
    var ael=document.getElementById('of-amount');
    if(ael&&amt>0&&!ael.value)ael.value=String(amt);
    var nel=document.getElementById('of-notes');
    if(nel&&!nel.value){
      nel.value='年度复购：上次招标 '+(lastBid||'-')+(due?'，应于 '+due+' 续做':'')
        +(amt>0?('，上次金额 ¥'+rnMoney(amt)):'');
    }
    showToast('已按上次信息预填，确认金额后保存');
  }catch(e){
    console.warn('[renewal] followUp failed',e);
    showToast('打开订单失败：'+((e&&e.message)||e));
  }
}

// ============================================================
// 项目表单：周期性采购的勾选 / 周期 / 下次到期预览
// ============================================================

// 项目名命中年度服务关键词时自动勾上（只自动勾一次，用户取消过就不再自动勾）
function peRecurNameHint(inp){
  var entry=inp&&inp.closest?inp.closest('.project-entry'):null;
  if(!entry)return;
  var chk=entry.querySelector('.pe-recur');
  if(!chk||chk.checked)return;
  if(entry.getAttribute('data-recur-touched')==='1')return;
  if(!RN_KEYWORD_RE.test(String(inp.value||'')))return;
  chk.checked=true;
  entry.setAttribute('data-recur-auto','1');
  peRecurRender(entry);
}

function peRecurToggle(chk){
  var entry=chk&&chk.closest?chk.closest('.project-entry'):null;
  if(!entry)return;
  entry.setAttribute('data-recur-touched','1');
  entry.removeAttribute('data-recur-auto');
  if(chk.checked){
    // 重新勾选＝恢复提醒：把「已停止」「已稍后」清掉，否则勾了也不响
    var off=entry.querySelector('.pe-recur-off');if(off)off.value='';
    var sn=entry.querySelector('.pe-recur-snooze');if(sn)sn.value='';
  }
  peRecurRender(entry);
}

function peRecurResume(btn){
  var entry=btn&&btn.closest?btn.closest('.project-entry'):null;
  if(!entry)return;
  var off=entry.querySelector('.pe-recur-off');if(off)off.value='';
  var sn=entry.querySelector('.pe-recur-snooze');if(sn)sn.value='';
  entry.setAttribute('data-recur-touched','1');
  peRecurRender(entry);
  showToast('已恢复提醒');
}

function peRecurRender(entry){
  if(!entry)return;
  var chk=entry.querySelector('.pe-recur');
  var cfg=entry.querySelector('.pe-recur-cfg');
  var on=!!(chk&&chk.checked);
  if(cfg)cfg.classList.toggle('hidden',!on);
  // 「已停止提醒」时给一条恢复入口（勾着但 recur_off=1，光看勾选框看不出来）
  var offEl=entry.querySelector('.pe-recur-off');
  var stopped=!!(offEl&&offEl.value);
  var resume=entry.querySelector('.pe-recur-resume');
  if(resume)resume.classList.toggle('hidden',!(on&&stopped));
  if(on)peRecurSync(entry);
}

// 算一遍下次到期日，直接显示在表单里 —— 让用户当场看见「这条会不会提醒、哪天提醒」
function peRecurSync(el){
  var entry=el&&el.closest?el.closest('.project-entry'):null;
  if(!entry)return;
  var chk=entry.querySelector('.pe-recur');
  if(!chk||!chk.checked)return;
  var nextEl=entry.querySelector('.pe-recur-next-preview');
  if(!nextEl)return;
  var monthsEl=entry.querySelector('.pe-recur-months');
  var months=parseInt(monthsEl&&monthsEl.value,10)||RN_DEFAULT_MONTHS;
  var manualEl=entry.querySelector('.pe-recur-next');
  var manual=String(manualEl&&manualEl.value||'').trim();
  var bd=String((entry.querySelector('.pe-bidding-date')||{}).value||'').trim();
  var due=manual?(rnParseYmd(manual)?manual:''):(bd?rnAddMonths(bd,months):'');
  if(!due){
    nextEl.style.color='var(--text3)';
    nextEl.textContent='填了招标日期后自动算出下次时间';
    return;
  }
  var days=rnDiffDays(rnToday(),due);
  nextEl.style.color='';
  nextEl.textContent='下次应于 '+due+' 提醒'+(days<0?'（已逾期 '+Math.abs(days)+' 天）':(days===0?'（今天）':('（还有 '+days+' 天）')));
}

// ============================================================
// 项目表单：复购项目勾选
// ============================================================

// 跟谁比：本客户已保存的项目 + 同一张表单里还没保存的其它条目
// （一次把去年、今年两条一起录进去时，今年这条也要能认出来是复购）
function peRenewalCandidates(entry){
  var list=[];
  var src=(typeof formProjects!=='undefined'&&formProjects)?formProjects:[];
  for(var i=0;i<src.length;i++)list.push(src[i]);
  var entries=document.querySelectorAll('#project-list .project-entry');
  for(var j=0;j<entries.length;j++){
    if(entries[j]===entry)continue;
    var nm=String((entries[j].querySelector('.pe-project')||{}).value||'').trim();
    if(!nm)continue;
    list.push({project_name:nm,bidding_date:String((entries[j].querySelector('.pe-bidding-date')||{}).value||'')});
  }
  return list;
}

// 项目名 / 招标日期一变就重算：认出同名旧项目就自动勾上，让用户当场看见
function peRenewalSync(el){
  var entry=el&&el.closest?el.closest('.project-entry'):null;
  if(!entry)return;
  if(typeof projectRenewalOf!=='function')return;
  var p={
    project_name:String((entry.querySelector('.pe-project')||{}).value||''),
    bidding_date:String((entry.querySelector('.pe-bidding-date')||{}).value||'')
  };
  var rw=projectRenewalOf(p,peRenewalCandidates(entry));
  var prev=rw&&rw.prevDate?rw.prevDate:'';
  if(prev)entry.setAttribute('data-renewal-had','1');else entry.removeAttribute('data-renewal-had');
  entry.setAttribute('data-renewal-prev',prev);
  // 上次实际中标额：预估留空时要沿用这个数，得先说清是多少
  var prevAmt=(rw&&rw.prev&&typeof projectBidAmount==='function')?projectBidAmount(rw.prev):0;
  if(prevAmt>0)entry.setAttribute('data-renewal-prev-amt',String(prevAmt));
  else entry.removeAttribute('data-renewal-prev-amt');
  var chk=entry.querySelector('.pe-renewal');
  // 用户手动取消过的（data-renewal-touched）不再自动往回勾，否则取消不掉
  if(chk&&!chk.checked&&prev&&entry.getAttribute('data-renewal-touched')!=='1'){
    chk.checked=true;
    entry.setAttribute('data-renewal-auto','1');
  }
  peRenewalRender(entry);
}

function peRenewalToggle(chk){
  var entry=chk&&chk.closest?chk.closest('.project-entry'):null;
  if(!entry)return;
  entry.setAttribute('data-renewal-touched','1');
  peRenewalRender(entry);
}

function peRenewalRender(entry){
  if(!entry)return;
  var chk=entry.querySelector('.pe-renewal');
  var hint=entry.querySelector('.pe-renewal-hint');
  if(!hint)return;
  var on=!!(chk&&chk.checked);
  var wrap=entry.querySelector('.pe-renewal-est-wrap');
  if(wrap)wrap.classList.toggle('hidden',!on);
  if(on){
    var prev=entry.getAttribute('data-renewal-prev')||'';
    hint.textContent=prev?('上次招标 '+prev+'，这单算复购'):'这单算复购（客户之前做过同类项目）';
    hint.style.color='var(--warning)';
  }else{
    hint.textContent=entry.getAttribute('data-renewal-had')==='1'
      ?'已取消复购标记（保存后不再算复购）'
      :'客户之前做过同类项目才勾，统计复购率用';
    hint.style.color='';
  }
  peRenewalEstRender(entry);
}

// 预估金额下面的说明：留空会沿用多少，得让人看见数字，否则「留空」是个黑盒
function peRenewalEstRender(entry){
  if(!entry)return;
  var hint=entry.querySelector('.pe-renewal-est-hint');
  if(!hint)return;
  var chk=entry.querySelector('.pe-renewal');
  if(!chk||!chk.checked){hint.textContent='';hint.style.color='';return}
  var estEl=entry.querySelector('.pe-renewal-est');
  var typed=estEl?String(estEl.value||'').trim():'';
  var pa=parseFloat(entry.getAttribute('data-renewal-prev-amt')||'');
  if(typed!==''){
    var n=parseFloat(typed);
    if(isNaN(n)||n<0){hint.textContent='金额填错了';hint.style.color='var(--danger)'}
    else{hint.textContent='商机卡按 ¥'+rnMoney(n)+' 计入合计';hint.style.color=''}
    return;
  }
  if(pa>0){hint.textContent='留空＝沿用上次 ¥'+rnMoney(pa);hint.style.color=''}
  else{hint.textContent='上次没填金额，建议补一个，商机合计才不缺口';hint.style.color='var(--text3)'}
}

function peRenewalEstInput(inp){
  var entry=inp&&inp.closest?inp.closest('.project-entry'):null;
  if(entry)peRenewalEstRender(entry);
}
