import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0
orig_size = len(html.encode('utf-8'))

# === 1. HTML: Change lf-name to readonly, forced client-library-only ===
old_name = '<input id="lf-name" placeholder="搜索或输入公司名称..." autocomplete="off" oninput="onLeadCompanyInput()" onkeydown="onLeadCompanyKey(event)">'
new_name = '<input id="lf-name" placeholder="🔍 搜索客户库选择公司..." autocomplete="off" oninput="onLeadCompanyInput()" onkeydown="onLeadCompanyKey(event)">'
if old_name in html:
    html = html.replace(old_name, new_name, 1)
    print("[OK] 1a. lf-name placeholder updated")
else:
    print("[ERR] 1a. lf-name placeholder not found")

# === 2. HTML: Contact fields → readonly + disabled, auto-fill from client ===
old_contact_name = '<input id="lf-contact-name" placeholder="输入姓名搜索已有联系人..." autocomplete="off" oninput="onLeadContactInput()" onkeydown="onLeadContactKey(event)">'
new_contact_name = '<input id="lf-contact-name" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
if old_contact_name in html:
    html = html.replace(old_contact_name, new_contact_name, 1)
    print("[OK] 1b. lf-contact-name → readonly")
else:
    print("[ERR] 1b. lf-contact-name not found")

old_contact_phone = '<input id="lf-contact-phone" placeholder="手机号">'
new_contact_phone = '<input id="lf-contact-phone" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
if old_contact_phone in html:
    html = html.replace(old_contact_phone, new_contact_phone, 1)
    print("[OK] 1c. lf-contact-phone → readonly")
else:
    print("[ERR] 1c. lf-contact-phone not found")

old_contact_email = '<input id="lf-contact-email" placeholder="邮箱">'
new_contact_email = '<input id="lf-contact-email" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
if old_contact_email in html:
    html = html.replace(old_contact_email, new_contact_email, 1)
    print("[OK] 1d. lf-contact-email → readonly")
else:
    print("[ERR] 1d. lf-contact-email not found")

# === 3. Remove contact suggestions div (no longer needed) ===
old_contact_sugg = '<div class="name-suggestions hidden" id="lead-contact-suggestions"></div>'
if old_contact_sugg in html:
    html = html.replace(old_contact_sugg, '', 1)
    print("[OK] 2. Removed lead-contact-suggestions div")
else:
    print("[ERR] 2. lead-contact-suggestions not found")

# === 4. Rewrite onLeadCompanyInput — only search allClients (not allCompanies) ===
old_comp_input = '''function onLeadCompanyInput(){
  var inp=document.getElementById('lf-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  // 输入时实时匹配客户库
  var ci=document.getElementById('lf-client-id');
  if(allClients&&allClients.length){var mc=allClients.find(function(cl){return cl.name&&cl.name.toLowerCase()===val});ci.value=mc?mc.id:'';}
  var matches=[],seen={};
  for(var i=0;i<allCompanies.length;i++){
    var c=allCompanies[i];var cn=(c.name||'').toLowerCase();
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){seen[cn]=1;matches.push(c)}
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.base||c.legal_person||'')+'</div></div>'}).join('');
  dd.classList.remove('hidden');
}'''

new_comp_input = '''function onLeadCompanyInput(){
  var inp=document.getElementById('lf-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  // 客户库懒加载
  if(!allClients||!allClients.length){
    sb.from('clients').select('*').eq('company_id',currentCompanyId).order('name').then(function(r){if(r.data){allClients=r.data;onLeadCompanyInput()}});
    return;
  }
  var matches=[];
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i];var cn=(c.name||'').toLowerCase();
    if(cn.indexOf(val)>=0)matches.push(c);
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  var clientIdxMap={};
  for(var j=0;j<matches.length;j++)clientIdxMap[matches[j].id]=j;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.industry||'')+(c.address?' · '+escHtml(c.address).substring(0,15):'')+'</div></div>'}).join('');
  dd.classList.remove('hidden');
}'''

if old_comp_input in html:
    html = html.replace(old_comp_input, new_comp_input, 1)
    print("[OK] 3. Rewrote onLeadCompanyInput (allClients only)")
else:
    print("[ERR] 3. onLeadCompanyInput not found")

# === 5. Rewrite selectLeadCompany — auto-fill ALL contact/client fields ===
old_select_comp = '''async function selectLeadCompany(idx){
  var c=leadCompSuggList[idx];if(!c)return;
  document.getElementById('lf-name').value=c.name;
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  if(c.industry)document.getElementById('lf-industry').value=c.industry;
  if(c.scale)document.getElementById('lf-scale').value=c.scale;
  // 自动匹配客户库（懒加载）
  if(!allClients||!allClients.length){try{var {data}=await sb.from('clients').select('id,name').eq('company_id',currentCompanyId).order('name');if(data)allClients=data;}catch(e){}}
  var cnLower=c.name.toLowerCase();
  var client=(allClients||[]).find(function(cl){return cl.name&&cl.name.toLowerCase()===cnLower});
  document.getElementById('lf-client-id').value=client?client.id:'';
}'''

new_select_comp = '''function selectLeadCompany(idx){
  var client=leadCompSuggList[idx];if(!client)return;
  document.getElementById('lf-name').value=client.name||'';
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  // 锁定 client_id
  document.getElementById('lf-client-id').value=client.id||'';
  // 自动填充客户信息
  if(client.industry)document.getElementById('lf-industry').value=client.industry;
  if(client.scale)document.getElementById('lf-scale').value=client.scale;
  if(client.credit_code)document.getElementById('lf-credit-code').value=client.credit_code;
  if(client.address)document.getElementById('lf-address')?document.getElementById('lf-address').value=client.address:null;
  // 客户类型
  if(client.type){try{var types=JSON.parse(client.type);if(Array.isArray(types)&&types.length){document.getElementById('lf-customer-type').value=types[0]==='B2B企业客户'?'B2B':types[0]==='B2C个人客户'?'B2C':''}}catch(e){}}
  // 自动填充联系人（第一个联系人）
  var contacts=[];
  try{contacts=JSON.parse(client.contacts||'[]')}catch(e){contacts=client.contacts||[]}
  if(!Array.isArray(contacts))contacts=[];
  if(contacts.length>0){
    document.getElementById('lf-contact-name').value=contacts[0].name||'';
    document.getElementById('lf-contact-phone').value=contacts[0].phone||'';
    document.getElementById('lf-contact-email').value=contacts[0].email||'';
  } else {
    document.getElementById('lf-contact-name').value='';
    document.getElementById('lf-contact-phone').value='';
    document.getElementById('lf-contact-email').value='';
  }
  // 归属销售默认填充当前用户
  if(!document.getElementById('lf-assigned-sales').value){
    document.getElementById('lf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  }
}'''

# Need async version? Not anymore. But the old version had `async`. Let's check for exact match.
# The old function body begins with "async function selectLeadCompany"
if old_select_comp in html:
    html = html.replace(old_select_comp, new_select_comp, 1)
    print("[OK] 4. Rewrote selectLeadCompany (full client auto-fill)")
else:
    # Try without async
    old_select_noasync = '''function selectLeadCompany(idx){
  var c=leadCompSuggList[idx];if(!c)return;
  document.getElementById('lf-name').value=c.name;
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  if(c.industry)document.getElementById('lf-industry').value=c.industry;
  if(c.scale)document.getElementById('lf-scale').value=c.scale;
  // 自动匹配客户库（懒加载）
  if(!allClients||!allClients.length){try{var {data}=await sb.from('clients').select('id,name').eq('company_id',currentCompanyId).order('name');if(data)allClients=data;}catch(e){}}
  var cnLower=c.name.toLowerCase();
  var client=(allClients||[]).find(function(cl){return cl.name&&cl.name.toLowerCase()===cnLower});
  document.getElementById('lf-client-id').value=client?client.id:'';
}'''
    if old_select_noasync in html:
        html = html.replace(old_select_noasync, new_select_comp, 1)
        print("[OK] 4. Rewrote selectLeadCompany (no-async version)")
    else:
        print("[ERR] 4. selectLeadCompany not found in either form")

# === 6. Update Lead Contact Input — change to client-dropdown selector ===
# The current function still exists, let's simplify it: when user clicks on contact-name (now readonly),
# show a dropdown of the selected client's contacts
old_contact_input = '''// === Lead Contact Autocomplete (from existing clients) ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactInput(){
  var inp=document.getElementById('lf-contact-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-contact-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  var matches=[],seen={};
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];var cn=(co.name||'').toLowerCase();
    var key=cn+'|'+co.client_id;
    if(cn&&cn.indexOf(val)>=0&&!seen[key]){
      seen[key]=1;
      var cl=allClients.find(function(x){return x.id===co.client_id});
      var phones='';
      try{var ph=JSON.parse(co.phone||'[]');if(ph.length)phones=ph[0]}catch(e){phones=co.phone||''}
      var emails='';
      try{var em=JSON.parse(co.email||'[]');if(em.length)emails=em[0]}catch(e){emails=co.email||''}
      matches.push({name:co.name,phone:phones,email:emails,clientName:cl?cl.name:'',dept:co.dept||'',position:co.position||''});
    }
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  leadContactSuggList=matches;leadContactSuggIdx=-1;
  dd.innerHTML=matches.map(function(m,i){return '<div class="name-suggestion'+(i===leadContactSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadContact('+i+')"><div><div class="ns-name">'+escHtml(m.name)+'</div><div class="ns-detail">'+escHtml(m.clientName)+(m.position?' · '+escHtml(m.position):'')+(m.phone?' · '+escHtml(m.phone):'')+'</div></div></div>'}).join('');
  dd.classList.remove('hidden');
}'''

new_contact_input = '''// === Lead Contact picker — from selected client's contacts only ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactPicker(){
  var clientId=document.getElementById('lf-client-id').value;
  if(!clientId){showToast('请先选择客户');return}
  if(!allClients||!allClients.length){showToast('客户数据未加载');return}
  var client=allClients.find(function(c){return c.id===clientId});
  if(!client){showToast('未找到关联客户');return}
  var contacts=[];
  try{contacts=JSON.parse(client.contacts||'[]')}catch(e){contacts=client.contacts||[]}
  if(!Array.isArray(contacts))contacts=[];
  if(contacts.length<=1){showToast('该客户只有一个联系人');return}
  leadContactSuggList=contacts;
  var html='';
  for(var i=0;i<contacts.length;i++){
    var ct=contacts[i];
    html+='<div class="name-suggestion" style="cursor:pointer;padding:8px 12px;border-bottom:1px solid var(--border)" onmousedown="selectLeadContact('+i+')"><div class="ns-name">'+escHtml(ct.name||'')+'</div><div class="ns-detail">📞 '+escHtml(ct.phone||'')+(ct.email?' · 📧 '+escHtml(ct.email):'')+(ct.title?' · '+escHtml(ct.title):'')+'</div></div>';
  }
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd){dd.innerHTML=html;dd.classList.remove('hidden');}
}'''

if old_contact_input in html:
    html = html.replace(old_contact_input, new_contact_input, 1)
    print("[OK] 5. Rewrote contact picker (client-contacts only)")
else:
    print("[ERR] 5. Lead Contact Autocomplete not found")

# === 7. Update selectLeadContact ===
old_select_contact = '''function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  document.getElementById('lf-contact-name').value=m.name;
  document.getElementById('lead-contact-suggestions').classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
  if(m.phone)document.getElementById('lf-contact-phone').value=m.phone;
  if(m.email)document.getElementById('lf-contact-email').value=m.email;
}'''

new_select_contact = '''function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  document.getElementById('lf-contact-name').value=m.name||'';
  document.getElementById('lf-contact-phone').value=m.phone||'';
  document.getElementById('lf-contact-email').value=m.email||'';
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd)dd.classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
}'''

if old_select_contact in html:
    html = html.replace(old_select_contact, new_select_contact, 1)
    print("[OK] 6. Updated selectLeadContact")
else:
    print("[ERR] 6. selectLeadContact not found")

# === 8. Update onLeadContactKey (remove, no longer needed) ===
old_contact_key = '''function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadContactSuggIdx=Math.min(leadContactSuggIdx+1,leadContactSuggList.length-1);updateLeadContactActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadContactSuggIdx=Math.max(leadContactSuggIdx-1,0);updateLeadContactActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadContactSuggIdx>=0)selectLeadContact(leadContactSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}'''

new_contact_key = '''function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(!dd||dd.classList.contains('hidden'))return;
  if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}'''

if old_contact_key in html:
    html = html.replace(old_contact_key, new_contact_key, 1)
    print("[OK] 7. Simplified onLeadContactKey")
else:
    print("[ERR] 7. onLeadContactKey not found")

# === 9. Remove updateLeadContactActive (no longer needed) ===
old_update_contact = '''function updateLeadContactActive(){
  var items=document.querySelectorAll('#lead-contact-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadContactSuggIdx);
  if(leadContactSuggIdx>=0&&items[leadContactSuggIdx])items[leadContactSuggIdx].scrollIntoView({block:'nearest'});
}'''

if old_update_contact in html:
    html = html.replace(old_update_contact, '', 1)
    print("[OK] 8. Removed updateLeadContactActive")
else:
    print("[ERR] 8. updateLeadContactActive not found")

# === 10. Add "switch contact" button next to contact name field (for multi-contact clients) ===
# Replace the contact name HTML to include a switch button
old_contact_html = '<label>联系人 (可从客户库关联)</label><input id="lf-contact-name" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
new_contact_html = '<label>联系人 <a href="javascript:void(0)" onclick="onLeadContactPicker()" style="font-size:11px;color:var(--primary);margin-left:6px">[切换联系人]</a></label><input id="lf-contact-name" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
if old_contact_html in html:
    html = html.replace(old_contact_html, new_contact_html, 1)
    print("[OK] 9. Added [切换联系人] link")
else:
    print("[ERR] 9. Contact HTML not found")

# === 11. Re-add lead-contact-suggestions div (needed for multi-contact picker) ===
# Insert after lf-contact-name
contact_name_line = '<div class="form-group" style="position:relative"><label>联系人 <a href="javascript:void(0)" onclick="onLeadContactPicker()" style="font-size:11px;color:var(--primary);margin-left:6px">[切换联系人]</a></label><input id="lf-contact-name" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
if contact_name_line in html:
    html = html.replace(contact_name_line, contact_name_line + '<div class="name-suggestions hidden" id="lead-contact-suggestions"></div>', 1)
    print("[OK] 10. Re-added lead-contact-suggestions div")
else:
    print("[ERR] 10. Contact name line not found for div insert")

# === 12. Add lf-address field if not present (needed for selectLeadCompany) ===
# Check if lf-address exists
if 'id="lf-address"' not in html:
    # Insert after credit-code line
    old_credit = '<div class="form-group"><label>统一社会信用代码</label><input id="lf-credit-code" placeholder="B2B客户填写"></div>'
    new_credit = '<div class="form-group"><label>统一社会信用代码</label><input id="lf-credit-code" placeholder="B2B客户填写" readonly style="background:var(--bg2);color:var(--text3)"></div><div class="form-group"><label>客户地址</label><input id="lf-address" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)"></div>'
    if old_credit in html:
        html = html.replace(old_credit, new_credit, 1)
        print("[OK] 11. Added lf-address + made credit-code readonly")
    else:
        print("[ERR] 11. credit-code html not found")

# Write
with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

new_size = len(html.encode('utf-8'))
print(f"\nFile: {orig_size} → {new_size} bytes (delta: {new_size - orig_size:+d})")
print("Done.")
