// ==========================================================================
// grsds · 01-core.js  —  全局常量 / 全局状态 / callAdmin / dbg
// 源: js/app_v2.js 第 1-38 行（机械切片，未改一行代码）
// ==========================================================================
// === app.js — 模块化 JS，从 index.html 提取 ===
// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明

// === 安全管理 API 代理 (P0-2 修复) ===
// 所有需 service_role 的操作统一走 Supabase Edge Function
// session 有效性保障：supabase-js@2 的 getSession() 读的是内存里的 session，
// 页面长时间后台、或浏览器阻止第三方存储（控制台会提示 Tracking Prevention
// blocked access to storage）时自动刷新可能没落地，拿到过期 / null 的 session
// 直接调代理就会 401 Unauthorized: invalid or expired token。
// 因此：发请求前先确认 session 有效，401 时强制刷新并重试一次。
async function validAdminSession(){
  try{
    var r=await sb.auth.getSession();
    var s=r&&r.data&&r.data.session;
    if(!s||!s.access_token)return null;                          // 交给下面的 401 分支处理
    var exp=Number(s.expires_at||0);
    if(exp>0){
      if(exp<1e12)exp=exp*1000;                                  // 秒 → 毫秒
      if(exp-Date.now()<60000){
        var f=await refreshAdminSession();
        return f||s;                                              // 刷新失败也先用旧 token，别误杀
      }
    }
    return s;
  }catch(e){return null}
}
async function refreshAdminSession(){
  try{var r=await sb.auth.refreshSession();return (r&&r.data&&r.data.session)||null}catch(e){return null}
}
async function callAdmin(op,table,opts){
  opts=opts||{};
  try{
    var bodyObj={op:op,table:table,method:opts.method||'GET',payload:opts.payload||null,query:opts.query||'*',filters:opts.filters||null};
    // 透传额外参数（如 auth 操作的 userId/password）
    if(opts.userId!==undefined)bodyObj.userId=opts.userId;
    if(opts.password!==undefined)bodyObj.password=opts.password;
    var body=JSON.stringify(bodyObj);
    var ses=await validAdminSession();
    // 括号必须包住 token：原来写成 'Bearer '+token||'' ，+ 优先级高于 || ，
    // session 为 null 时会拼出字符串 'Bearer undefined' → 代理 401。
    // 没有 token 时不在这里短路，仍发一次请求，由 401 分支强制刷新重试兜底。
    var token=(ses&&ses.access_token)||'';
    var post=function(t){return fetch(SUPAFUNC_BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_ANON_KEY,Authorization:'Bearer '+t},body:body})};
    var r=await post(token);
    if(r.status===401){
      var s2=await refreshAdminSession();                       // 请求途中刚好过期：刷新后重试一次
      if(s2&&s2.access_token)r=await post(s2.access_token);
    }
    if(!r.ok){
      var txt=await r.text();
      console.error('callAdmin failed:',r.status,txt);
      if(r.status===401)return{data:null,error:{message:'登录状态已失效，请重新登录后再操作（代理仍返回 401）'}};
      return{data:null,error:{message:'Admin API error: HTTP ' + r.status + ' - ' + (txt||'empty response')}};
    }
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

let loginMode='login',currentUser=null,allClients=[],allContacts=[],allCompanies=[],allCompaniesMap={},currentFilter='all',currentProvince='all',selTypes=[],customTypes=[],newTypeColor=PALETTE[0];
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
// ==========================================================================
// 省份 / 地区解析（客户分类用）
// ---------------------------------------------------------------------------
// 现状：甲方客户绝大多数在重庆，后续要拓外地市场。clients 表原本没有省份列，
// 全靠地址猜；这里做统一解析，前端任何地方都用同一套口径：
//   1) 手工指定的 c.province（执行 add_client_province.sql 后才有）优先
//   2) 详细地址里的省份名
//   3) 单位名称里的省份名（很多客户地址为空，但名字带「重庆」「北京」）
//   4) 重庆区县名兜底（地址只写「奉节县…」「学府大道…」的也是重庆）
// 名称兜底有轻微误伤风险（如「重庆XX四川分公司」会判重庆），但比"未知"有用得多，
// 且手工指定省份可以覆盖。
// ==========================================================================
var _provinceColReady=false;   // clients.province 列是否已建（执行 sql/add_client_province.sql 后为 true）
var CN_PROVINCES=['重庆','北京','天津','上海','河北','山西','内蒙古','辽宁','吉林','黑龙江',  '江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南',
  '四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','香港','澳门','台湾'];
// 匹配顺序很重要：「上海南」「河南」这类交叉词按长名优先，「内蒙古」要排在「内蒙古」自身
var CN_PROV_RE=[
  ['内蒙古',/内蒙古/],['黑龙江',/黑龙江/],
  ['重庆',/重庆/],['北京',/北京/],['天津',/天津/],['上海',/上海/],
  ['河北',/河北|石家庄|唐山|秦皇岛|邯郸|邢台|保定|张家口|承德|沧州|廊坊|衡水/],
  ['山西',/山西|太原|大同|阳泉|长治|晋城|朔州|晋中|运城|忻州|临汾|吕梁/],
  ['辽宁',/辽宁|沈阳|大连|鞍山|抚顺|本溪|丹东|锦州|营口|阜新|辽阳|盘锦|铁岭|朝阳|葫芦岛/],
  ['吉林',/吉林|长春|四平|辽源|通化|白山|松原|白城|延边/],
  ['江苏',/江苏|南京|无锡|徐州|常州|苏州|南通|连云港|淮安|盐城|扬州|镇江|泰州|宿迁/],
  ['浙江',/浙江|杭州|宁波|温州|嘉兴|湖州|绍兴|金华|衢州|舟山|台州|丽水/],
  ['安徽',/安徽|合肥|芜湖|蚌埠|淮南|马鞍山|淮北|铜陵|安庆|黄山|滁州|阜阳|宿州|六安|亳州|池州|宣城/],
  ['福建',/福建|福州|厦门|莆田|三明|泉州|漳州|南平|龙岩|宁德/],
  ['江西',/江西|南昌|景德镇|萍乡|九江|新余|鹰潭|赣州|吉安|宜春|抚州|上饶/],
  ['山东',/山东|济南|青岛|淄博|枣庄|东营|烟台|潍坊|济宁|泰安|威海|日照|临沂|德州|聊城|滨州|菏泽/],
  ['河南',/河南|郑州|开封|洛阳|平顶山|安阳|鹤壁|新乡|焦作|濮阳|许昌|漯河|三门峡|南阳|商丘|信阳|周口|驻马店|济源/],
  ['湖北',/湖北|武汉|黄石|十堰|宜昌|襄阳|鄂州|荆门|孝感|荆州|黄冈|咸宁|随州|恩施|仙桃|潜江|天门/],
  ['湖南',/湖南|长沙|株洲|湘潭|衡阳|邵阳|岳阳|常德|张家界|益阳|郴州|永州|怀化|娄底|湘西/],
  ['广东',/广东|广州|韶关|深圳|珠海|汕头|佛山|江门|湛江|茂名|肇庆|惠州|梅州|汕尾|河源|阳江|清远|东莞|中山|潮州|揭阳|云浮/],
  ['广西',/广西|南宁|柳州|桂林|梧州|北海|防城港|钦州|贵港|玉林|百色|贺州|河池|来宾|崇左/],
  ['海南',/海南省|海南|海口|三亚|三沙|儋州/],
  ['四川',/四川|成都|自贡|攀枝花|泸州|德阳|绵阳|广元|遂宁|内江|乐山|南充|眉山|宜宾|广安|达州|雅安|巴中|资阳|阿坝|甘孜|凉山/],
  ['贵州',/贵州|贵阳|六盘水|遵义|安顺|毕节|铜仁|黔西南|黔东南|黔南/],
  ['云南',/云南|昆明|曲靖|玉溪|保山|昭通|丽江|普洱|临沧|楚雄|红河|文山|西双版纳|大理|德宏|怒江|迪庆/],
  ['西藏',/西藏|拉萨|日喀则|昌都|林芝|山南|那曲|阿里/],
  ['陕西',/陕西|西安|铜川|宝鸡|咸阳|渭南|延安|汉中|榆林|安康|商洛/],
  ['甘肃',/甘肃|兰州|嘉峪关|金昌|白银|天水|武威|张掖|平凉|酒泉|庆阳|定西|陇南|临夏|甘南/],
  ['青海',/青海|西宁|海东|海北|黄南|果洛|玉树|海西/],
  ['宁夏',/宁夏|银川|石嘴山|吴忠|固原|中卫/],
  ['新疆',/新疆|乌鲁木齐|克拉玛依|吐鲁番|哈密|昌吉|博尔塔拉|巴音郭楞|阿克苏|克孜勒苏|喀什|和田|伊犁|塔城|阿勒泰/],
  ['香港',/香港/],['澳门',/澳门/],['台湾',/台湾|台北|高雄|台中/]
];
// 重庆 38 个区县 + 直管区：地址只有区县名时也能归属重庆
var CQ_DISTRICT_RE=/(万州|涪陵|渝中|大渡口|江北区|沙坪坝|九龙坡|南岸|北碚|綦江|大足|渝北|巴南|黔江|长寿|江津|合川|永川|南川|璧山|铜梁|潼南|荣昌|开州|梁平|武隆|城口|丰都|垫江|忠县|云阳|奉节|巫山|巫溪|石柱|秀山|酉阳|彭水|两江新区|万盛|高新区)/;

/* ── 地址防误判（2026-11-27：用户报「巫山县人民医院被归到广东」）─────────────
   旧逻辑直接在整段文字里找省名，地址里的「路名 / 机构名」会被当成行政区：
     「巫山县高唐街道广东西路168号」→ 命中「广东」→ 判成广东（实际重庆巫山）
     「重庆市璧山区中山南路133号」→ 命中「中山」→ 判成广东中山
     「重庆市万州区上海医院」      → 命中「上海」
   现在三档判定，从强到弱：
     ① 原文里有「重庆市 / 广东省 / 广西壮族自治区」这种行政后缀 → 直接采信
     ② 文本以省简称开头且不是路名（「重庆大学」「重庆道华科技」算，「上海南路」不算）
     ③ 抹掉路名/机构名之后再认省名
   GEO_NOISE_RE 只收「地址设施」词（路/街/道/广场/大厦/小区…），**不收 公司/集团/大学/医院**
   —— 收了会把「重庆长寿开发投资（集团）有限公司」整段吃掉；名称里的地名本来就该参与判定，
   机构名误伤交给 geoRoadAt 的位置判断（「上海医院」只在没有其他线索时才会误判，概率极低）。
   GEO_NOISE_RE 的前缀不能含「省市区县镇乡州盟旗」，否则「巫山县高唐街」会把「巫山县」一起吃掉
────────────────────────────────────────────────────────────────────────── */
var GEO_NOISE_RE=/[^\s省市区县镇乡州盟旗0-9A-Za-z]{2,6}?(?:大道|大街|中路|东路|西路|南路|北路|支路|正街|路|街|道|巷|广场|大厦|花园|小区|公寓|酒店|宾馆|酒楼|公园|市场|大楼|立交|隧道|车站|收费站|码头|机场)/g;
var GEO_ADMIN_FULL_RE=/(重庆|北京|天津|上海)市|(河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|台湾)(?:省|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区)|(香港|澳门)特别行政区/;
/** 抹掉地址里的路名与机构名，只留省/市/区县这类行政信息 */
function geoStripNoise(txt){
  return String(txt==null?'':txt).replace(GEO_NOISE_RE,' ').replace(/[\s　]+/g,' ').trim();
}
/** pos 处的地名后面紧跟「路 / 街 / 大道 / 中山四路…」→ 是路名，不是行政区 */
function geoRoadAt(t,pos,len){
  var tail=String(t).slice(pos+len,pos+len+4);
  if(/^[东南西北中]?(?:路|街|巷)/.test(tail))return true;                       // 上海南路 / 北京路 / 广东西路
  if(/^[东南西北中]?(?:大街|大道)/.test(tail))return true;                        // 中山大道
  if(/^[一二三四五六七八九十百0-9]{1,2}(?:路|街|巷)/.test(tail))return true;      // 中山四路 / 人民三街
  if(/^(?:支路|正街)/.test(tail))return true;                                    // 人民支路
  return false;
}
/**
 * 原文里逐个找省名 / 地市名，跳过被当成路名的位置。
 * 这是「（重庆）有限公司」「中国移动重庆分公司」这类无地址客户的主要判据。
 */
function provScanNoRoad(t){
  for(var i=0;i<CN_PROV_RE.length;i++){
    var re=new RegExp(CN_PROV_RE[i][1].source,'g'),m,guard=0;
    while((m=re.exec(t))&&guard++<80){
      if(!geoRoadAt(t,m.index,m[0].length))return CN_PROV_RE[i][0];
      if(re.lastIndex===m.index)re.lastIndex++;
    }
  }
  return '';
}
/** 省份名归一：'重庆市' / '重庆省' / '广西壮族自治区' → 简称；识别不了返回 '' */
function provNorm(v){
  var t=String(v==null?'':v).replace(/[\s　]+/g,'');
  if(!t)return '';
  for(var i=0;i<CN_PROV_RE.length;i++)if(CN_PROV_RE[i][1].test(t))return CN_PROV_RE[i][0];
  return '';
}
/** 从一段文字（地址 / 客户名）里识别省份，识别不了返回 '' */
function provOfText(txt){
  var t=String(txt==null?'':txt);
  if(!t)return '';
  // ① 行政后缀最可信：机构名（重庆大学、广州中医药大学…）不会把它抹掉
  var m=t.match(GEO_ADMIN_FULL_RE);
  if(m)return m[1]||m[2]||m[3];
  // ② 以省简称开头，且紧跟的不是路名
  var head=t.replace(/[\s　]+/g,'');
  for(var i=0;i<CN_PROVINCES.length;i++){
    var nm=CN_PROVINCES[i];
    if(head.indexOf(nm)===0&&!geoRoadAt(head,0,nm.length))return nm;
  }
  // ③ 原文逐省扫描，路名位置跳过（「（重庆）有限公司」→ 重庆，「广东西路」→ 不是广东）
  var hit=provScanNoRoad(t);
  if(hit)return hit;
  // ④ 抹掉路名 / 机构名之后再认（兜底）
  var s=geoStripNoise(t);
  for(var j=0;j<CN_PROV_RE.length;j++)if(CN_PROV_RE[j][1].test(s))return CN_PROV_RE[j][0];
  return '';
}
/** 客户归属省份：手工 province > 地址 > 名称 > 重庆区县名；都判断不了返回 ''（未知） */
function provOfClient(c){
  if(!c)return '';
  var manual=provNorm(c.province);
  if(manual)return manual;
  var byAddr=provOfText(c.address);
  if(byAddr)return byAddr;
  var byName=provOfText(c.name);
  if(byName)return byName;
  if(CQ_DISTRICT_RE.test(String(c.address||'')+String(c.name||'')))return '重庆';
  return '';
}
/** 是否本地（重庆）。判断不了的情况按本地算，避免把未知客户误当外地 */
function provIsLocal(p){return !p||p==='重庆'}
/** 客户卡片上的地区徽标：重庆不显示（默认大本营），外地才标出来 */
function provBadgeHtml(c){
  var p=provOfClient(c);
  if(!p||p==='重庆')return '';
  return '<span class="prov-badge" title="客户归属地区：'+escHtml(p)+'（非重庆）">🌏 '+escHtml(p)+'</span>';
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
