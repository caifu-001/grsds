const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
let ls = s.lastIndexOf('<script>');
let le = s.lastIndexOf('</script>');
let js = s.slice(ls+8, le);

// BUG2: workflows tab
const b2old = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
const b2new = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
if (js.includes(b2old)) { js = js.replace(b2old, b2new); console.log('BUG2 fixed'); }
else { console.log('BUG2 NOT FOUND'); }

// BUG3a: hardcoded wfSetAssignee(2
const b3aold = "wfSetAssignee(2,\\'value\\',this.value)";
const b3anew = "wfSetAssignee('+idx+',\\\\'value\\\\',this.value)";
if (js.includes(b3aold)) { js = js.replace(b3aold, b3anew); console.log('BUG3a fixed'); }
else { console.log('BUG3a NOT FOUND, searching...'); let i=js.indexOf('wfSetAssignee(2,'); if(i>=0) console.log('found:', JSON.stringify(js.slice(i,i+50))); }

// BUG3b: staffId → "staffId"  
const b3bold = ",staffId,this.value)";
const b3bnew = ',"staffId",this.value)';
let cnt = 0;
while (js.includes(b3bold)) { js = js.replace(b3bold, b3bnew); cnt++; }
console.log('BUG3b replaced:', cnt);

// BUG1: GPS - find doCheckIn and replace
let dcIdx = js.indexOf('async function doCheckIn(');
let nxtIdx = js.indexOf('\nfunction openVisitForm', dcIdx);
console.log('doCheckIn boundaries:', dcIdx, nxtIdx, 'len', nxtIdx-dcIdx);

const gpsNew = `async function doCheckIn(type){
  var note=document.getElementById('fw-checkin-note').value.trim();
  var addr='';var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='获取定位中...';
  var finished=false;
  function finishBtn(){if(finished)return;finished=true;btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1f4cd} 上班签到':'\u{1f3e0} 下班签退';}
  setTimeout(function(){if(!finished){finishBtn();showToast('\u26a0\ufe0f 定位超时(8秒)，正在无定位签到...');doSaveCheckIn(null,null,type,note,addr);}},8000);
  if(!navigator||!navigator.geolocation){finishBtn();showToast('\u26a0\ufe0f 浏览器不支持定位');return;}
  navigator.geolocation.getCurrentPosition(
    function(pos){
      if(finished)return;
      var lat=pos.coords.latitude,lng=pos.coords.longitude;
      if(isNaN(lat)||isNaN(lng)){finishBtn();showToast('\u26a0\ufe0f 坐标无效，正在无定位签到...');doSaveCheckIn(null,null,type,note,addr);return;}
      finishBtn();
      showLocationConfirm(lat,lng,type==='in'?'\u{1f4cd} 上班签到 - 确认位置':'\u{1f3e0} 下班签退 - 确认位置',function(clat,clng){
        doSaveCheckIn(clat,clng,type,note,addr);
      });
    },
    function(err){
      if(finished)return;finishBtn();
      showToast(err.code===1?'\u26a0\ufe0f 定位被拒绝，正在无定位签到...':'\u26a0\ufe0f GPS不可用，正在无定位签到...');
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
    var body={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};
    var r=await sb.from('field_checkins').insert(body).select();
    btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1f4cd} 上班签到':'\u{1f3e0} 下班签退';
    if(r.error){showToast(label+'失败: '+r.error.message);return}
    showToast(type==='in'?'\u2705 签到成功！':(lat!=null?'\u{1f3e0} 签退成功！':'\u{1f3e0} 签退成功！（无定位）'));
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'\u{1f4cd} 上班签到':'\u{1f3e0} 下班签退';console.error(e)}
}`;
js = js.slice(0, dcIdx) + gpsNew + js.slice(nxtIdx);
console.log('BUG1 (GPS): replaced, delta', js.length - (s.slice(ls+8, le)).length);

s = s.slice(0, ls+8) + js + s.slice(le);
fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written', s.length);

try { let vm = require('vm'); new vm.Script(js); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0, 200)); }
let o = (s.match(/<div[\s>]/g)||[]).length, c = (s.match(/<\/div>/g)||[]).length;
console.log('Div:', o, c, 'diff:', o-c);
