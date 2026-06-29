import re, sys

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    s = f.read()

print(f"Original size: {len(s)}")

# === BUG 3: staffId missing quotes ===
# Pattern: wfSetAssignee('+idx+',staffId,this.value)
cnt3 = 0
def fix_staffid(m):
    global cnt3
    cnt3 += 1
    return m.group(0).replace(',staffId,', ",'staffId',")
s = re.sub(r"wfSetAssignee\('\+\w+\+',staffId,", fix_staffid, s)
print(f"BUG 3 (staffId quotes): {cnt3} fixed")

# === BUG 3b: id= and onchange= attributes missing quotes ===
# In wfShowProps, the generated HTML for staff dropdown uses id=wf-staff-dd- and onchange=wfSetAssignee
# These are JS string concatenations so the attributes lack outer quotes in generated HTML
# id=wf-staff-dd-'+idx+' → id="wf-staff-dd-'+idx+'"
cnt3b = 0
s = s.replace("id=wf-staff-dd-'+idx+'", "id=\"wf-staff-dd-'\" + idx + \"'\"")
cnt3b += 1
# onchange=wfSetAssignee needs quotes around the whole attribute value
s = s.replace("onchange=wfSetAssignee('+idx+','staffId',", "onchange=\"wfSetAssignee('+idx+','staffId',")
cnt3b += 1
# Also the <option value=> needs quotes
s = s.replace("<option value=>", "<option value=\"\">")
cnt3b += 1

# Fix onchange closing - need quote before >
# Find pattern: ,this.value)> → ,this.value)\">
# Actually the onchange string is: onchange="wfSetAssignee('+idx+','staffId',this.value)>
# which is missing the closing "
s = s.replace(",this.value)><option", ",this.value)\"><option")
cnt3b += 1
print(f"BUG 3b (HTML attr quotes): {cnt3b} fixed")

# === BUG 2: workflows tab loadAdminData ===
old2 = "else if(tab==='workflows'){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');renderWorkflowTemplates();}"
new2 = "else if(tab==='workflows'){(async function(){var wf=document.getElementById('admin-workflows');wf.classList.remove('hidden');subs[12].classList.add('active');if(!allRoles||!allRoles.length)await loadAdminData();if(!allDepartments||!allDepartments.length)await loadAdminData();renderWorkflowTemplates();})();}"
if old2 in s:
    s = s.replace(old2, new2)
    print("BUG 2 (workflows allRoles): applied")
else:
    print("BUG 2: NOT FOUND")
    # Try finding just the tab branch
    idx = s.find("tab==='workflows'")
    if idx > 0:
        print(f"  found at {idx}: {s[idx:idx+150]}")

# === BUG 1: GPS - replace doCheckIn ===
# Find the start marker
dc_start = s.find('async function doCheckIn(type){')
if dc_start < 0:
    print("doCheckIn NOT FOUND")
else:
    # Find end marker - next function after doCheckIn
    rest = s[dc_start+30:]
    # Find the next top-level function
    m = re.search(r'\n(async )?function \w+\(', rest)
    if m:
        dc_end = dc_start + 30 + m.start()
        print(f"doCheckIn: {dc_start}..{dc_end} ({dc_end - dc_start} chars)")
    else:
        print("No next function found after doCheckIn")
        dc_end = None

    if dc_end:
        new_dc = """async function doCheckIn(type){
  var note=document.getElementById('fw-checkin-note').value.trim();
  var addr='';
  var label=type==='in'?'上班签到':'下班签退';
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  btnEl.disabled=true;btnEl.textContent='获取定位中...';
  var settled=false;
  var cleanup=function(){settled=true;btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退'};
  var hardTimer=setTimeout(function(){
    if(!settled){cleanup();showToast('⚠️ 定位超时(8秒)，正在无定位签到...');doCheckInNoGPS(type,note,addr,label);}
  },8000);
  if(!navigator||!navigator.geolocation){
    clearTimeout(hardTimer);cleanup();showToast('⚠️ 浏览器不支持定位');return;
  }
  navigator.geolocation.getCurrentPosition(
    function(pos){
      if(settled)return;
      var lat=pos.coords.latitude,lng=pos.coords.longitude;
      if(isNaN(lat)||isNaN(lng)){clearTimeout(hardTimer);cleanup();showToast('⚠️ 坐标无效，正在无定位签到...');doCheckInNoGPS(type,note,addr,label);return;}
      clearTimeout(hardTimer);cleanup();
      window._fwPendingType=type;
      showLocationConfirm(lat,lng,type==='in'?'📍 上班签到 - 确认位置':'🏠 下班签退 - 确认位置',async function(clat,clng){
        window._fwPendingType=null;
        btnEl.disabled=true;btnEl.textContent='保存中...';
        try{
          var r=await sb.from('field_checkins').insert({user_id:currentUser.id,type:type,latitude:clat,longitude:clng,address:addr,note:note||null,company_id:currentCompanyId}).select();
          btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';
          if(r.error){showToast(label+'失败: '+r.error.message);return}
          showToast(type==='in'?'✅ 签到成功！':'🏠 签退成功，辛苦了！');
          document.getElementById('fw-checkin-note').value='';
          loadFWCheckin();loadFWOverview();
        }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';showToast(label+'失败: '+(e.message||e));console.error(e)}
      });
    },
    function(err){
      if(settled)return;
      clearTimeout(hardTimer);cleanup();
      if(err.code===1)showToast('⚠️ 定位被拒绝，正在无定位签到...');
      else showToast('⚠️ GPS不可用，正在无定位签到...');
      doCheckInNoGPS(type,note,addr,label);
    },
    {timeout:7000,enableHighAccuracy:true,maximumAge:60000}
  );
}

async function doCheckInNoGPS(type,note,addr,label){
  var btnEl=type==='in'?document.getElementById('fw-btn-in'):document.getElementById('fw-btn-out');
  try{
    var r=await sb.from('field_checkins').insert({user_id:currentUser.id,type:type,latitude:null,longitude:null,address:addr,note:note||null,company_id:currentCompanyId}).select();
    btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';
    if(r.error){showToast(label+'失败: '+r.error.message);return}
    showToast(type==='in'?'✅ 签到成功！（无定位）':'🏠 签退成功！（无定位）');
    document.getElementById('fw-checkin-note').value='';
    loadFWCheckin();loadFWOverview();
  }catch(e){btnEl.disabled=false;btnEl.textContent=type==='in'?'📍 上班签到':'🏠 下班签退';showToast(label+'失败: '+(e.message||e));console.error(e)}
}"""
        s = s[:dc_start] + new_dc + s[dc_end:]
        print(f"BUG 1 (GPS): replaced, new fn {len(new_dc)} chars")

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(s)

print(f"Written: {len(s)} bytes")

# Quick checks
import subprocess
result = subprocess.run(['node', '_syntax_check.js'], cwd=r'D:\1kaifa\grsds', capture_output=True, text=True)
print(result.stdout)
print(result.stderr[:200] if result.stderr else '')
