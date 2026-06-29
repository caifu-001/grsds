const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find doCheckIn start
const start = s.indexOf('async function doCheckIn(type){');
const gpsEnd = s.indexOf('\n      gotLocation=true;', start);
const afterConfirm = s.indexOf('\n      showLocationConfirm(lat,lng', gpsEnd);

// The old block from GPS success to catch
const oldBlock = s.slice(gpsEnd, afterConfirm + 2000);

// Build replacement: skip showLocationConfirm, directly insert
const newBlock = `
      gotLocation=true;
      // 直接签到，跳过地图确认弹窗
      window._fwPendingType=type;
      var r=await sb.from('field_checkins').insert({user_id:currentUser.id,type:type,latitude:lat,longitude:lng,address:addr,note:note||null,company_id:currentCompanyId}).select();
      if(r.error){showToast('签到失败: '+r.error.message);fwResetBtn(type);return}
      showToast(type==='in'?'✅ 签到成功！位置已记录':'🏠 签退成功，辛苦了！');
      document.getElementById('fw-checkin-note').value='';
      loadFWCheckin();loadFWOverview();
      fwResetBtn(type);
      return;
    }catch(g){
      console.warn('[GPS] doCheckIn failed:',g.message||g,'code:',g.code);
      if(g.code===1)showToast('⚠️ 定位被拒绝，请在浏览器设置中允许定位权限');
      else if(g.code===2)showToast('⚠️ 定位不可用，请检查GPS/WiFi');
      else if(g.code===3)showToast('⚠️ 定位超时（8秒）');
      else showToast('⚠️ 定位失败: '+(g.message||'未知'));
      fwResetBtn(type);
      return;
    }
  }
  if(!gotLocation){`;

// Find the end of the old showLocationConfirm callback
const catchStart = s.indexOf('\n    }catch(g){', gpsEnd);
const noLocStart = s.indexOf('\n  if(!gotLocation){', catchStart);

// Replace from gotLocation line to if(!gotLocation)
const oldSection = s.slice(gpsEnd, noLocStart);
s = s.slice(0, gpsEnd) + newBlock + s.slice(noLocStart);

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');
console.log('Replaced section, new size:', s.length);

// Verify
const check = require('fs').readFileSync('D:/1kaifa/grsds/index.html', 'utf8');
console.log('Has showLocationConfirm after doCheckIn:', check.indexOf('showLocationConfirm', start) < (check.indexOf('\n  if(!gotLocation){', start) || check.length));
console.log('Has fwResetBtn:', check.includes('fwResetBtn(type);return'));
