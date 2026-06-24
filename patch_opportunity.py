import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# ============================================================
# 1. ADD OPPORTUNITY FORM MODAL (after lead-form-modal closing </div>)
# ============================================================
lead_modal_end = '''</div>
</div>

<!-- Lead Assign Modal -->'''

if lead_modal_end in html:
    opp_form = '''
<!-- Opportunity (Project) Form Modal -->
<div class="modal-overlay hidden" id="opp-form-modal">
 <div class="modal-sheet" style="max-width:560px">
  <h3 id="opp-form-title">\u65b0\u5efa\u5546\u673a</h3>
  <div class="form-row">
   <div class="form-group"><label>\u5546\u673a ID</label><input id="pf-bus-id" placeholder="\u81ea\u52a8\u751f\u6210" disabled style="background:var(--bg2);color:var(--text3)"></div>
   <div class="form-group"><label>\u5173\u8054\u7ebf\u7d22 ID</label><input id="pf-lead-id" placeholder="\u4ece\u7ebf\u7d22\u8f6c\u5165\u65f6\u81ea\u52a8\u586b\u5199" disabled style="background:var(--bg2);color:var(--text3)"></div>
  </div>
  <div class="form-group"><label>\u5546\u673a\u540d\u79f0 *</label><input id="pf-name" placeholder="\u5982\uff1aXX\u79d1\u6280 CRM\u7cfb\u7edf\u91c7\u8d2d\u9879\u76ee"></div>
  <div class="form-row">
   <div class="form-group"><label>\u5ba2\u6237\u7c7b\u578b *</label><select id="pf-customer-type"><option value="">\u8bf7\u9009\u62e9</option><option value="B2B">B2B \u4f01\u4e1a\u5ba2\u6237</option><option value="B2C">B2C \u4e2a\u4eba\u5ba2\u6237</option></select></div>
   <div class="form-group"><label>\u4e3b\u8425\u884c\u4e1a</label><select id="pf-industry"><option value="">\u8bf7\u9009\u62e9</option><option value="\u5236\u9020\u4e1a">\u5236\u9020\u4e1a</option><option value="\u6559\u80b2">\u6559\u80b2</option><option value="\u96f6\u552e">\u96f6\u552e</option><option value="\u653f\u52a1">\u653f\u52a1</option><option value="\u4e92\u8054\u7f51">\u4e92\u8054\u7f51</option><option value="\u533b\u7597">\u533b\u7597</option><option value="\u91d1\u878d">\u91d1\u878d</option><option value="\u5efa\u7b51">\u5efa\u7b51</option><option value="\u80fd\u6e90">\u80fd\u6e90</option><option value="\u5176\u4ed6">\u5176\u4ed6</option></select></div>
  </div>
  <div class="form-group"><label>\u5ba2\u6237\u540d\u79f0 *</label><input id="pf-company-name" placeholder="\u4f01\u4e1a\u5ba2\u6237\u586b\u5de5\u5546\u5168\u79f0\uff0c\u4e2a\u4eba\u5ba2\u6237\u586b\u59d3\u540d" autocomplete="off" oninput="onOppCompanyInput()" onkeydown="onOppCompanyKey(event)"><div class="name-suggestions hidden" id="opp-company-suggestions"></div></div>
  <div class="form-group"><label>\u7edf\u4e00\u793e\u4f1a\u4fe1\u7528\u4ee3\u7801</label><input id="pf-credit-code" placeholder="B\u7aef\u5ba2\u6237\u5fc5\u586b\uff0cC\u7aef\u7559\u7a7a"></div>
  <div class="form-row">
   <div class="form-group"><label>\u5bf9\u63a5\u8054\u7cfb\u4eba</label><input id="pf-contact-name" placeholder="\u4e3b\u8981\u6c9f\u901a\u4eba\u59d3\u540d"></div>
   <div class="form-group"><label>\u5bf9\u63a5\u4eba\u804c\u4f4d</label><select id="pf-contact-title"><option value="">\u8bf7\u9009\u62e9</option><option value="\u91c7\u8d2d">\u91c7\u8d2d</option><option value="\u603b\u7ecf\u7406">\u603b\u7ecf\u7406</option><option value="\u6280\u672f\u8d1f\u8d23\u4eba">\u6280\u672f\u8d1f\u8d23\u4eba</option><option value="\u884c\u653f">\u884c\u653f</option><option value="IT">IT</option><option value="\u8d22\u52a1">\u8d22\u52a1</option><option value="\u5176\u4ed6">\u5176\u4ed6</option></select></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u8054\u7cfb\u7535\u8bdd</label><input id="pf-contact-phone" placeholder="\u624b\u673a\u53f7"></div>
   <div class="form-group"><label>\u5ba2\u6237\u5730\u5740</label><input id="pf-address" placeholder="\u4f01\u4e1a\u6ce8\u518c / \u6536\u8d27\u5730\u5740"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u5f52\u5c5e\u9500\u552e *</label><input id="pf-assigned-sales" placeholder="\u8d1f\u8d23\u8ddf\u8fdb\u4e1a\u52a1\u5458\u59d3\u540d"></div>
   <div class="form-group"><label>\u534f\u52a9\u8ddf\u8fdb\u4eba</label><input id="pf-co-sales" placeholder="\u534f\u540c\u9500\u552e\u3001\u552e\u524d\u987e\u95ee"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u9884\u7b97\u91d1\u989d</label><input type="number" id="pf-budget" placeholder="\u4e07\u5143" step="0.01"></div>
   <div class="form-group"><label>\u72b6\u6001</label><select id="pf-status"><option value="planning">\u89c4\u5212\u4e2d</option><option value="in_progress">\u8fdb\u884c\u4e2d</option><option value="completed">\u5df2\u5b8c\u6210</option><option value="suspended">\u5df2\u6682\u505c</option></select></div>
  </div>
  <div class="form-group"><label>\u7ed3\u8bba</label><textarea id="pf-conclusion" placeholder="\u9488\u5bf9\u5546\u673a\u8fdb\u884c\u51b3\u7b56\u5c42\u5206\u6790\u9a8c\u8bc1\uff0c\u8ba4\u53ef\u5546\u673a\u5219\u8f6c\u4e0b\u4e00\u6b65\uff0c\u4e0d\u8ba4\u53ef\u5219\u8f6c46\u7ed3\u675f" rows="3"></textarea></div>
  <div class="form-group"><label>\u5907\u6ce8</label><textarea id="pf-notes" placeholder="\u5907\u6ce8\u4fe1\u606f..." rows="2"></textarea></div>
  <div class="modal-actions">
   <button class="btn-delete hidden" id="opp-btn-delete" onclick="deleteOpp()">\u5220\u9664\u5546\u673a</button>
   <button class="btn-cancel" onclick="closeOppForm()">\u53d6\u6d88</button>
   <button class="btn-save" onclick="saveProject()">\u4fdd\u5b58</button>
  </div>
 </div>
</div>
'''
    html = html.replace(lead_modal_end, '</div>\n</div>\n' + opp_form + '\n\n<!-- Lead Assign Modal -->', 1)
    changes += 1
    print("[OK] Opportunity form modal added")
else:
    print("[ERR] lead_modal_end not found")

# ============================================================
# 2. REWRITE openProjectForm - full form popup
# ============================================================
old_openPF = "function openProjectForm(id){showToast('\u9879\u76ee\u8868\u5355\u529f\u80fd\u5df2\u5b58\u5728\uff0c\u4fdd\u6301\u4e0d\u53d8')}"

new_openPF = '''function openProjectForm(id,leadId){
  oppEditId=id||null;
  var title=document.getElementById('opp-form-title');
  if(title)title.textContent=id?'\u7f16\u8f91\u5546\u673a':'\u65b0\u5efa\u5546\u673a';
  var delBtn=document.getElementById('opp-btn-delete');
  if(delBtn)delBtn.classList.toggle('hidden',!id);
  document.getElementById('pf-bus-id').value='';
  document.getElementById('pf-lead-id').value='';
  document.getElementById('pf-name').value='';
  document.getElementById('pf-customer-type').value='';
  document.getElementById('pf-industry').value='';
  document.getElementById('pf-company-name').value='';
  document.getElementById('pf-credit-code').value='';
  document.getElementById('pf-contact-name').value='';
  document.getElementById('pf-contact-title').value='';
  document.getElementById('pf-contact-phone').value='';
  document.getElementById('pf-address').value='';
  document.getElementById('pf-assigned-sales').value='';
  document.getElementById('pf-co-sales').value='';
  document.getElementById('pf-budget').value='';
  document.getElementById('pf-status').value='planning';
  document.getElementById('pf-conclusion').value='';
  document.getElementById('pf-notes').value='';
  if(leadId){document.getElementById('pf-lead-id').value=leadId;oppLeadId=leadId}else oppLeadId=null;
  if(!id){
    document.getElementById('pf-assigned-sales').value=currentUser?(currentUser.realname||currentUser.name||''):'';
  }
  if(id){
    var p=allProjects.find(function(x){return x.id==id||String(x.id)===String(id)});
    if(p){
      document.getElementById('pf-bus-id').value=p.bus_id||'';
      document.getElementById('pf-lead-id').value=p.lead_id||'';
      document.getElementById('pf-name').value=p.name||'';
      document.getElementById('pf-customer-type').value=p.customer_type||'';
      document.getElementById('pf-industry').value=p.industry||'';
      document.getElementById('pf-company-name').value=p.company_name||'';
      document.getElementById('pf-credit-code').value=p.credit_code||'';
      document.getElementById('pf-contact-name').value=p.contact_name||'';
      document.getElementById('pf-contact-title').value=p.contact_title||'';
      document.getElementById('pf-contact-phone').value=p.contact_phone||'';
      document.getElementById('pf-address').value=p.address||'';
      document.getElementById('pf-assigned-sales').value=p.assigned_sales||'';
      document.getElementById('pf-co-sales').value=p.co_sales||'';
      document.getElementById('pf-budget').value=p.budget||'';
      document.getElementById('pf-status').value=p.status||'planning';
      document.getElementById('pf-conclusion').value=p.conclusion||'';
      document.getElementById('pf-notes').value=p.notes||'';
    }
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');
}

function closeOppForm(){document.getElementById('opp-form-modal').classList.add('hidden');oppEditId=null;oppLeadId=null}

function onOppCompanyInput(){
  var val=document.getElementById('pf-company-name').value.trim();
  var sug=document.getElementById('opp-company-suggestions');
  if(!sug)return;
  if(val.length<1){sug.classList.add('hidden');return}
  var matches=allClients.filter(function(c){return c.name&&c.name.toLowerCase().indexOf(val.toLowerCase())>=0}).slice(0,8);
  if(!matches.length){sug.classList.add('hidden');return}
  var s='';
  for(var i=0;i<matches.length;i++){
    s+='<div class="name-suggestion-item" onclick="document.getElementById(\'pf-company-name\').value=\''+h(matches[i].name)+'\';document.getElementById(\'opp-company-suggestions\').classList.add(\'hidden\')">'+h(matches[i].name)+'</div>';
  }
  sug.innerHTML=s;sug.classList.remove('hidden');
}
function onOppCompanyKey(e){
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){navigateSuggestions('opp-company-suggestions',e)}
  else if(e.key==='Enter'){selectSuggestion('opp-company-suggestions','pf-company-name')}
  else if(e.key==='Escape'){document.getElementById('opp-company-suggestions').classList.add('hidden')}
}'''

if old_openPF in html:
    html = html.replace(old_openPF, new_openPF, 1)
    changes += 1
    print("[OK] openProjectForm rewritten")
else:
    print("[ERR] openProjectForm not found")

# ============================================================
# 3. REWRITE saveProject - full save with auto-gen bus_id
# ============================================================
old_saveP = "async function saveProject(){}"

new_saveP = '''async function saveProject(){
  var name=document.getElementById('pf-name').value.trim();
  if(!name){showToast('\u8bf7\u8f93\u5165\u5546\u673a\u540d\u79f0');return}
  var proj={
    name:name,
    lead_id:document.getElementById('pf-lead-id').value.trim()||null,
    customer_type:document.getElementById('pf-customer-type').value,
    industry:document.getElementById('pf-industry').value,
    company_name:document.getElementById('pf-company-name').value.trim(),
    credit_code:document.getElementById('pf-credit-code').value.trim(),
    contact_name:document.getElementById('pf-contact-name').value.trim(),
    contact_title:document.getElementById('pf-contact-title').value,
    contact_phone:document.getElementById('pf-contact-phone').value.trim(),
    address:document.getElementById('pf-address').value.trim(),
    assigned_sales:document.getElementById('pf-assigned-sales').value.trim(),
    co_sales:document.getElementById('pf-co-sales').value.trim(),
    budget:parseFloat(document.getElementById('pf-budget').value)||null,
    status:document.getElementById('pf-status').value,
    conclusion:document.getElementById('pf-conclusion').value.trim(),
    notes:document.getElementById('pf-notes').value.trim(),
    updated_at:new Date().toISOString()
  };
  if(!oppEditId){
    proj.company_id=currentCompanyId;
    proj.created_by=currentUser.id;
    // Auto-generate bus_id: BUS+YYYYMMDD+3-digit seq
    var today=new Date();
    var yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
    var datePrefix='BUS'+yyyy+mm+dd;
    try{var {data:cnt}=await sb.from('projects').select('bus_id',{count:'exact',head:true}).like('bus_id',datePrefix+'%');var seq=(cnt||0)+1;proj.bus_id=datePrefix+String(seq).padStart(3,'0');}catch(e){proj.bus_id=datePrefix+'001';}
    proj.workflow='{}';proj.current_step=1;
    var {error}=await sb.from('projects').insert(proj);
    if(error){showToast('\u521b\u5efa\u5931\u8d25: '+error.message);return}
  }else{
    var {error}=await sb.from('projects').update(proj).eq('id',oppEditId);
    if(error){showToast('\u66f4\u65b0\u5931\u8d25: '+error.message);return}
  }
  closeOppForm();
  await loadProjects();
  // If created from lead, mark lead as converted
  if(oppLeadId&&!oppEditId){
    try{await sb.from('lead_pool').update({opportunity_id:proj.bus_id,status:'converted'}).eq('id',oppLeadId)}catch(e){}
  }
  showToast(oppEditId?'\u5df2\u66f4\u65b0':'\u5df2\u521b\u5efa\u5546\u673a');
}

var oppEditId=null,oppLeadId=null;

async function deleteOpp(){
  if(!oppEditId||!confirm('\u786e\u5b9a\u5220\u9664\u8be5\u5546\u673a?'))return;
  var {error}=await sb.from('projects').delete().eq('id',oppEditId);
  if(error){showToast(error.message);return}
  closeOppForm();
  await loadProjects();
  showToast('\u5df2\u5220\u9664');
}'''

if old_saveP in html:
    html = html.replace(old_saveP, new_saveP, 1)
    changes += 1
    print("[OK] saveProject rewritten")
else:
    print("[ERR] saveProject not found")

# ============================================================
# 4. UPDATE renderProjects to show new fields in cards
# ============================================================
old_render = "    // Count workflow progress for preview"
new_render = '''    // Bus ID display
    if(p.bus_id)s+='<span style="font-size:11px;color:var(--text3)">\u2316 '+h(p.bus_id)+'</span>';
    // Count workflow progress for preview'''

if old_render in html:
    html = html.replace(old_render, new_render, 1)
    changes += 1
    print("[OK] renderProjects updated with bus_id")
else:
    print("[ERR] renderProjects section not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {os.path.getsize(path)}")
