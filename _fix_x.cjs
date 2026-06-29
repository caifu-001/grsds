const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// FIX 1: wfSetAssignee(2,\'value\', → wfSetAssignee('+idx+',\'value\',
// The raw bytes in the file are: wfSetAssignee(2,\'value\',this.value)
// Need to keep the backslash-escaped quotes around value intact
// Just replace 2, with '+idx+',
s = s.replace("wfSetAssignee(2,\\'value\\',this.value)", "wfSetAssignee('+idx+',\\\\'value\\\\',this.value)");
console.log('FIX1: done');

// FIX 2: GPS - find exact boundaries
let dc = s.indexOf('async function doCheckIn(type){');
let ov = s.indexOf('\nfunction openVisitForm', dc);
console.log('GPS bounds:', dc, ov, 'len', ov-dc);

// Build replacement with proper escaping
// These lines will be inserted into a JS script block which already exists in HTML
// The file contains JS source code, so inner quotes use \' notation
let newGPS = s.slice(dc, dc+34) + '\n' +
'  var note=document.getElementById(\\\'fw-checkin-note\\\').value.trim();\n' +
'  var addr=\\\'\\\';var label=type===\\\'in\\\'?\\\'上班签到\\\':\\\'下班签退\\\';\n' +
'  var btnEl=type===\\\'in\\\'?document.getElementById(\\\'fw-btn-in\\\'):document.getElementById(\\\'fw-btn-out\\\');\n' +
'  btnEl.disabled=true;btnEl.textContent=\\\'获取定位中...\\\';\n' +
'  var settled=false;\n' +
'  function resetBtn(){if(settled)return;settled=true;btnEl.disabled=false;btnEl.textContent=type===\\\'in\\\'?\\\'\\u{1f4cd} 上班签到\\\':\\\'\\u{1f3e0} 下班签退\\\'}\n' +
'  setTimeout(function(){if(!settled){resetBtn();showToast(\\\'\\u26a0\\ufe0f 定位超时(8秒)，正在无定位签到...\\\');doSaveCheckIn(null,null,type,note,addr);}},8000);\n' +
'  if(!navigator||!navigator.geolocation){resetBtn();showToast(\\\'\\u26a0\\ufe0f 浏览器不支持定位\\\');return;}\n' +
'  navigator.geolocation.getCurrentPosition(\n' +
'    function(pos){\n' +
'      if(settled)return;\n' +
'      var lat=pos.coords.latitude,lng=pos.coords.longitude;\n' +
'      if(isNaN(lat)||isNaN(lng)){resetBtn();showToast(\\\'\\u26a0\\ufe0f 坐标无效，正在无定位签到...\\\');doSaveCheckIn(null,null,type,note,addr);return;}\n' +
'      resetBtn();\n' +
'      showLocationConfirm(lat,lng,type===\\\'in\\\'?\\\'\\u{1f4cd} 上班签到 - 确认位置\\\':\\\'\\u{1f3e0} 下班签退 - 确认位置\\\',function(clat,clng){\n' +
'        doSaveCheckIn(clat,clng,type,note,addr);\n' +
'      });\n' +
'    },\n' +
'    function(err){\n' +
'      if(settled)return;resetBtn();\n' +
'      showToast(err.code===1?\\\'\\u26a0\\ufe0f 定位被拒绝，正在无定位签到...\\\':\\\'\\u26a0\\ufe0f GPS不可用，正在无定位签到...\\\');\n' +
'      doSaveCheckIn(null,null,type,note,addr);\n' +
'    },\n' +
'    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}\n' +
'  );\n' +
'}\n' +
'\n' +
'async function doSaveCheckIn(lat,lng,type,note,addr){\n' +
'  var label=type===\\\'in\\\'?\\\'上班签到\\\':\\\'下班签退\\\';\n' +
'  var btnEl=type===\\\'in\\\'?document.getElementById(\\\'fw-btn-in\\\'):document.getElementById(\\\'fw-btn-out\\\');\n' +
'  btnEl.disabled=true;btnEl.textContent=\\\'保存中...\\\';\n' +
'  try{\n' +
'    var b={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};\n' +
'    var r=await sb.from(\\\'field_checkins\\\').insert(b).select();\n' +
'    btnEl.disabled=false;btnEl.textContent=type===\\\'in\\\'?\\\'\\u{1f4cd} 上班签到\\\':\\\'\\u{1f3e0} 下班签退\\\';\n' +
'    if(r.error){showToast(label+\\\'失败: \\\'+r.error.message);return}\n' +
'    showToast(type===\\\'in\\\'?\\\'\\u2705 签到成功！\\\':(lat!=null?\\\'\\u{1f3e0} 签退成功！\\\':\\\'\\u{1f3e0} 签退成功！（无定位）\\\'));\n' +
'    document.getElementById(\\\'fw-checkin-note\\\').value=\\\'\\\';\n' +
'    loadFWCheckin();loadFWOverview();\n' +
'  }catch(e){btnEl.disabled=false;btnEl.textContent=type===\\\'in\\\'?\\\'\\u{1f4cd} 上班签到\\\':\\\'\\u{1f3e0} 下班签退\\\';console.error(e)}\n' +
'}\n';

s = s.slice(0, dc) + newGPS + s.slice(ov);
console.log('FIX2: replaced, new len', s.length);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

// Verify
let ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,150)); }
let o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
