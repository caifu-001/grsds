const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Initial:', s.length, 'bytes');

// === BUG 1: GPS ===
// doCheckIn: 928852 -> 933383 (openVisitForm)
let dcStart = s.indexOf('async function doCheckIn(');
let nextFn = s.indexOf('\nfunction openVisitForm', dcStart);
console.log('doCheckIn:', dcStart, '->', nextFn, 'len', nextFn-dcStart);

let newFn = `async function doCheckIn(type){
  var note=document.getElementById('fw-checkin-note').value.trim();
  var addr='';var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='获取定位中...';var finished=false;
  function finishBtn(){if(finished)return;finished=true;btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退'}
  setTimeout(function(){if(!finished){finishBtn();showToast('⚠️ 定位超时(8秒)，正在无定位签到...');doSaveCheckIn(null,null,type,note,addr);}},8000);
  if(!navigator||!navigator.geolocation){finishBtn();showToast('⚠️ 浏览器不支持定位');return;}
  navigator.geolocation.getCurrentPosition(
    function(pos){
      if(finished)return;
      var lat=pos.coords.latitude,lng=pos.coords.longitude;
      if(isNaN(lat)||isNaN(lng)){finishBtn();showToast('⚠️ 坐标无效，正在无定位签到...');doSaveCheckIn(null,null,type,note,addr);return;}
      finishBtn();
      showLocationConfirm(lat,lng,type==='in'?'📍 上班签到 - 确认位置':'🏠 下班签退 - 确认位置',function(clat,clng){
        doSaveCheckIn(clat,clng,type,note,addr);
      });
    },
    function(err){
      if(finished)return;finishBtn();
      showToast(err.code===1?'⚠️ 定位被拒绝，正在无定位签到...':'⚠️ GPS不可用，正在无定位签到...');
      doSaveCheckIn(null,null,type,note,addr);
    },
    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}
  );
}

async function doSaveCheckIn(lat,lng,type,note,addr){
  var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='保存中...';
  try{
    var b={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};
    var r=await sb.from('field_checkins').insert(b).select();
    btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';
    if(r.error){showToast(label+'失败: '+r.error.message);return}
    showToast(type==='in'?'✅ 签到成功！':(lat!=null?'🏠 签退成功！':'🏠 签退成功！（无定位）'));
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';console.error(e)}
}`;
s = s.slice(0, dcStart) + newFn + s.slice(nextFn);
console.log('BUG1 (GPS): replaced, +', newFn.length+nextFn-dcStart-s.length, 'bytes delta');

// === BUG 2: workflows tab ===
let oldWf = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
let newWf = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
if (s.includes(oldWf)) {
  s = s.replace(oldWf, newWf);
  console.log('BUG2 (workflows): replaced');
} else {
  console.log('BUG2: pattern NOT found');
}

// === BUG 3: wfSetAssignee hardcoded '2' ===
let oldAssign = "wfSetAssignee(2,\\'value\\',this.value)";
let newAssign = "wfSetAssignee('+idx+',\\\\'value\\\\',this.value)";
if (s.includes(oldAssign)) {
  s = s.replace(oldAssign, newAssign);
  console.log('BUG3a (hardcoded 2): fixed');
} else {
  console.log('BUG3a: NOT found, trying wider search');
  let idx3 = s.indexOf('wfSetAssignee(2,');
  if (idx3 > 0) console.log('  found variant at', idx3, ':', JSON.stringify(s.slice(idx3, idx3+50)));
}

// === BUG 4: staffId missing quotes ===
// In wfShowProps, the generated HTML has: h+='...staffId,this.value...'
// The raw pattern in file: ,staffId,this.value) (inside a JS string concat)
// Fix: ,"staffId",this.value)
let staffPat = ",staffId,this.value)";
let staffFix = ',"staffId",this.value)';
let cnt = 0;
while (s.includes(staffPat)) {
  s = s.replace(staffPat, staffFix);
  cnt++;
}
console.log('BUG3b (staffId quotes):', cnt, 'replaced');

// Also fix <option value=> → <option value="">
s = s.replace('<option value=>无</option>', '<option value="">无</option>');
console.log('option value fix');

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Final:', s.length, 'bytes');

// Verify
try {
  let vm = require('vm');
  let ls = s.lastIndexOf('<script>');
  let le = s.lastIndexOf('</script>');
  new vm.Script(s.slice(ls+8, le));
  console.log('JS: OK');
} catch(e) {
  console.log('JS FAIL:', e.message.substring(0, 150));
  let m = e.message.match(/at (\d+)/);
  if (m) {
    let jlines = s.slice(ls+8, le).split('\n');
    let el = parseInt(m[1]);
    for (let k = Math.max(0,el-3); k < Math.min(jlines.length, el+2); k++)
      console.log('  L'+(k+1)+':', jlines[k]?jlines[k].substring(0, 150):'');
  }
}
let o = (s.match(/<div[\s>]/g) || []).length;
let c = (s.match(/<\/div>/g) || []).length;
console.log('Div:', o, c, 'diff:', o-c);
