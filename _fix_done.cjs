const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Baseline:', s.length);

// === FIX 1: wfSetAssignee(2, -> wfSetAssignee('+idx+', ===
let old1 = "wfSetAssignee(2,\\'value\\',this.value)";
let new1 = "wfSetAssignee('+idx+','value',this.value)";
if (s.includes(old1)) {
  s = s.replace(old1, new1);
  console.log('FIX1 (assignee 2): applied');
} else {
  console.log('FIX1: NOT FOUND');
}

// === FIX 2: doCheckIn rewrite ===
let dc = s.indexOf('async function doCheckIn(type){');
let ov = s.indexOf('\nfunction openVisitForm', dc);
console.log('GPS: old', dc, '-', ov, 'len', ov-dc);

let newGPS = 'async function doCheckIn(type){' +
'  var note=document.getElementById(\'fw-checkin-note\').value.trim();' +
'  var addr="";var label=type==="in"?"上班签到":"下班签退";' +
'  var btnEl=type==="in"?document.getElementById("fw-btn-in"):document.getElementById("fw-btn-out");' +
'  btnEl.disabled=true;btnEl.textContent="获取定位中...";' +
'  var settled=false;' +
'  function resetBtn(){if(settled)return;settled=true;btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退"}' +
'  setTimeout(function(){if(!settled){resetBtn();showToast("⚠️ 定位超时(8秒)，正在无定位签到...");doSaveCheckIn(null,null,type,note,addr);}},8000);' +
'  if(!navigator||!navigator.geolocation){resetBtn();showToast("⚠️ 浏览器不支持定位");return;}' +
'  navigator.geolocation.getCurrentPosition(' +
'    function(pos){' +
'      if(settled)return;' +
'      var lat=pos.coords.latitude,lng=pos.coords.longitude;' +
'      if(isNaN(lat)||isNaN(lng)){resetBtn();showToast("⚠️ 坐标无效，正在无定位签到...");doSaveCheckIn(null,null,type,note,addr);return;}' +
'      resetBtn();' +
'      showLocationConfirm(lat,lng,type==="in"?"📍 上班签到 - 确认位置":"🏠 下班签退 - 确认位置",function(clat,clng){' +
'        doSaveCheckIn(clat,clng,type,note,addr);' +
'      });' +
'    },' +
'    function(err){' +
'      if(settled)return;resetBtn();' +
'      showToast(err.code===1?"⚠️ 定位被拒绝，正在无定位签到...":"⚠️ GPS不可用，正在无定位签到...");' +
'      doSaveCheckIn(null,null,type,note,addr);' +
'    },' +
'    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}' +
'  );' +
'}\n\n' +
'async function doSaveCheckIn(lat,lng,type,note,addr){' +
'  var label=type==="in"?"上班签到":"下班签退";' +
'  var btnEl=type==="in"?document.getElementById("fw-btn-in"):document.getElementById("fw-btn-out");' +
'  btnEl.disabled=true;btnEl.textContent="保存中...";' +
'  try{' +
'    var b={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};' +
'    var r=await sb.from("field_checkins").insert(b).select();' +
'    btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退";' +
'    if(r.error){showToast(label+"失败: "+r.error.message);return}' +
'    showToast(type==="in"?"✅ 签到成功！":(lat!=null?"🏠 签退成功！":"🏠 签退成功！（无定位）"));' +
'    document.getElementById("fw-checkin-note").value="";' +
'    loadFWCheckin();loadFWOverview();' +
'  }catch(e){btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退";console.error(e)}' +
'}\n';

s = s.slice(0, dc) + newGPS + s.slice(ov);
console.log('FIX2 (GPS): replaced, delta', (dc+newGPS.length+(s.length-ov)) - fs.statSync('D:/1kaifa/grsds/index.html').size);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Written:', s.length);

// Verify
let ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,120)); }
let od=(s.match(/<div[\s>]/g)||[]).length, cd=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',od,cd,od-cd);
