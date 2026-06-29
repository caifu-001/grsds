const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// === 1 === GPS: replace doCheckIn entire function
// Old fn marker and next fn
let pos = s.indexOf('async function doCheckIn(type){');
let end = s.indexOf('\nfunction openVisitForm', pos);
let gps = 'async function doCheckIn(type){\n'+
'  var note=document.getElementById(\'fw-checkin-note\').value.trim();\n'+
'  var addr="";var label=type==="in"?"上班签到":"下班签退";\n'+
'  var btnEl=type==="in"?document.getElementById("fw-btn-in"):document.getElementById("fw-btn-out");\n'+
'  btnEl.disabled=true;btnEl.textContent="获取定位中...";\n'+
'  var finished=false;\n'+
'  function finishBtn(){if(finished)return;finished=true;btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退"}\n'+
'  setTimeout(function(){if(!finished){finishBtn();showToast("⚠️ 定位超时(8秒)，正在无定位签到...");doSaveCheckIn(null,null,type,note,addr);}},8000);\n'+
'  if(!navigator||!navigator.geolocation){finishBtn();showToast("⚠️ 浏览器不支持定位");return;}\n'+
'  navigator.geolocation.getCurrentPosition(\n'+
'    function(pos){\n'+
'      if(finished)return;\n'+
'      var lat=pos.coords.latitude,lng=pos.coords.longitude;\n'+
'      if(isNaN(lat)||isNaN(lng)){finishBtn();showToast("⚠️ 坐标无效，正在无定位签到...");doSaveCheckIn(null,null,type,note,addr);return;}\n'+
'      finishBtn();\n'+
'      showLocationConfirm(lat,lng,type==="in"?"📍 上班签到 - 确认位置":"🏠 下班签退 - 确认位置",function(clat,clng){\n'+
'        doSaveCheckIn(clat,clng,type,note,addr);\n'+
'      });\n'+
'    },\n'+
'    function(err){\n'+
'      if(finished)return;finishBtn();\n'+
'      showToast(err.code===1?"⚠️ 定位被拒绝，正在无定位签到...":"⚠️ GPS不可用，正在无定位签到...");\n'+
'      doSaveCheckIn(null,null,type,note,addr);\n'+
'    },\n'+
'    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}\n'+
'  );\n'+
'}\n'+
'\n'+
'async function doSaveCheckIn(lat,lng,type,note,addr){\n'+
'  var label=type==="in"?"上班签到":"下班签退";\n'+
'  var btnEl=type==="in"?document.getElementById("fw-btn-in"):document.getElementById("fw-btn-out");\n'+
'  btnEl.disabled=true;btnEl.textContent="保存中...";\n'+
'  try{\n'+
'    var b={user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId};\n'+
'    var r=await sb.from("field_checkins").insert(b).select();\n'+
'    btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退";\n'+
'    if(r.error){showToast(label+"失败: "+r.error.message);return}\n'+
'    showToast(type==="in"?"✅ 签到成功！":(lat!=null?"🏠 签退成功！":"🏠 签退成功！（无定位）"));\n'+
'    document.getElementById("fw-checkin-note").value="";\n'+
'    loadFWCheckin();loadFWOverview();\n'+
'  }catch(e){btnEl.disabled=false;btnEl.textContent=type==="in"?"📍 上班签到":"🏠 下班签退";console.error(e)}\n'+
'}\n';
console.log('GPS: pos', pos, 'end', end, 'oldlen', end-pos, 'newlen', gps.length);
s = s.slice(0, pos) + gps + s.slice(end);

// === 2 === workflows tab
let wfOld = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}";
let wfNew = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length||!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}";
if (s.includes(wfOld)) { s = s.replace(wfOld, wfNew); console.log('Workflows: fixed'); }
else { console.log('Workflows: NOT FOUND'); }

// === 3a === hardcoded 2 in wfSetAssignee
let aOld = "wfSetAssignee(2,\\'value\\',this.value)";
let aNew = "wfSetAssignee('+idx+',\\\\'value\\\\',this.value)";
if (s.includes(aOld)) { s = s.replace(aOld, aNew); console.log('Assignee 2: fixed'); }
else { console.log('Assignee 2: NOT FOUND'); }

// === 3b === staffId quotes
s = s.replace(",staffId,this.value)", ',"staffId",this.value)');
console.log('staffId: replaced');

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Size:', s.length);

// Verify JS
let ls = s.lastIndexOf('<script>');
let le = s.lastIndexOf('</script>');
let js = s.slice(ls+8, le);
try { require('vm').Script; new (require('vm').Script)(js); console.log('JS: OK'); }
catch(e) { console.log('JS FAIL:', e.message.substring(0,100)); }
let od = (s.match(/<div[\s>]/g)||[]).length;
let cd = (s.match(/<\/div>/g)||[]).length;
console.log('Div:', od, cd, od-cd);
