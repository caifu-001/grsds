const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// === BUG 1: GPS - replace doCheckIn ===
let dcStart = s.indexOf('async function doCheckIn(type){');
let dcEnd = s.indexOf('\nasync function loadFWVisits', dcStart);
if (dcEnd < 0) dcEnd = s.indexOf('\nfunction loadFWTrack', dcStart);
if (dcStart > 0 && dcEnd > 0) {
  let newFn = `async function doCheckIn(type){
  var note=document.getElementById('fw-checkin-note').value.trim();
  var addr='';var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='获取定位中...';
  var finished=false;
  function finish(){if(finished)return;finished=true;btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退'}
  // 8s硬超时兜底——绝不卡死
  setTimeout(function(){if(!finished){finish();showToast('⚠️ 定位超时，正在无定位签到...');doSaveCheckIn(null,null,type,note,addr);}},8000);
  if(!navigator||!navigator.geolocation){finish();showToast('⚠️ 浏览器不支持定位');return;}
  navigator.geolocation.getCurrentPosition(
    function(pos){
      if(finished)return;
      var lat=pos.coords.latitude,lng=pos.coords.longitude;
      if(isNaN(lat)||isNaN(lng)){finish();showToast('⚠️ 坐标无效，无定位签到...');doSaveCheckIn(null,null,type,note,addr);return;}
      finish();
      showLocationConfirm(lat,lng,type==='in'?'📍 上班签到 - 确认位置':'🏠 下班签退 - 确认位置',function(clat,clng){
        doSaveCheckIn(clat,clng,type,note,addr);
      });
    },
    function(err){
      if(finished)return;finish();
      showToast(err.code===1?'⚠️ 定位被拒绝，无定位签到...':'⚠️ GPS不可用，无定位签到...');
      doSaveCheckIn(null,null,type,note,addr);
    },
    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}
  );
}

async function doSaveCheckIn(lat,lng,type,note,addr){
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='保存中...';
  try{
    var body={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};
    var r=await sb.from('field_checkins').insert(body).select();
    btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';
    if(r.error){showToast('签到失败: '+r.error.message);return}
    showToast(type==='in'?'✅ 签到成功！':lat!=null?'🏠 签退成功！':'🏠 签退成功！（无定位）');
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';console.error(e)}
}`;
  s = s.slice(0, dcStart) + newFn + s.slice(dcEnd);
  console.log('BUG 1 (GPS): replaced', dcEnd-dcStart, '->', newFn.length, 'chars');
}

// === BUG 2: workflows tab loadAdminData ===
let swOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
let swNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
if (s.includes(swOld)) {
  s = s.replace(swOld, swNew);
  console.log('BUG 2 (roles): applied');
} else { console.log('BUG 2: not found'); }

// === BUG 3: staffId -> "staffId" in generated HTML ===
// In wfShowProps: ,staffId,this.value  →  ,"staffId",this.value
// The raw file has ',staffId,' inside JS string concat (between ' delimiters)
// Changing to ',"staffId",' makes staffId a string in the generated HTML onchange
let cnt3 = 0;
let pat3 = ",staffId,this.value)";
let fix3 = ',\\"staffId\\",this.value)';
// Wait, in Node string: ',\\"staffId\\",'  produces: ,\"staffId\",
// But I need the raw file to contain: ,"staffId",
// So: ',"staffId",' — that works because I'm using " to delimit the Node string
// The inner " are just regular characters
let fix3b = ',"staffId",this.value)';
while (s.includes(pat3)) {
  s = s.replace(pat3, fix3b);
  cnt3++;
}
console.log('BUG 3 (staffId):', cnt3, 'occurrences');

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written', s.length);

// Verify
try {
  let vm = require('vm');
  let ls = s.lastIndexOf('<script>');
  let le = s.lastIndexOf('</script>');
  new vm.Script(s.slice(ls+8, le));
  console.log('JS: OK');
} catch(e) { console.log('JS FAIL:', e.message.substring(0, 100)); }

let o = (s.match(/<div[\s>]/g) || []).length;
let c = (s.match(/<\/div>/g) || []).length;
console.log('Div:', o, c, 'diff:', o - c);
