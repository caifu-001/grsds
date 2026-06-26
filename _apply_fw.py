import re, sys

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# === 1. CSS: Insert before </style> ===
css = '''
/* Fieldwork */
.fw-tabs{display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--card-bg);overflow-x:auto}
.fw-tabs button{padding:6px 14px;border-radius:16px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:var(--bg2);color:var(--text2);white-space:nowrap}
.fw-tabs button.active{background:var(--primary);color:#fff}
.fw-panel{padding:16px}
.fw-kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.fw-kpi-card{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center}
.fw-kpi-card .kpi-label{font-size:12px;color:var(--text3);margin-bottom:4px}
.fw-kpi-card .kpi-val{font-size:24px;font-weight:700;color:var(--primary)}
.fw-checkin-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:18px;border:none;border-radius:14px;font-size:18px;font-weight:700;color:#fff;cursor:pointer;margin-bottom:16px}
.fw-checkin-btn.in{background:linear-gradient(135deg,#4F6EF7,#3B82F6)}
.fw-checkin-btn.out{background:linear-gradient(135deg,#EF4444,#DC2626)}
.fw-checkin-btn:disabled{opacity:0.5;cursor:not-allowed}
.fw-timeline{position:relative;padding-left:20px}
.fw-timeline::before{content:'';position:absolute;left:6px;top:0;bottom:0;width:2px;background:var(--border)}
.fw-timeline-item{position:relative;padding:10px 0 10px 20px;border-bottom:1px solid var(--border2)}
.fw-timeline-item::before{content:'';position:absolute;left:-18px;top:16px;width:10px;height:10px;border-radius:50%;border:2px solid var(--primary);background:var(--card-bg)}
.fw-timeline-item.in::before{background:#4F6EF7;border-color:#4F6EF7}
.fw-timeline-item.out::before{background:#EF4444;border-color:#EF4444}
.fw-timeline-time{font-size:12px;color:var(--text3)}
.fw-timeline-addr{font-size:13px;color:var(--text)}
.fw-timeline-note{font-size:12px;color:var(--text2);margin-top:2px}
.fw-visit-card{border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;background:var(--card-bg)}
.fw-visit-card .vw-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.fw-visit-card .vw-client{font-weight:600;font-size:14px;color:var(--text)}
.fw-visit-card .vw-date{font-size:12px;color:var(--text3)}
.fw-visit-card .vw-purpose{font-size:13px;color:var(--primary);margin-bottom:6px}
.fw-visit-card .vw-notes{font-size:13px;color:var(--text2)}
.fw-visit-card .vw-result{display:inline-block;margin-top:6px;padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600}
.fw-visit-card .vw-result.done{background:#e8f5e9;color:#2e7d32}
.fw-visit-card .vw-result.follow{background:#fff8e1;color:#f57f17}
.fw-visit-card .vw-result.pending{background:#e3f2fd;color:#1565c0}
.fw-visit-form{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px}
.fw-visit-form .fw-field{margin-bottom:12px}
.fw-visit-form label{display:block;font-size:12px;font-weight:600;color:var(--text3);margin-bottom:4px}
.fw-track-map{background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:16px;min-height:300px;display:flex;align-items:center;justify-content:center;color:var(--text3);font-size:14px}
.fw-stat-card{background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:14px}
.fw-stat-card .stat-name{font-weight:600;font-size:14px;color:var(--text);margin-bottom:6px}
.fw-stat-card .stat-bar{height:6px;border-radius:3px;background:var(--bg2);overflow:hidden;margin-bottom:4px}
.fw-stat-card .stat-fill{height:100%;border-radius:3px;background:var(--primary)}
.fw-stat-card .stat-nums{font-size:12px;color:var(--text3)}
@media(max-width:768px){
  .fw-kpi-row{grid-template-columns:repeat(2,1fr)}
  .fw-checkin-btn{font-size:16px;padding:14px}
}
'''

html = html.replace('</style>', css + '\n</style>')

# === 2. Topbar tab: Insert after tab-myoffice ===
tab_insert = '\n   <button class="topbar-tab" id="tab-fieldwork" onclick="switchTab(\'fieldwork\')">📍 外勤</button>'
# Find "tab-myoffice" followed by the button
p = html.find('id="tab-myoffice"')
# Find the > and the line end
end_of_line = html.index('\n', p)
html = html[:end_of_line] + tab_insert + html[end_of_line:]

# === 3. HTML: Insert after analytics-view closing ===
# Find analytics-view opening and track its closing
av_start = html.index('id="analytics-view"')
# Find the matching closing </div> - the last </div> before the script
depth = 0
av_end = -1
for i in range(av_start, len(html)):
    tag4 = html[i:i+4]
    tag6 = html[i:i+6]
    if tag4 == '<div':
        depth += 1
    elif tag6 == '</div>':
        depth -= 1
        if depth == 0:
            av_end = i + 6
            break

# Verify we found it
ctx = html[av_end-50:av_end+50].replace('\n', '\\n')
# OK

fw_html = '''
  <!-- ══════════ 外勤管理 ══════════ -->
  <div id="fieldwork-view" class="hidden">
    <div class="fw-tabs">
      <button onclick="switchFWTab('overview')" id="fwt-overview">📊 外勤概览</button>
      <button onclick="switchFWTab('checkin')" id="fwt-checkin">📍 签到打卡</button>
      <button onclick="switchFWTab('visits')" id="fwt-visits">🏢 拜访记录</button>
      <button onclick="switchFWTab('track')" id="fwt-track">🗺️ 今日轨迹</button>
      <button onclick="switchFWTab('stats')" id="fwt-stats">📈 拜访统计</button>
    </div>

    <!-- 外勤概览 -->
    <div id="fw-overview" class="fw-panel">
      <div class="fw-kpi-row" id="fw-ov-kpi"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="fw-stat-card"><h4 style="margin:0 0 10px;font-size:14px">📅 今日打卡</h4><div id="fw-ov-today-checks">加载中...</div></div>
        <div class="fw-stat-card"><h4 style="margin:0 0 10px;font-size:14px">🏢 今日拜访</h4><div id="fw-ov-today-visits">加载中...</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="fw-stat-card"><h4 style="margin:0 0 10px;font-size:14px">👥 团队外勤动态</h4><div id="fw-ov-team">加载中...</div></div>
        <div class="fw-stat-card"><h4 style="margin:0 0 10px;font-size:14px">📊 本周统计</h4><div id="fw-ov-weekly">加载中...</div></div>
      </div>
    </div>

    <!-- 签到打卡 -->
    <div id="fw-checkin" class="fw-panel hidden">
      <div id="fw-checkin-status" style="text-align:center;margin-bottom:16px"></div>
      <button class="fw-checkin-btn in" id="fw-btn-in" onclick="doCheckIn('in')">📍 上班签到</button>
      <button class="fw-checkin-btn out" id="fw-btn-out" onclick="doCheckIn('out')" style="margin-top:8px">🏠 下班签退</button>
      <div style="margin-top:16px">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--text3);margin-bottom:4px">📝 备注</label>
        <input id="fw-checkin-note" placeholder="工作内容简述..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)">
      </div>
      <div style="margin-top:20px">
        <h4 style="margin:0 0 10px;font-size:14px;font-weight:600">📋 今日签到记录</h4>
        <div id="fw-today-list">加载中...</div>
      </div>
    </div>

    <!-- 拜访记录 -->
    <div id="fw-visits" class="fw-panel hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <select id="fw-visit-filter" onchange="loadFWVisits()" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text)">
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="all">全部</option>
        </select>
        <button onclick="openVisitForm()" style="padding:6px 16px;border:none;border-radius:8px;background:var(--primary);color:#fff;font-size:13px;font-weight:600;cursor:pointer">+ 新增拜访</button>
      </div>
      <div id="fw-visit-list">加载中...</div>
    </div>

    <!-- 今日轨迹 -->
    <div id="fw-track" class="fw-panel hidden">
      <div class="fw-kpi-row" id="fw-tr-kpi"></div>
      <div class="fw-track-map" id="fw-map-container">
        📍 今日外勤轨迹（需配合GPS签到数据展示）
      </div>
      <div style="margin-top:12px" id="fw-track-list"></div>
    </div>

    <!-- 拜访统计 -->
    <div id="fw-stats" class="fw-panel hidden">
      <div style="display:flex;gap:8px;margin-bottom:16px">
        <select id="fw-stats-period" onchange="loadFWStats()" style="padding:6px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text)">
          <option value="week">本周</option>
          <option value="month" selected>本月</option>
          <option value="quarter">本季</option>
        </select>
        <select id="fw-stats-user" onchange="loadFWStats()" style="padding:6px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg);color:var(--text)">
          <option value="all">全部员工</option>
        </select>
      </div>
      <div id="fw-stats-content">加载中...</div>
    </div>

    <!-- 新增拜访弹窗 -->
    <div id="fw-visit-modal" class="modal hidden">
      <div class="modal-card" style="max-width:520px;max-height:85vh;overflow-y:auto">
        <div class="modal-hdr"><span id="fw-vm-title">新增拜访记录</span><button class="modal-x" onclick="closeVisitForm()">✕</button></div>
        <div class="fw-visit-form">
          <div class="fw-field"><label>客户名称 *</label><input id="fw-vm-client" placeholder="搜索客户..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"><div id="fw-vm-client-list" style="max-height:150px;overflow-y:auto"></div></div>
          <div class="fw-field"><label>拜访目的</label><select id="fw-vm-purpose" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"><option value="">请选择</option><option value="初次拜访">初次拜访</option><option value="需求沟通">需求沟通</option><option value="方案演示">方案演示</option><option value="商务谈判">商务谈判</option><option value="合同签署">合同签署</option><option value="售后服务">售后服务</option><option value="关系维护">关系维护</option><option value="催款">催款</option><option value="其他">其他</option></select></div>
          <div class="fw-field"><label>拜访日期</label><input type="date" id="fw-vm-date" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"></div>
          <div class="fw-field"><label>拜访内容</label><textarea id="fw-vm-notes" rows="3" placeholder="沟通内容、客户反馈..." style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text);resize:vertical"></textarea></div>
          <div class="fw-field"><label>拜访结果</label><select id="fw-vm-result" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;font-size:14px;background:var(--bg);color:var(--text)"><option value="">请选择</option><option value="done">✅ 达成目标</option><option value="follow">🔄 需继续跟进</option><option value="pending">⏳ 待定</option></select></div>
          <button onclick="saveFVisit()" style="width:100%;padding:12px;border:none;border-radius:10px;background:var(--primary);color:#fff;font-size:15px;font-weight:600;cursor:pointer">💾 保存</button>
        </div>
      </div>
    </div>
  </div>
'''

# Insert after analytics-view closing </div>
html = html[:av_end] + fw_html + html[av_end:]

# === 4. switchTab: Insert fieldwork branch after myoffice branch ===
# Find the myoffice branch
mo_end = html.index("switchMyOfficeTab('overview');")
mo_end = html.index('\n', mo_end)  # end of line
# Find the next }\n} pattern (close of else-if and close of function)
p = html.index('\n}', mo_end)  # close of else-if block
p = html.index('\n}', p+2)  # close of function switchTab

fw_tab_code = """
  if(tab==='fieldwork'){
    var fwv=document.getElementById('fieldwork-view');
    fwv.classList.remove('hidden');
    document.getElementById('tab-fieldwork').classList.add('active');
    document.getElementById('topbar-title').textContent='外勤管理';
    fab.classList.add('hidden');
    switchFWTab('overview');
  }
"""
html = html[:p] + fw_tab_code + html[p:]

# Also add fieldwork-view to the allViews array at the beginning of switchTab
# Find "if(anv)allViews.push(anv);"
allviews_pos = html.find('if(anv)allViews.push(anv);')
allviews_end = html.index('\n', allviews_pos)
html = html[:allviews_end] + '\n  var fwv=document.getElementById(\'fieldwork-view\');if(fwv)allViews.push(fwv);' + html[allviews_end:]

# Also add tab-fieldwork to allTabs
# Find "if(tan)allTabs.push(tan);"
alltabs_pos = html.find('if(tan)allTabs.push(tan);')
alltabs_end = html.index('\n', alltabs_pos)
html = html[:alltabs_end] + '\n  var tfw=document.getElementById(\'tab-fieldwork\');if(tfw)allTabs.push(tfw);' + html[alltabs_end:]

# === 5. JS functions: Insert before </script> of the last script block ===
# Find the last </script>
last_script = html.rfind('</script>')

fw_js = '''
/* ═══════════════ 外勤管理 ═══════════════ */
let fwCheckinState=null;  // null | 'in' | 'out'
let fwVisitEditId=null;
let fwVisitClientId=null;

function switchFWTab(tab){
  var tabs=['overview','checkin','visits','track','stats'];
  for(var i=0;i<tabs.length;i++){
    var el=document.getElementById('fw-'+tabs[i]);
    var btn=document.getElementById('fwt-'+tabs[i]);
    if(el)el.classList.toggle('hidden',tabs[i]!==tab);
    if(btn)btn.classList.toggle('active',tabs[i]===tab);
  }
  if(tab==='overview')loadFWOverview();
  else if(tab==='checkin')loadFWCheckin();
  else if(tab==='visits')loadFWVisits();
  else if(tab==='track')loadFWTrack();
  else if(tab==='stats')loadFWStats();
}

async function loadFWOverview(){
  var kpi=document.getElementById('fw-ov-kpi');
  if(!kpi)return;
  var today=new Date().toISOString().substring(0,10);
  // Load today's checkins
  try{
    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var {data:visits}=await sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).eq('visit_date',today);
    var visitsToday=visits?visits.length:0;
    var hasIn=false,hasOut=false;
    if(checks){for(var i=0;i<checks.length;i++){if(checks[i].type==='in')hasIn=true;if(checks[i].type==='out')hasOut=true}}
    // Week stats
    var weekAgo=new Date();weekAgo.setDate(weekAgo.getDate()-7);
    var waStr=weekAgo.toISOString().substring(0,10);
    var {data:weekVisits}=await sb.from('field_visits').select('id').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('visit_date',waStr);
    // Team today
    var {data:teamChecks}=await sb.from('field_checkins').select('user_id,type').eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var teamMap={};if(teamChecks){for(var i=0;i<teamChecks.length;i++){var tc=teamChecks[i];if(!teamMap[tc.user_id])teamMap[tc.user_id]={in:false,out:false};teamMap[tc.user_id][tc.type]=true}}
    var teamIn=0,teamOut=0;for(var k in teamMap){if(teamMap[k].in)teamIn++;if(teamMap[k].out)teamOut++}
    kpi.innerHTML='<div class="fw-kpi-card"><div class="kpi-label">📍 今日签到</div><div class="kpi-val">'+(hasIn?'✅':hasOut?'☀️':'—')+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🏢 今日拜访</div><div class="kpi-val">'+visitsToday+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📅 本周拜访</div><div class="kpi-val">'+(weekVisits?weekVisits.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🧑‍🤝‍🧑 团队已签到</div><div class="kpi-val">'+teamIn+'/'+(allUsers?allUsers.length:'?')+'</div></div>';
    // Today checks
    var ckHtml='';if(checks&&checks.length){for(var i=0;i<checks.length;i++){var ck=checks[i];ckHtml+='<div class="fw-timeline-item '+ck.type+'"><div class="fw-timeline-time">'+(ck.created_at?new Date(ck.created_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+(ck.address||h(ck.note||'签到'))+'</div>'+(ck.note?'<div class="fw-timeline-note">'+h(ck.note)+'</div>':'')+'</div>'}}else{ckHtml='<div style="color:var(--text3);font-size:13px">暂无签到记录</div>'}
    document.getElementById('fw-ov-today-checks').innerHTML=ckHtml;
    // Today visits
    var vtHtml='';if(visits&&visits.length){for(var i=0;i<visits.length;i++){var v=visits[i];vtHtml+='<div class="fw-timeline-item in"><div class="fw-timeline-time">'+(v.start_time||'')+'</div><div class="fw-timeline-addr">'+h(v.client_name||'未命名')+'</div>'+(v.purpose?'<div class="fw-timeline-note">'+h(v.purpose)+'</div>':'')+'</div>'}}else{vtHtml='<div style="color:var(--text3);font-size:13px">暂无拜访记录</div>'}
    document.getElementById('fw-ov-today-visits').innerHTML=vtHtml;
    // Team
    var teamHtml='<div style="font-size:13px;color:var(--text2)">已签到 '+teamIn+' 人 | 已签退 '+teamOut+' 人</div>';
    document.getElementById('fw-ov-team').innerHTML=teamHtml;
    // Weekly
    var weekHtml='<div style="font-size:13px;color:var(--text2)">本周累计拜访 '+(weekVisits?weekVisits.length:0)+' 次</div>';
    document.getElementById('fw-ov-weekly').innerHTML=weekHtml;
    fwCheckinState=hasOut?'out':hasIn?'in':null;
  }catch(e){console.error('loadFWOverview error:',e);if(kpi)kpi.innerHTML='<div style="color:var(--danger);font-size:13px">加载失败</div>'}
}

async function loadFWCheckin(){
  var today=new Date().toISOString().substring(0,10);
  var status=document.getElementById('fw-checkin-status');
  var btnIn=document.getElementById('fw-btn-in');
  var btnOut=document.getElementById('fw-btn-out');
  try{
    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var hasIn=false,hasOut=false;
    if(checks){for(var i=0;i<checks.length;i++){if(checks[i].type==='in')hasIn=true;if(checks[i].type==='out')hasOut=true}}
    fwCheckinState=hasOut?'out':hasIn?'in':null;
    if(status){
      if(hasIn&&hasOut)status.innerHTML='<div style="color:#10B981;font-size:14px">✅ 今日已完成签到和签退</div>';
      else if(hasIn)status.innerHTML='<div style="color:#F59E0B;font-size:14px">☀️ 已签到，别忘签退哦</div>';
      else status.innerHTML='<div style="color:var(--text3);font-size:14px">🌅 早上好！请签到开始新一天</div>';
    }
    if(btnIn){btnIn.disabled=hasIn;btnIn.textContent=hasIn?'✅ 已签到':'📍 上班签到'}
    if(btnOut){btnOut.disabled=!hasIn||hasOut;btnOut.textContent=hasOut?'✅ 已签退':'🏠 下班签退'}
    // Today list
    var list=document.getElementById('fw-today-list');
    var html='';if(checks&&checks.length){for(var i=0;i<checks.length;i++){var ck=checks[i];html+='<div class="fw-timeline-item '+ck.type+'"><div class="fw-timeline-time">'+(ck.created_at?new Date(ck.created_at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+(ck.address||'GPS位置未获取')+'</div>'+(ck.note?'<div class="fw-timeline-note">'+h(ck.note)+'</div>':'')+'</div>'}}else{html='<div style="color:var(--text3);font-size:13px">暂无记录</div>'}
    if(list)list.innerHTML=html;
  }catch(e){console.error('loadFWCheckin error:',e)}
}

async function doCheckIn(type){
  var note=document.getElementById('fw-checkin-note').value.trim();
  var btnIn=document.getElementById('fw-btn-in');
  var btnOut=document.getElementById('fw-btn-out');
  if(type==='in'){btnIn.disabled=true;btnIn.textContent='签到中...'}
  else{btnOut.disabled=true;btnOut.textContent='签退中...'}
  try{
    // Try to get geolocation
    var lat=null,lng=null,addr='';
    if(navigator.geolocation){
      try{
        var pos=await new Promise(function(res,rej){navigator.geolocation.getCurrentPosition(res,rej,{timeout:5000,enableHighAccuracy:true})});
        lat=pos.coords.latitude;lng=pos.coords.longitude;
      }catch(g){console.log('Geolocation failed:',g)}
    }
    var r=await sb.from('field_checkins').insert({user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId}).select();
    if(r.error){showToast('签到失败: '+r.error.message);return}
    showToast(type==='in'?'✅ 签到成功！':'🏠 签退成功，辛苦了！');
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){showToast('签到失败: '+(e.message||e));console.error(e)}
  finally{if(type==='in'){btnIn.disabled=false} else{btnOut.disabled=false}}
}

async function loadFWVisits(){
  var filter=document.getElementById('fw-visit-filter').value;
  var list=document.getElementById('fw-visit-list');
  if(!list)return;
  list.innerHTML='<div style="color:var(--text3);font-size:13px">加载中...</div>';
  var query=sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).order('visit_date',{ascending:false}).order('created_at',{ascending:false});
  var today=new Date().toISOString().substring(0,10);
  if(filter==='today')query=query.eq('visit_date',today);
  else if(filter==='week'){var w=new Date();w.setDate(w.getDate()-7);query=query.gte('visit_date',w.toISOString().substring(0,10))}
  else if(filter==='month'){query=query.gte('visit_date',new Date().toISOString().substring(0,7)+'-01')}
  try{
    var {data}=await query;
    var html='';
    if(data&&data.length){
      for(var i=0;i<data.length;i++){
        var v=data[i];
        var rClass=v.result==='done'?'done':v.result==='follow'?'follow':'pending';
        var rLabel=v.result==='done'?'达成':v.result==='follow'?'跟进':'待定';
        html+='<div class="fw-visit-card"><div class="vw-header"><div class="vw-client">'+h(v.client_name||'未关联客户')+'</div><div class="vw-date">'+v.visit_date+'</div></div>'+(v.purpose?'<div class="vw-purpose">🎯 '+h(v.purpose)+'</div>':'')+(v.notes?'<div class="vw-notes">'+h(v.notes)+'</div>':'')+(v.result?('<div class="vw-result '+rClass+'">'+rLabel+'</div>'):'')+'</div>';
      }
    }else{html='<div style="text-align:center;color:var(--text3);padding:40px 0"><div style="font-size:40px;margin-bottom:8px">🏢</div><div>暂无拜访记录</div></div>'}
    list.innerHTML=html;
  }catch(e){console.error(e);list.innerHTML='<div style="color:var(--danger)">加载失败</div>'}
}

function openVisitForm(id){
  fwVisitEditId=id||null;fwVisitClientId=null;
  document.getElementById('fw-vm-title').textContent=id?'编辑拜访记录':'新增拜访记录';
  var today=new Date().toISOString().substring(0,10);
  document.getElementById('fw-vm-date').value=today;
  document.getElementById('fw-vm-client').value='';
  document.getElementById('fw-vm-purpose').value='';
  document.getElementById('fw-vm-notes').value='';
  document.getElementById('fw-vm-result').value='';
  document.getElementById('fw-vm-client-list').innerHTML='';
  document.getElementById('fw-visit-modal').classList.remove('hidden');
  // Client autocomplete
  document.getElementById('fw-vm-client').addEventListener('input',function(){
    var q=this.value.trim().toLowerCase();var list=document.getElementById('fw-vm-client-list');
    if(!q||!allClients.length){list.innerHTML='';return}
    var matches=allClients.filter(function(c){return (c.name||'').toLowerCase().indexOf(q)>-1}).slice(0,6);
    var h='';for(var i=0;i<matches.length;i++){h+='<div style="padding:8px 10px;cursor:pointer;border-bottom:1px solid var(--border2)'+(i===0?'background:var(--bg2);font-weight:600':'')+'" onclick="selectFWClient(\''+matches[i].id+'\',\''+matches[i].name.replace(/'/g,\"\\\\'\")+'\')">'+h2(matches[i].name)+'</div>'}
    list.innerHTML=h;
  });
  if(id){
    // Load existing data
    sb.from('field_visits').select('*').eq('id',id).single().then(function(r){
      if(r.data){
        document.getElementById('fw-vm-client').value=r.data.client_name||'';
        document.getElementById('fw-vm-purpose').value=r.data.purpose||'';
        document.getElementById('fw-vm-date').value=r.data.visit_date||'';
        document.getElementById('fw-vm-notes').value=r.data.notes||'';
        document.getElementById('fw-vm-result').value=r.data.result||'';
        fwVisitClientId=r.data.client_id||null;
      }
    });
  }
}
// Helper for autocomplete
function h2(s){return s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;'):''}
function selectFWClient(id,name){
  document.getElementById('fw-vm-client').value=name;
  fwVisitClientId=id;
  document.getElementById('fw-vm-client-list').innerHTML='';
}
function closeVisitForm(){document.getElementById('fw-visit-modal').classList.add('hidden')}
async function saveFVisit(){
  var clientName=document.getElementById('fw-vm-client').value.trim();
  if(!clientName){showToast('请输入客户名称');return}
  var data={
    user_id:currentUser.id,
    client_id:fwVisitClientId||null,
    client_name:clientName,
    purpose:document.getElementById('fw-vm-purpose').value,
    notes:document.getElementById('fw-vm-notes').value.trim(),
    result:document.getElementById('fw-vm-result').value,
    visit_date:document.getElementById('fw-vm-date').value,
    company_id:currentCompanyId
  };
  try{
    var r;
    if(fwVisitEditId){r=await sb.from('field_visits').update(data).eq('id',fwVisitEditId)}
    else{r=await sb.from('field_visits').insert(data)}
    if(r.error){showToast('保存失败: '+r.error.message);return}
    showToast('✅ '+(fwVisitEditId?'更新':'新增')+'拜访记录成功');
    closeVisitForm();loadFWVisits();loadFWOverview();
  }catch(e){showToast('保存失败: '+(e.message||e));console.error(e)}
}

async function loadFWTrack(){
  var today=new Date().toISOString().substring(0,10);
  var kpi=document.getElementById('fw-tr-kpi');
  var list=document.getElementById('fw-track-list');
  try{
    var {data:checks}=await sb.from('field_checkins').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).gte('created_at',today).order('created_at',{ascending:true});
    var {data:visits}=await sb.from('field_visits').select('*').eq('user_id',currentUser.id).eq('company_id',currentCompanyId).eq('visit_date',today);
    var points=0;if(checks){for(var i=0;i<checks.length;i++){if(checks[i].latitude)points++}}
    if(visits){for(var i=0;i<visits.length;i++){if(visits[i].latitude)points++}}
    if(kpi)kpi.innerHTML='<div class="fw-kpi-card"><div class="kpi-label">📍 轨迹点数</div><div class="kpi-val">'+points+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📅 签到次数</div><div class="kpi-val">'+(checks?checks.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">🏢 拜访次数</div><div class="kpi-val">'+(visits?visits.length:0)+'</div></div>'
      +'<div class="fw-kpi-card"><div class="kpi-label">📏 覆盖客户</div><div class="kpi-val">'+(visits?new Set(visits.map(function(x){return x.client_id||x.client_name})).size:0)+'</div></div>';
    if(points===0){document.getElementById('fw-map-container').innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">🗺️</div><div style="font-size:14px;color:var(--text2)">暂无GPS定位数据<br><span style="font-size:12px;color:var(--text3)">请使用支持GPS的设备签到以生成轨迹</span></div></div>'}
    // Track timeline
    var tlHtml='<h4 style="margin:0 0 10px;font-size:14px;font-weight:600">📋 今日时间线</h4>';
    var events=[];if(checks){for(var i=0;i<checks.length;i++){events.push({time:checks[i].created_at,text:(checks[i].type==='in'?'📍 签到':'🏠 签退')+(checks[i].note?': '+checks[i].note:''),type:checks[i].type})}}
    if(visits){for(var i=0;i<visits.length;i++){events.push({time:visits[i].visit_date+'T'+(visits[i].start_time||'00:00'),text:'🏢 拜访 '+visits[i].client_name+(visits[i].purpose?' - '+visits[i].purpose:''),type:'visit'})}}
    events.sort(function(a,b){return a.time<b.time?-1:1});
    if(events.length){tlHtml+='<div class="fw-timeline">';for(var i=0;i<events.length;i++){var e=events[i],ts=e.time?new Date(e.time):null;tlHtml+='<div class="fw-timeline-item '+(e.type||'in')+'"><div class="fw-timeline-time">'+(ts?ts.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):'')+'</div><div class="fw-timeline-addr">'+h(e.text)+'</div></div>'}tlHtml+='</div>'}
    else{tlHtml+='<div style="color:var(--text3);font-size:13px">暂无今日活动</div>'}
    if(list)list.innerHTML=tlHtml;
  }catch(e){console.error(e);if(kpi)kpi.innerHTML='<div style="color:var(--danger)">加载失败</div>'}
}

async function loadFWStats(){
  var period=document.getElementById('fw-stats-period').value;
  var selUser=document.getElementById('fw-stats-user').value;
  var content=document.getElementById('fw-stats-content');
  if(!content)return;
  content.innerHTML='<div style="color:var(--text3);font-size:13px">加载中...</div>';
  // Calculate date range
  var dt=new Date();var start='';
  if(period==='week'){dt.setDate(dt.getDate()-7);start=dt.toISOString().substring(0,10)}
  else if(period==='month'){start=new Date().toISOString().substring(0,7)+'-01'}
  else{dt.setMonth(dt.getMonth()-3);start=dt.toISOString().substring(0,10)}
  try{
    var query=sb.from('field_visits').select('*').eq('company_id',currentCompanyId).gte('visit_date',start);
    if(selUser!=='all')query=query.eq('user_id',selUser);
    var {data}=await query;
    if(!data||!data.length){content.innerHTML='<div style="text-align:center;color:var(--text3);padding:40px 0">暂无数据</div>';return}
    // Aggregate by user
    var userMap={};
    for(var i=0;i<data.length;i++){var v=data[i];if(!userMap[v.user_id])userMap[v.user_id]={name:'',count:0,done:0};userMap[v.user_id].count++;if(v.result==='done')userMap[v.user_id].done++}
    // Resolve names
    if(allUsers){for(var i=0;i<allUsers.length;i++){var u=allUsers[i];if(userMap[u.user_id]&&!userMap[u.user_id].name)userMap[u.user_id].name=u.display_name||u.email||u.user_id}}
    var html='';
    var keys=Object.keys(userMap);keys.sort(function(a,b){return userMap[b].count-userMap[a].count});
    for(var i=0;i<keys.length;i++){
      var um=userMap[keys[i]];
      var name=um.name||keys[i].substring(0,8);
      html+='<div class="fw-stat-card" style="margin-bottom:8px"><div class="stat-name">'+h(name)+'</div>'
        +'<div class="stat-bar"><div class="stat-fill" style="width:'+Math.round(um.done/um.count*100)+'%"></div></div>'
        +'<div class="stat-nums">总拜访 '+um.count+' 次 | 达成 '+um.done+' 次 | 达成率 '+Math.round(um.done/um.count*100)+'%</div></div>';
    }
    // Also show purpose breakdown
    var purpMap={};
    for(var i=0;i<data.length;i++){var p=data[i].purpose||'未分类';purpMap[p]=(purpMap[p]||0)+1}
    html+='<h4 style="margin:16px 0 8px;font-size:14px">🎯 拜访目的分布</h4>';
    var pkeys=Object.keys(purpMap);pkeys.sort(function(a,b){return purpMap[b]-purpMap[a]});
    for(var i=0;i<pkeys.length;i++){html+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>'+h(pkeys[i])+'</span><span style="color:var(--primary);font-weight:600">'+purpMap[pkeys[i]]+'</span></div>'}
    html+='<div style="margin-top:8px;font-size:13px;color:var(--text3)">总计 '+data.length+' 条拜访记录</div>';
    content.innerHTML=html;
    // Populate user dropdown
    var sel=document.getElementById('fw-stats-user');
    var opts='<option value="all">全部员工</option>';
    if(allUsers){for(var i=0;i<allUsers.length;i++){opts+='<option value="'+allUsers[i].user_id+'">'+h(allUsers[i].display_name||allUsers[i].email||allUsers[i].user_id.substring(0,8))+'</option>'}}
    sel.innerHTML=opts;
    sel.value=selUser;
  }catch(e){console.error(e);content.innerHTML='<div style="color:var(--danger)">加载失败</div>'}
}
'''

html = html[:last_script] + fw_js + html[last_script:]

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Done. File size:', len(html))
