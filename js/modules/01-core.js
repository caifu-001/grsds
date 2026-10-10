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
