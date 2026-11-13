// ==========================================================================
// grsds · 01-core.js  —  全局常量 / 全局状态 / callAdmin / dbg
// 源: js/app_v2.js 第 1-38 行（机械切片，未改一行代码）
// ==========================================================================
// === app.js — 模块化 JS，从 index.html 提取 ===
// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明

// === 安全管理 API 代理 (P0-2 修复) ===
// 所有需 service_role 的操作统一走 Supabase Edge Function
async function callAdmin(op,table,opts){
  opts=opts||{};
  try{
    var bodyObj={op:op,table:table,method:opts.method||'GET',payload:opts.payload||null,query:opts.query||'*',filters:opts.filters||null};
    // 透传额外参数（如 auth 操作的 userId/password）
    if(opts.userId!==undefined)bodyObj.userId=opts.userId;
    if(opts.password!==undefined)bodyObj.password=opts.password;
    var body=JSON.stringify(bodyObj);
    var r=await fetch(SUPAFUNC_BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,Authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token||''},body:body});
    if(!r.ok){var txt=await r.text();console.error('callAdmin failed:',r.status,txt);return{data:null,error:{message:'Admin API error: HTTP ' + r.status + ' - ' + (txt||'empty response')}}};
    return await r.json();
  }catch(e){console.error('callAdmin error:',e);return{data:null,error:{message:e.message||'Network error'}};}
}
// === 统一写通道（受 RLS 约束的表，如 clients / contacts）===
// 背景：clients 的读链路走 admin-proxy（service_role，绕过 RLS）能读到全公司数据，
// 写链路却是 anon key 直连、受 RLS 约束，两条链路权限不一致。当行级策略
// （如 users can update own clients）不覆盖目标行时，PostgREST 的 update / delete
// 会「命中 0 行却返回 200 且无 error」—— 静默失败：界面提示成功，数据实际没变。
// 因此统一走本函数：先直连写入并带 select('id') 取回真实受影响行数；0 行则按需回退
// 代理通道。admin-proxy 对非超管会自动注入 company_id 过滤，不会跨公司越权。
// 返回 { hit:实际命中行数, via:'direct'|'proxy'|'none', error:null|{message} }
// 注意：调用方必须判断 hit —— hit===0 即「没写进去」，不能再当成功。
// opts.col        过滤列名，默认 'id'（按其它列批量定位时用，如 col:'client_id'）
// opts.allowProxy 默认 true；false 表示只直连并如实上报，绝不回退代理
async function safeWriteById(table,op,payload,ids,opts){
  opts=opts||{};
  var col=opts.col||'id',allowProxy=opts.allowProxy!==false;
  ids=Array.isArray(ids)?ids.filter(Boolean):(ids==null?[]:[ids]);
  if(!ids.length)return{hit:0,via:'none',error:null};
  var r=null;
  try{
    var qb=sb.from(table);
    qb=op==='delete'?qb.delete():qb.update(payload);
    qb=ids.length===1?qb.eq(col,ids[0]):qb.in(col,ids);
    r=await qb.select('id');
  }catch(e){r={error:{message:(e&&e.message)||String(e)}}}
  if(r&&!r.error&&Array.isArray(r.data)&&r.data.length>0){
    return{hit:r.data.length,via:'direct',error:null};
  }
  // 0 行有两种可能：真的没有匹配行，或被 RLS 过滤掉了。
  // miss:true 表示「没有报错但一行都没写进去」这种合成文案，调用方据此区分
  // 「真报错（如列不存在）」与「只是没命中」，前者要中止，后者要再读一次去确认。
  var lastErr=(r&&r.error)||{message:'未命中任何行（可能被行级策略过滤）',miss:true};
  // 仅按主键 id 定位时才回退代理：回退靠 id 逐条 eq（不依赖代理未验证过的 in 语法），
  // 按其它列批量回退既无法逐条收敛、也可能越权。
  if(!allowProxy||col!=='id')return{hit:0,via:'none',error:lastErr};
  var hit=0;
  for(var i=0;i<ids.length;i++){
    var pr=await callAdmin(op,table,{payload:payload,filters:[{col:'id',op:'eq',val:ids[i]}]});
    if(pr&&!pr.error)hit+=Array.isArray(pr.data)?pr.data.length:1;
    else lastErr=(pr&&pr.error)||lastErr;
  }
  return{hit:hit,via:'proxy',error:hit?null:lastErr};
}
// contacts 专用：联系人的**读取本身也受 RLS 约束**（loadClients / 客户详情里的
// contacts 查询都是 anon 直连，没有走 callAdmin），所以「看不到 = 改不了」是一致的。
// 也正因如此，写入**绝不能**回退代理通道 —— 那等于替用户修改他根本看不见的数据，属越权。
// 这里只做「直连 + 行数校验」，把原来被静默吞掉的失败如实报出来。
async function safeWriteContacts(op,payload,ids,opts){
  opts=opts||{};
  return safeWriteById('contacts',op,payload,ids,{col:opts.col,allowProxy:false});
}
window.addEventListener('error',function(e){console.error('[global err]',e.message,e.filename,e.lineno)});
window.addEventListener('unhandledrejection',function(e){console.error('[unhandled promise]',e.reason)});
window.__wfDiag=false;  // 工作流诊断开关（生产默认关闭）
// 调试日志：生产环境静默（仅本地调试或显式打开诊断时输出；console.warn / console.error 始终保留）
var _CRM_DEBUG=(location.protocol==='file:')||/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
function dbg(){
  if(!_CRM_DEBUG&&!window.__wfDiag)return;
  try{console.log.apply(console,arguments)}catch(e){}
}
var _slc=document.getElementById('script-loaded-check');if(_slc)_slc.style.display='none';

const BUILTIN_TYPES=['甲方','集成商','设计院','运营商','国央企','党政','厂家','制造业','军队','司法','教育','医疗','供应商'];
const BUILTIN_COLORS=['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#DC2626','#06B6D4','#EC4899','#84CC16','#6366F1','#F97316','#14B8A6','#A855F7'];
const PALETTE=['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#84CC16','#6366F1','#F97316','#14B8A6','#78716C','#0EA5E9','#D946EF','#E84C3D'];

let loginMode='login',currentUser=null,allClients=[],allContacts=[],allCompanies=[],allCompaniesMap={},currentFilter='all',selTypes=[],customTypes=[],newTypeColor=PALETTE[0];
// === 多公司支持 ===
let currentCompanyId=null,currentCompanyRole='member',currentCompanyName='',allMyCompanies=[];
// 显式声明：原先为隐式全局变量，登录前被读取会抛 ReferenceError
var isSuperAdmin=false;

// === 加载占位：骨架屏 ===
// 统一各列表的「加载中...」纯文字占位为骨架屏。返回的是可直接塞进已有网格/列表容器的 HTML 片段。
function skCards(n){
  var s='';
  for(var i=0;i<n;i++){
    s+='<div class="sk-card">'
      +'<div class="sk sk-line" style="width:34%"></div>'
      +'<div class="sk sk-line" style="width:72%;height:16px;margin-top:14px"></div>'
      +'<div class="sk sk-line" style="width:56%"></div>'
      +'<div class="sk sk-line" style="width:90%"></div>'
      +'<div class="sk sk-line" style="width:66%"></div>'
      +'<div class="sk sk-line" style="width:78%"></div>'
      +'<div class="sk sk-line" style="width:44%"></div>'
      +'</div>';
  }
  return s;
}
function skStatCards(n){
  var s='';
  for(var i=0;i<n;i++){
    s+='<div class="stat-card sk-stat">'
      +'<div class="sk sk-line" style="width:46px;height:24px;margin:2px auto 9px"></div>'
      +'<div class="sk sk-line" style="width:58px;margin:0 auto"></div>'
      +'</div>';
  }
  return s;
}
function skRows(n){
  var s='';
  for(var i=0;i<n;i++){
    s+='<div class="sk-row"><div class="sk sk-avatar"></div><div class="sk-grow">'
      +'<div class="sk sk-line" style="width:40%"></div>'
      +'<div class="sk sk-line" style="width:68%"></div></div>'
      +'<div class="sk sk-line sk-tail"></div></div>';
  }
  return s;
}
function skLines(n,widths){
  var s='';
  for(var i=0;i<n;i++){s+='<div class="sk sk-line" style="width:'+((widths&&widths[i])||'100%')+'"></div>'}
  return s;
}

// ==========================================================================
// 搜索排序：名称「完全匹配」永远排最前
// --------------------------------------------------------------------------
// 客户库里同一家单位常常挂着一堆下级：「重庆市公安局」下面有「重庆市公安局渝中分局」
// 「重庆市公安局XX派出所」。按录入顺序排列时，搜「重庆市公安局」分局反而排到本部前面，
// 选错客户的概率很高。统一口径：
//   0 名称完全匹配 → 1 名称前缀匹配 → 2 名称包含 → 3 只靠地址/项目/联系人等其它字段命中
// 比对前先去掉空白，避免「重庆市 公安局」这类录入差异让完全匹配失效。
// ==========================================================================
function searchNorm(s){return String(s==null?'':s).replace(/\s+/g,'').toLowerCase()}
// 关键词命中：原文命中即通过；输入里带空白时再去掉空白比一次（「重庆市 公安局」也能搜到）
function searchHit(text,kw){
  var s=String(text==null?'':text).toLowerCase();
  var q=String(kw==null?'':kw).toLowerCase();
  if(!q)return true;
  if(s.indexOf(q)>=0)return true;
  return /\s/.test(q)&&searchNorm(s).indexOf(searchNorm(q))>=0;
}
function searchNameRank(name,kw){
  var n=searchNorm(name);
  var q=searchNorm(kw);
  if(!q)return 0;
  if(!n)return 3;
  if(n===q)return 0;
  if(n.indexOf(q)===0)return 1;
  if(n.indexOf(q)>=0)return 2;
  return 3;
}
// 按名称匹配度稳定排序：同分保持原有顺序（客户列表不按招标日期排序，别打乱原有观感）
function sortBySearchRank(list,kw){
  var arr=list||[];
  if(arr.length<2)return arr.slice();
  var tmp=[];
  for(var i=0;i<arr.length;i++)tmp.push({v:arr[i],i:i,r:searchNameRank(arr[i]&&arr[i].name,kw)});
  tmp.sort(function(a,b){return (a.r-b.r)||(a.i-b.i)});
  var out=[];
  for(var j=0;j<tmp.length;j++)out.push(tmp[j].v);
  return out;
}
// 客户名搜索：只按名称命中，完全匹配优先；limit 用于下拉候选（传 8）
function searchClientsByName(kw,limit){
  var q=searchNorm(kw);
  var src=(typeof allClients!=='undefined'&&allClients)?allClients:[];
  var out=[];
  for(var i=0;i<src.length;i++){
    var c=src[i];
    if(!c||!c.name)continue;
    if(q&&searchNorm(c.name).indexOf(q)<0)continue;
    out.push(c);
  }
  out=sortBySearchRank(out,q);
  return (limit&&out.length>limit)?out.slice(0,limit):out;
}
