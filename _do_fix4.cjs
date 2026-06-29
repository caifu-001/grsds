const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// ============================================
// FIX 1: wfShowProps - 实时重新加载部门/角色
// ============================================
// 用 ByteSearch 找到准确的旧内容（带空行）
const targetBytes = Buffer.from('var panel=document.getElementById(\'wf-props-panel\');', 'utf8');
let fi = -1;
let searchFrom = 0;
while ((fi = s.indexOf('function wfShowProps', searchFrom)) > 0) {
  const has = s.indexOf(targetBytes, fi);
  if (has > 0 && has - fi < 50) break;
  searchFrom = fi + 1;
  fi = -1;
}
console.log('wfShowProps at:', fi);

if (fi > 0) {
  // Find the right insertion point: after `if(!panel)return;`
  const checkIdx = s.indexOf("if(!panel)return;", fi);
  const insertAt = checkIdx + "if(!panel)return;".length;
  
  const preload = `
  if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length){
    (async function(){
      try{
        var d=await sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name');
        if(!d.error)allDepartments=d.data||[];
        var r=await sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name');
        if(!r.error)allRoles=r.data||[];
        if(!allUsers||!allUsers.length){
          var ur=await fetch(SUPABASE_URL+'/rest/v1/profiles?select=*&company_id=eq.'+encodeURIComponent(currentCompanyId),{headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}});
          if(ur.ok){var ud=await ur.json();allUsers=ud;}
        }
      }catch(e){console.error('wfShowProps preload:',e)}
      wfShowProps(idx);
    })();
    panel.innerHTML='<p style="font-size:12px;color:var(--text2);padding:20px">加载中...</p>';
    return;
  }
`;
  
  s = s.slice(0, insertAt) + preload + s.slice(insertAt);
  console.log('FIX1: inserted preload block');
}

// ============================================
// FIX 2: 修复 wfShowProps 里的孤立 </label> (鎺堟潈閮ㄩ棬</label> → <label>鎺堟潈閮ㄩ棬</label>)
// ============================================
const oldDeptLabel = "h+='鎺堟潈閮ㄩ棬</label><select";
const newDeptLabel = "h+='<label>鎺堟潈閮ㄩ棬</label><select";
if (s.includes(oldDeptLabel)) {
  s = s.split(oldDeptLabel).join(newDeptLabel);
  console.log('FIX2: dept label fixed');
}

// ============================================
// FIX 3: 修复 wfRefreshStaffDD 里的乱码 "无" 选项
// ============================================
const oldStaffOpt = "dd.innerHTML='<option value=\"\">閺?/option>'";
const newStaffOpt = "dd.innerHTML='<option value=\"\">--</option>'";
if (s.includes(oldStaffOpt)) {
  s = s.split(oldStaffOpt).join(newStaffOpt);
  console.log('FIX3: staff opt label fixed');
}

// Also fix the main select default option text in wfShowProps
const oldDeptOpt = "h+='<label>鎺堟潈閮ㄩ棬</label><select onchange=\"wfSetAssignee('+idx+',\\'value\\',this.value)\"><option value=\"\">鏃?/option>'";
// We can use the new version
const newDeptOpt = "h+='<label>鎺堟潈閮ㄩ棬</label><select onchange=\"wfSetAssignee('+idx+',\\'value\\',this.value)\"><option value=\"\">--</option>'";
if (s.includes(oldDeptOpt)) {
  s = s.split(oldDeptOpt).join(newDeptOpt);
  console.log('FIX3b: dept default option text fixed');
}

// Also fix the approval role select default
const oldApprOpt = "h+='<label>瀹℃壒浜鸿鑹?/label><select onchange=\"wfSetApproval('+idx+',\\'approverRole\\',this.value)\"><option value=\"\">鏃?/option>';";
const newApprOpt = "h+='<label>瀹℃壒浜鸿鑹?/label><select onchange=\"wfSetApproval('+idx+',\\'approverRole\\',this.value)\"><option value=\"\">--</option>';";
if (s.includes(oldApprOpt)) {
  s = s.split(oldApprOpt).join(newApprOpt);
  console.log('FIX3c: approver role default option text fixed');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

// Verify
const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
console.log('Size:', s.length);
