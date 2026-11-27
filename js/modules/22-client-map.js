// ==========================================================================
// grsds · 22-client-map.js — 客户地域分布地图（省级 → 地市/区县下钻）
// --------------------------------------------------------------------------
// 入口：客户页工具栏「🗺 地图」（2026-11-27 用户需求：在地图上展示客户数量）
//
// 口径（与「归属地区」筛选保持一致，别再另造一套）：
//   · 省级：01-core 的 provOfClient()（手工 province > 地址 > 名称 > 重庆区县名）
//   · 地市 / 区县：拿地图自身的 feature 名称去匹配客户「地址 + 名称」，不另建城市词典
//     —— 名称与地图完全同源，ECharts 不会出现「有数据却没染色」的错位
//   · 匹配不到的不硬塞进某个区县，单列「未定位」，排行里可展开名单
//   · 数据范围默认跟随客户页当前筛选结果（_clientFiltered），可切「全部客户」
//
// 数据与性能：
//   · data/geo/china.json（34 省）+ data/geo/500000_full.json（重庆 38 区县）走本地同源
//   · 其他省份下钻时才从阿里 DataV 拉 {adcode}_full.json，只在内存缓存（不写 localStorage，
//     避免配额被几个省份塞满）
//   · ECharts 懒加载：打开面板才拉，CDN 失败降级为排行表，不影响客户页首屏那 4 秒
// ==========================================================================

var MAP_GEO_LOCAL='data/geo/';
var MAP_GEO_REMOTE='https://geo.datav.aliyun.com/areas_v3/bound/';
// ECharts 5.5.1：本地 vendor 优先（秒开、不依赖外网），CDN 仅作兜底
var MAP_ECHARTS_CDN=[
  'js/vendor/echarts.min.js',
  'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js',
  'https://unpkg.com/echarts@5.5.1/dist/echarts.min.js'
];
var _mapGeoMem={};        // adcode -> geojson（内存缓存，关面板不清）
var _mapEchartsPromise=null;
var _mapState=null;
var _mapSeq=0;

/* ── 名称归一 ───────────────────────────────────────────────────────────── */

/** 地图 feature 全称 → 省份简称（与 provOfClient 同口径）：重庆市→重庆、广西壮族自治区→广西 */
function geoProvShort(name){
  var s=String(name||'');
  s=s.replace(/(维吾尔自治区|回族自治区|壮族自治区|特别行政区|自治区)$/,'');
  s=s.replace(/[省市]$/,'');
  return s;
}
/** 地区名去行政后缀：「荣昌区」→「荣昌」、「石柱土家族自治县」→「石柱」 */
function geoCore(name){
  var s=String(name||'');
  s=s.replace(/(土家族苗族自治县|苗族土家族自治县|土家族自治县|苗族自治县|蒙古族自治县|各族自治县|自治县|自治旗|自治州|地区|矿区|林区|新区|盟|区|县|市|旗)$/,'');
  return s;
}
/** 客户用于地理匹配的文本：地址优先，名称里常带「XX区/县」兜底 */
function geoTextOf(c){
  if(!c)return '';
  return String(c.address||'')+' '+String(c.name||'');
}
/** feature 的经纬度包围盒面积（度²）：用来判断小到放不下文字标签的区县 */
function geoFeatureArea(f){
  if(!f||!f.geometry)return 0;
  var box=[1e9,-1e9,1e9,-1e9];
  (function walk(c){
    if(!c)return;
    if(typeof c[0]==='number'){
      if(c[0]<box[0])box[0]=c[0];
      if(c[0]>box[1])box[1]=c[0];
      if(c[1]<box[2])box[2]=c[1];
      if(c[1]>box[3])box[3]=c[1];
      return;
    }
    for(var i=0;i<c.length;i++)walk(c[i]);
  })(f.geometry.coordinates);
  if(box[0]>box[1])return 0;
  return (box[1]-box[0])*(box[3]-box[2]);
}
/**
 * 在一组 feature 里找出文本命中的那个地区。
 * 先比全名（「荣昌区」），再比去后缀的核心词（「荣昌」）；取命中名字最长的，
 * 避免「江北」这种短词把「江北区」抢走。命中不了返回 null，绝不猜。
 */
function geoMatchFeature(text, features){
  if(!text||!features||!features.length)return null;
  // 先抹掉路名/机构名再匹配：「中山南路」不该算中山市、「广州中医药大学」不是地址；
  // 抹除规则由 01-core · geoStripNoise 提供（与省份判定同一套，别另写一份）
  var t=geoStripNoise(text),best=null,bestLen=0;
  for(var i=0;i<features.length;i++){
    var f=features[i];
    var nm=f&&f.properties&&f.properties.name;
    if(!nm)continue;
    if(t.indexOf(nm)>=0){if(nm.length>bestLen){best=f;bestLen=nm.length}continue}
    var core=geoCore(nm);
    if(core.length>=2&&core!==nm&&t.indexOf(core)>=0&&core.length>bestLen){best=f;bestLen=core.length}
  }
  return best;
}
/** 省级聚合：直接按 provOfClient 归省份，不走文本匹配（「上海南」这类交叉词由 01 处理） */
function mapAggProv(pool, features){
  var byShort={},counts={},unknown=[];
  for(var i=0;i<features.length;i++){
    var f=features[i],nm=f.properties.name;
    counts[nm]=0;byShort[geoProvShort(nm)]=nm;
  }
  for(var j=0;j<pool.length;j++){
    var p=provOfClient(pool[j]);
    var target=p&&byShort[p];
    if(target)counts[target]++;
    else unknown.push(pool[j]);
  }
  return {counts:counts,unknown:unknown,byProv:true};
}
/** 地市/区县聚合：按 feature 名称匹配地址+名称；只写到街道的再按街道表反查区县 */
function mapAggRegion(pool, features){
  var counts={},unknown=[],has={};
  for(var i=0;i<features.length;i++){
    var n0=features[i].properties.name;
    counts[n0]=0;has[n0]=true;
  }
  for(var j=0;j<pool.length;j++){
    var c=pool[j],txt=geoTextOf(c);
    var f=geoMatchFeature(txt,features);
    var hit=f?f.properties.name:'';
    if(!hit){
      // 「高唐街道广东西路168号」这种没写区县的，用街道/镇/乡反推（重名的不猜）
      var dn=geoStreetOf(txt);
      if(dn&&has[dn])hit=dn;
    }
    if(hit)counts[hit]++;
    else unknown.push(c);
  }
  return {counts:counts,unknown:unknown,byProv:false};
}

/* ── 数据加载 ───────────────────────────────────────────────────────────── */

function mapFetchJSON(url){
  return fetch(url,{cache:'force-cache'}).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);
    return r.text();
  }).then(function(txt){
    // BOM 会让 JSON.parse 直接抛错，本地文件统一无 BOM，这里兜一层
    return JSON.parse(String(txt).replace(/^\uFEFF/,''));
  });
}
/* 本地地图清单（data/geo/geo-index.json：{adcode: 下级数量}。
   只有收录进来的 adcode 才允许下钻 —— 阿里 DataV 对浏览器直连返回 403，
   所以全部地图都已本地化（34 省 + 328 地市），清单是唯一可信来源。 */
var _mapIndex=null,_mapIndexPromise=null;
function mapLoadIndex(){
  if(_mapIndex)return Promise.resolve(_mapIndex);
  if(_mapIndexPromise)return _mapIndexPromise;
  _mapIndexPromise=mapFetchJSON(MAP_GEO_LOCAL+'geo-index.json').then(function(j){
    _mapIndex=(j&&typeof j==='object')?j:{};
    return _mapIndex;
  }).catch(function(){
    _mapIndex=null;   // 拿不到清单就当没有，下钻交给 childrenNum 判断
    return _mapIndex;
  });
  return _mapIndexPromise;
}
/** 这个地区有没有本地下级地图；depth>=2（区县）一律当叶子，不再往乡镇钻 */
function mapHasChild(adcode,depth){
  if(depth>=2)return false;
  if(!_mapIndex)return true;   // 清单不可用 → 让 childrenNum 决定，失败会自动降级成名单
  return Number(_mapIndex[String(adcode)])>0;
}

/** 取某级地图数据：一律走本地 data/geo（离线可用），本地缺才远程兜底 */
function mapLoadGeo(adcode){
  adcode=Number(adcode)||100000;
  if(_mapGeoMem[adcode])return Promise.resolve(_mapGeoMem[adcode]);
  var local=(adcode===100000)?MAP_GEO_LOCAL+'china.json':MAP_GEO_LOCAL+adcode+'_full.json';
  return mapFetchJSON(local).then(function(geo){
    if(!geo||!geo.features||!geo.features.length)throw new Error('NO_LOCAL');
    _mapGeoMem[adcode]=geo;
    return geo;
  }).catch(function(err){
    // 本地 404 = 这个地区本来就没有下级（省直辖县级市、兵团市等），别再去撞远程 403
    if(err&&/HTTP 404/.test(String(err.message)))throw new Error('NO_LOCAL');
    return mapFetchJSON(MAP_GEO_REMOTE+adcode+'_full.json').then(function(g){
      if(!g||!g.features||!g.features.length)throw new Error('地图数据为空');
      _mapGeoMem[adcode]=g;
      return g;
    });
  });
}
/* ── 街道级兜底（仅重庆）：地址只写到街道时也能精确到区县 ───────────────── */

var _mapStreets=null,_mapStreetPromise=null;
/** 重庆「街道/镇/乡 → 区县」对照表（data/geo/cq-streets.json，由 build-cq-streets.js 生成） */
function mapLoadStreets(){
  if(_mapStreets)return Promise.resolve(_mapStreets);
  if(_mapStreetPromise)return _mapStreetPromise;
  _mapStreetPromise=mapFetchJSON(MAP_GEO_LOCAL+'cq-streets.json').then(function(j){
    _mapStreets=(j&&typeof j==='object')?j:{};
    return _mapStreets;
  }).catch(function(){
    _mapStreets={};   // 失败就当没有，不阻断地图
    return _mapStreets;
  });
  return _mapStreetPromise;
}
/**
 * 从「XX街道 / XX镇 / XX乡」反查区县。
 * 街道名取后缀前 2~4 个字（「巫山县高唐街道」要能取到「高唐」而不是「县高唐」）；
 * 表里没收录的重名街道一律返回 ''，绝不猜。
 */
function geoStreetOf(text){
  if(!_mapStreets)return '';
  var t=String(text||''),re=/(街道|镇|乡)/g,m;
  while((m=re.exec(t))){
    var end=m.index,sfx=m[1];
    for(var len=4;len>=2;len--){
      var nm=t.slice(end-len,end)+sfx;
      if(nm.length>sfx.length&&_mapStreets[nm])return _mapStreets[nm];
    }
  }
  return '';
}
function mapLoadScript(src){
  return new Promise(function(res,rej){
    var s=document.createElement('script'),done=false;
    s.src=src;s.async=true;
    var timer=setTimeout(function(){if(done)return;done=true;rej(new Error('timeout'))},12000);
    s.onload=function(){if(done)return;done=true;clearTimeout(timer);res()};
    s.onerror=function(){if(done)return;done=true;clearTimeout(timer);rej(new Error('load fail'))};
    document.head.appendChild(s);
  });
}
/** ECharts 懒加载：三个 CDN 顺序试，全挂了就降级排行表 */
function mapEnsureEcharts(){
  if(window.echarts)return Promise.resolve(window.echarts);
  if(_mapEchartsPromise)return _mapEchartsPromise;
  _mapEchartsPromise=(async function(){
    for(var i=0;i<MAP_ECHARTS_CDN.length;i++){
      try{
        await mapLoadScript(MAP_ECHARTS_CDN[i]);
        if(window.echarts)return window.echarts;
      }catch(e){}
    }
    _mapEchartsPromise=null;   // 允许下次重试
    throw new Error('ECharts 加载失败');
  })();
  return _mapEchartsPromise;
}

/* ── 面板 DOM ───────────────────────────────────────────────────────────── */

function mapEnsureDom(){
  if(document.getElementById('cmap-overlay'))return;
  var html=''
   +'<div class="cmap-overlay hidden" id="cmap-overlay">'
   +' <div class="cmap-panel" role="dialog" aria-label="客户地域分布">'
   +'  <div class="cmap-head">'
   +'   <div class="cmap-title">🗺 客户地域分布<span class="cmap-sub" id="cmap-sub"></span></div>'
   +'   <div class="cmap-head-tools">'
   +'    <select id="cmap-scope" onchange="mapScopeChange(this.value)" title="统计范围">'
   +'     <option value="filtered">当前筛选结果</option><option value="all">全部客户</option>'
   +'    </select>'
   +'    <button class="cmap-x" onclick="clientMapClose()" title="关闭（Esc）">✕</button>'
   +'   </div>'
   +'  </div>'
   +'  <div class="cmap-crumb" id="cmap-crumb"></div>'
   +'  <div class="cmap-body">'
   +'   <div class="cmap-chart-wrap"><div id="cmap-chart" class="cmap-chart"></div>'
   +'    <div class="cmap-loading" id="cmap-loading">正在加载地图…</div></div>'
   +'   <div class="cmap-side" id="cmap-side"></div>'
   +'  </div>'
   +' </div>'
   +'</div>';
  var box=document.createElement('div');
  box.innerHTML=html;
  document.body.appendChild(box.firstChild);
  document.getElementById('cmap-overlay').addEventListener('click',function(e){
    if(e.target&&e.target.id==='cmap-overlay')clientMapClose();
  });
  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&_mapState)clientMapClose();
  });
  window.addEventListener('resize',function(){
    if(_mapState&&_mapState.chart&&_mapState.chart.resize)_mapState.chart.resize();
  });
}

/* ── 打开 / 关闭 / 范围 ─────────────────────────────────────────────────── */

function mapScopeClients(scope){
  var all=(typeof allClients!=='undefined'&&allClients)?allClients:[];
  all=all.filter(function(c){return c&&!c.deleted_at});
  if(scope==='all')return all;
  var f=(typeof _clientFiltered!=='undefined'&&_clientFiltered)?_clientFiltered:null;
  if(!f)return all;
  return f.filter(function(c){return c&&!c.deleted_at});
}

async function clientMapOpen(scope){
  if(typeof allClients==='undefined'||!allClients||!allClients.length){
    showToast('还没有客户数据，先等客户列表加载完','warning');
    return;
  }
  mapEnsureDom();
  scope=scope||'';
  if(scope!=='all'&&scope!=='filtered'){
    try{scope=localStorage.getItem('crm_map_scope')||'filtered'}catch(e){scope='filtered'}
  }
  document.getElementById('cmap-overlay').classList.remove('hidden');
  document.body.style.overflow='hidden';
  var sel=document.getElementById('cmap-scope');
  if(sel)sel.value=scope;
  await mapReset(scope);
}

function clientMapClose(){
  var ov=document.getElementById('cmap-overlay');
  if(ov)ov.classList.add('hidden');
  document.body.style.overflow='';
  if(_mapState&&_mapState.chart){
    try{_mapState.chart.dispose()}catch(e){}
  }
  _mapState=null;
}

async function mapScopeChange(scope){
  scope=scope==='all'?'all':'filtered';
  try{localStorage.setItem('crm_map_scope',scope)}catch(e){}
  // 直接调函数（不是用户点下拉）时也要把下拉回填，否则 UI 与统计范围会不一致
  var sel=document.getElementById('cmap-scope');
  if(sel&&sel.value!==scope)sel.value=scope;
  await mapReset(scope);
}

async function mapReset(scope){
  var pool=mapScopeClients(scope);
  var seq=++_mapSeq;
  _mapState={scope:scope,pool:pool,stack:[],listFeature:null,listPool:null,chart:null,loading:true};
  mapRenderCrumb();mapRenderSide();
  try{
    var both=await Promise.all([mapLoadGeo(100000),mapLoadIndex()]);
    var geo=both[0];
    if(seq!==_mapSeq||!_mapState)return;
    _mapState.stack.push({adcode:100000,geo:geo,pool:pool,agg:mapAggProv(pool,geo.features),depth:0,title:'全国'});
    await mapRender(seq);
  }catch(e){
    if(seq!==_mapSeq||!_mapState)return;
    mapLoading('地图数据加载失败：'+((e&&e.message)||e));
    mapRenderSide();
  }
}

function mapLoading(txt){
  var el=document.getElementById('cmap-loading');
  if(!el)return;
  if(!txt){el.style.display='none';return}
  el.style.display='flex';
  el.textContent=txt;
}

/* ── 下钻 ───────────────────────────────────────────────────────────────── */

function mapNode(){return _mapState&&_mapState.stack.length?_mapState.stack[_mapState.stack.length-1]:null}

async function mapDrill(name){
  var node=mapNode();
  if(!node)return;
  var f=null;
  for(var i=0;i<node.geo.features.length;i++){
    if(node.geo.features[i].properties.name===name){f=node.geo.features[i];break}
  }
  if(!f)return;
  var adcode=f.properties.adcode;
  var pool;
  if(node.depth===0){
    // 从全国下钻：按省份归属过滤（与客户页地区筛选同口径）
    var short=geoProvShort(name);
    pool=node.pool.filter(function(c){return provOfClient(c)===short});
  }else{
    pool=node.pool.filter(function(c){return geoMatchFeature(geoTextOf(c),[f])});
  }
  // 清单在 mapReset 里已加载好，这里同步判断即可（叶子路径不能变异步）
  var hasChild=mapHasChild(adcode,node.depth)&&Number(f.properties.childrenNum)>0;
  if(!hasChild){
    // 已是叶子（区县 / 不设区的地市）：右侧栏列客户名单，地图保持
    _mapState.listFeature=name;
    _mapState.listPool=pool;
    mapRenderSide();
    mapRenderCrumb(name);
    return;
  }
  var seq=++_mapSeq;
  mapLoading('正在加载「'+name+'」的下级地图…');
  try{
    var geo=await mapLoadGeo(adcode);
    if(adcode===500000)await mapLoadStreets();   // 重庆：补街道 → 区县
    if(seq!==_mapSeq||!_mapState)return;
    // 有些省份的 _full 会带上自己这一级，去掉自引用，否则地图只有一块
    var sub=geo.features.filter(function(x){return x.properties&&x.properties.name&&x.properties.adcode!==adcode});
    if(sub.length<2)throw new Error('NO_SUB');
    _mapState.stack.push({adcode:adcode,geo:{type:'FeatureCollection',features:sub},pool:pool,agg:mapAggRegion(pool,sub),depth:node.depth+1,title:name});
    _mapState.listFeature=null;_mapState.listPool=null;
    await mapRender(seq);
  }catch(e){
    if(seq!==_mapSeq||!_mapState)return;
    mapLoading('');
    // 拿不到下级地图（本地没收录 / 网络异常）不弹红色报错：直接按叶子处理，右栏列名单
    _mapState.listFeature=name;
    _mapState.listPool=pool;
    mapRenderSide();
    mapRenderCrumb(name);
    showToast('「'+name+'」没有更细的地图数据，已在右侧列出该地区客户','info');
  }
}

function mapBackTo(idx){
  if(!_mapState)return;
  if(idx<0)idx=0;
  _mapState.stack=_mapState.stack.slice(0,idx+1);
  _mapState.listFeature=null;_mapState.listPool=null;
  mapRender(++_mapSeq);
}

/* ── 渲染 ───────────────────────────────────────────────────────────────── */

function mapTheme(){
  var dark=document.body.classList.contains('dk');
  return dark?{
    area:'#1A2434',areaHover:'#1E3A5F',border:'rgba(148,163,184,.45)',label:'#F1F7FF',
    labelDim:'rgba(195,212,236,.62)',shadow:'rgba(2,8,20,.55)',
    // 起始色不能太暗：1-4 家的区县在深底上也要一眼能看见
    palette:['#1D4E79','#22609A','#2A74B4','#3489CC','#43A0DE','#5FB8EE','#86D0F7','#B4E5FF']
  }:{
    area:'#EEF2F8',areaHover:'#DCE6F5',border:'rgba(100,116,139,.38)',label:'#334155',
    labelDim:'rgba(51,65,85,.60)',shadow:'rgba(15,23,42,.18)',
    palette:['#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#2563EB','#1D4ED8','#1E40AF','#172554']
  };
}

/** 图例分段按当前层级的最大值裁剪：只有 4 家客户时不该摆出「500 家以上」占半屏 */
function mapPieces(maxV){
  var defs=[[1,4],[5,9],[10,19],[20,49],[50,99],[100,199],[200,499],[500,0]];
  var out=[];
  for(var i=0;i<defs.length;i++){
    var lo=defs[i][0],hi=defs[i][1];
    if(lo>maxV)break;
    out.push(hi?{min:lo,max:hi,label:lo+'-'+hi+' 家'}:{min:lo,label:lo+' 家以上'});
  }
  return out.length?out:[{min:0,max:0,label:'0 家'}];
}

function mapRenderCrumb(leafName){
  var el=document.getElementById('cmap-crumb');
  if(!el||!_mapState)return;
  var html='',st=_mapState.stack;
  for(var i=0;i<st.length;i++){
    if(i)html+='<span class="cmap-sep">›</span>';
    var n=st[i].pool.length;
    var cls=(i===st.length-1)?'cmap-crumb-cur':'cmap-crumb-link';
    var label=(i===0?'全国':escHtml(st[i].title))+' <em>'+n+'</em>';
    html+=cls==='cmap-crumb-link'
      ?'<a href="javascript:void(0)" class="'+cls+'" onclick="mapBackTo('+i+')">'+label+'</a>'
      :'<span class="'+cls+'">'+label+'</span>';
  }
  if(leafName){
    html+='<span class="cmap-sep">›</span><span class="cmap-crumb-cur">'+escHtml(leafName)+'</span>';
  }
  el.innerHTML=html;
}

function mapRenderSide(){
  var el=document.getElementById('cmap-side');
  if(!el||!_mapState)return;
  var node=mapNode();
  if(!node){el.innerHTML='';return}

  // 叶子级：客户名单
  if(_mapState.listFeature){
    var lp=_mapState.listPool||[];
    var rows='';
    for(var i=0;i<lp.length&&i<200;i++){
      var c=lp[i];
      rows+='<div class="cmap-cli" onclick="mapOpenClient(\''+escHtml(c.id)+'\')">'
        +'<span class="cmap-cli-nm">'+escHtml(c.name||'(未命名)')+'</span>'
        +'<span class="cmap-cli-ad">'+escHtml((c.address||'').slice(0,18))+'</span></div>';
    }
    if(!lp.length)rows='<div class="cmap-empty">这一级没有匹配到客户</div>';
    el.innerHTML='<div class="cmap-side-head"><span>'+escHtml(_mapState.listFeature)+' 的客户</span>'
      +'<span class="cmap-side-sub">'+lp.length+' 家</span></div>'
      +'<button class="cmap-back" onclick="mapClearList()">← 返回地图排行</button>'
      +'<div class="cmap-cli-list">'+rows+'</div>';
    return;
  }

  var agg=node.agg,counts=agg.counts,total=node.pool.length;
  var arr=[];
  for(var nm in counts){if(Object.prototype.hasOwnProperty.call(counts,nm))arr.push([nm,counts[nm]])}
  arr.sort(function(a,b){return (b[1]-a[1])||a[0].localeCompare(b[0],'zh')});
  var max=arr.length?arr[0][1]:0;
  var located=total-(agg.unknown?agg.unknown.length:0);

  var list='';
  for(var k=0;k<arr.length;k++){
    var name=arr[k][0],v=arr[k][1];
    if(!v)continue;   // 0 家的地区不占榜位，免得 34 行里 30 行是 0
    var pct=max?Math.max(2,Math.round(v/max*100)):0;
    var disp=node.depth===0?geoProvShort(name):name;
    list+='<div class="cmap-rank-row" onclick="mapDrill(\''+escHtml(name).replace(/'/g,'&#39;')+'\')" title="查看 '+escHtml(name)+'">'
      +'<span class="cmap-rank-nm">'+escHtml(disp)+'</span>'
      +'<span class="cmap-rank-bar"><i style="width:'+pct+'%"></i></span>'
      +'<span class="cmap-rank-num">'+v+'</span></div>';
  }
  if(!list)list='<div class="cmap-empty">当前范围内没有客户</div>';

  var unk=agg.unknown?agg.unknown.length:0;
  var unkHtml='';
  if(unk){
    var unkNames='';
    var lim=Math.min(unk,60);
    for(var u=0;u<lim;u++)unkNames+='<div class="cmap-cli" onclick="mapOpenClient(\''+escHtml(agg.unknown[u].id)+'\')"><span class="cmap-cli-nm">'+escHtml(agg.unknown[u].name||'(未命名)')+'</span><span class="cmap-cli-ad">'+escHtml((agg.unknown[u].address||'').slice(0,18))+'</span></div>';
    if(unk>lim)unkNames+='<div class="cmap-empty">仅列前 '+lim+' 家</div>';
    unkHtml='<div class="cmap-unk"><div class="cmap-unk-head" onclick="mapToggleUnknown()">'
      +'⚠️ 未定位 '+unk+' 家 <em id="cmap-unk-tip">（点开看名单）</em></div>'
      +'<div class="cmap-unk-body hidden" id="cmap-unk-body">'+unkNames+'</div></div>';
  }
  el.innerHTML='<div class="cmap-side-head"><span>地区排行</span>'
    +'<span class="cmap-side-sub">已定位 '+located+' / '+total+'</span></div>'
    +'<div class="cmap-rank">'+list+'</div>'+unkHtml;
}

function mapClearList(){
  if(!_mapState)return;
  _mapState.listFeature=null;_mapState.listPool=null;
  mapRenderCrumb();mapRenderSide();
}
function mapToggleUnknown(){
  var b=document.getElementById('cmap-unk-body');
  if(!b)return;
  b.classList.toggle('hidden');
  var t=document.getElementById('cmap-unk-tip');
  if(t)t.textContent=b.classList.contains('hidden')?'（点开看名单）':'（再点收起）';
}
function mapOpenClient(id){
  if(!id)return;
  clientMapClose();
  if(typeof openClient360==='function')openClient360(id);
}

async function mapRender(seq){
  if(!_mapState)return;
  var node=mapNode();
  if(!node)return;
  var total=node.pool.length;
  var sub=document.getElementById('cmap-sub');
  if(sub)sub.textContent='共 '+total+' 家客户 · '+(node.depth===0?'按省份看':'按'+(node.depth===1?'地市 / 区县':'区县')+'看');

  mapRenderCrumb();mapRenderSide();
  mapLoading('正在加载地图组件…');

  var echartsRef=null;
  try{echartsRef=await mapEnsureEcharts()}
  catch(e){
    if(seq!==_mapSeq)return;
    mapLoading('地图组件加载失败（需要联网）：左侧排行仍可用');
    return;
  }
  if(seq!==_mapSeq||!_mapState)return;
  mapLoading('');

  var wrap=document.getElementById('cmap-chart');
  if(!wrap)return;
  if(!_mapState.chart)_mapState.chart=echartsRef.init(wrap,null,{renderer:'canvas'});
  var chart=_mapState.chart;
  if(!chart)return;

  var th=mapTheme();
  var mapKey='cmap_'+node.adcode;
  echartsRef.registerMap(mapKey,node.geo);
  var counts=node.agg.counts,data=[],childMap={},areaMap={},maxV=0;
  for(var fi=0;fi<node.geo.features.length;fi++){
    var f0=node.geo.features[fi],fp=f0.properties;
    if(fp&&fp.name){
      // 能不能下钻以本地清单为准（省直辖县级市、兵团市 childrenNum>0 但没有下级地图）
      childMap[fp.name]=(mapHasChild(fp.adcode,node.depth)&&Number(fp.childrenNum)>0)?1:0;
      areaMap[fp.name]=geoFeatureArea(f0);
    }
  }
  // 板块少的层级（长沙 9 个区、广州 11 个区）面积普遍偏小，阈值放宽；
  // 重庆 38 个区县才用 0.09，免得主城区标签糊成一片
  var areaMin=(node.geo.features.length<=20)?0.018:0.09;
  for(var nm in counts){
    if(!Object.prototype.hasOwnProperty.call(counts,nm))continue;
    var v=counts[nm];
    if(v>maxV)maxV=v;
    // 渝中区这种面积太小的块塞不下「渝中 87」，隐藏文字、靠 hover + 右侧排行
    var canLabel=v>0&&(node.depth===0||(areaMap[nm]||0)>=areaMin);
    data.push({name:nm,value:v,childrenNum:childMap[nm]||0,label:{show:canLabel}});
  }
  // 大值优先：叠加 labelLayout.hideOverlap 时，主城区那种挤在一起的小区县
  // 只会隐藏值小的标签，值大的（渝中区 87）一定留得下来
  data.sort(function(a,b){return b.value-a.value});
  // 省级用简称（重庆 / 广东），地市/区县用简称（渝北 / 广州）
  var shortLabel=node.depth===0;
  function showName(n){return shortLabel?geoProvShort(n):geoCore(n)}
  var showLabel=node.geo.features.length<=42;
  var dark=document.body.classList.contains('dk');
  chart.setOption({
    backgroundColor:'transparent',
    animationDuration:420,
    tooltip:{
      trigger:'item',
      backgroundColor:dark?'rgba(15,23,42,.94)':'rgba(255,255,255,.97)',
      borderColor:th.border,textStyle:{color:th.label,fontSize:12},padding:[8,12],
      formatter:function(p){
        var v=(p.value==null||isNaN(p.value))?0:p.value;
        var pct=total?(v/total*100).toFixed(1):'0.0';
        var tip=Number(p.data&&p.data.childrenNum)>0?'<div style="opacity:.7;font-size:11px;margin-top:2px">点击下钻</div>':'';
        return '<b>'+escHtml(showName(p.name))+'</b><br/>客户 <b style="font-size:14px">'+v+'</b> 家 · 占比 '+pct+'%'+tip;
      }
    },
    visualMap:{
      type:'piecewise',seriesIndex:0,pieces:mapPieces(maxV),
      left:10,bottom:10,itemWidth:10,itemHeight:9,itemGap:3,
      inRange:{color:th.palette},
      textStyle:{color:th.labelDim,fontSize:10.5},
      backgroundColor:dark?'rgba(5,10,20,.55)':'rgba(255,255,255,.72)',
      padding:[5,7],borderRadius:6,
      showLabel:true
    },
    series:[{
      type:'map',map:mapKey,roam:true,aspectScale:0.95,
      scaleLimit:{min:0.8,max:8},
      zoom:node.depth===0?1.12:1,
      left:'1.5%',right:'1.5%',top:14,bottom:22,
      selectedMode:false,
      label:{
        show:showLabel,color:th.label,fontSize:10.5,lineHeight:14,fontWeight:600,
        // 描边保证白字压在浅蓝块上也读得清（高值区县填色比较亮）
        textBorderColor:dark?'rgba(3,10,20,.72)':'rgba(255,255,255,.9)',textBorderWidth:2,
        formatter:function(p){
          var v=(p.value==null||isNaN(p.value))?0:p.value;
          return v>0?(showName(p.name)+'\n'+v):'';
        }
      },
      labelLayout:{hideOverlap:true},
      itemStyle:{areaColor:th.area,borderColor:th.border,borderWidth:0.7,shadowColor:th.shadow,shadowBlur:6,shadowOffsetY:2},
      emphasis:{
        label:{show:true,color:dark?'#EAF4FF':'#0F172A',fontSize:11,fontWeight:600},
        itemStyle:{areaColor:th.areaHover,borderColor:'#38BDF8',borderWidth:1.4}
      },
      data:data
    }]
  },true);
  if(!chart.__cmapBound){
    chart.__cmapBound=true;
    chart.on('click',function(p){if(p&&p.name)mapDrill(p.name)});
  }
}

/* ── 客户页入口 ─────────────────────────────────────────────────────────── */
// 入口按钮写在 index.html 的客户工具条里（onclick="clientMapOpen()"），
// 和「🏷 归类」同款样式，520px 以下自动只留图标（.bulk-btn-txt 隐藏）。
