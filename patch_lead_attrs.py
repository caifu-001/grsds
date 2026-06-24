import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# 1. NEW FIELDS IN FORM HTML
old_form_section = '  <div class="form-group"><label>\u9879\u76ee\u540d\u79f0</label><input id="lf-project-name" placeholder="\u9884\u586b\u9879\u76ee\u540d\u79f0"></div>\n  <div class="form-group"><label>\u5907\u6ce8</label><textarea id="lf-notes" placeholder="\u5907\u6ce8\u4fe1\u606f..." rows="2"></textarea></div>'

new_form_section = '''  <div class="form-group"><label>\u9879\u76ee\u540d\u79f0</label><input id="lf-project-name" placeholder="\u9884\u586b\u9879\u76ee\u540d\u79f0"></div>
  <div class="form-row">
   <div class="form-group"><label>\u7ebf\u7d22\u7f16\u53f7</label><input id="lf-lead-id" placeholder="\u81ea\u52a8\u751f\u6210" disabled style="background:var(--bg2);color:var(--text3)"></div>
   <div class="form-group"><label>\u5173\u8054\u5546\u673aID</label><input id="lf-opportunity-id" placeholder="\u8f6c\u5546\u673a\u540e\u81ea\u52a8\u5173\u8054" disabled style="background:var(--bg2);color:var(--text3)"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u5ba2\u6237\u7c7b\u578b *</label><select id="lf-customer-type"><option value="">\u8bf7\u9009\u62e9</option><option value="B2B">B2B \u4f01\u4e1a\u5ba2\u6237</option><option value="B2C">B2C \u4e2a\u4eba\u5ba2\u6237</option></select></div>
   <div class="form-group"><label>\u7edf\u4e00\u793e\u4f1a\u4fe1\u7528\u4ee3\u7801</label><input id="lf-credit-code" placeholder="B2B\u5ba2\u6237\u586b\u5199"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u5f52\u5c5e\u9500\u552e</label><input id="lf-assigned-sales" placeholder="\u9500\u552e\u4eba\u5458\u59d3\u540d"></div>
   <div class="form-group"><label>\u6240\u5c5e\u90e8\u95e8</label><select id="lf-department"><option value="">\u8bf7\u9009\u62e9</option><option value="\u76f4\u9500\u90e8">\u76f4\u9500\u90e8</option><option value="\u6e20\u9053\u90e8">\u6e20\u9053\u90e8</option><option value="\u7535\u5546\u90e8">\u7535\u5546\u90e8</option><option value="\u653f\u4f01\u90e8">\u653f\u4f01\u90e8</option><option value="\u5176\u4ed6">\u5176\u4ed6</option></select></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>\u521b\u5efa\u4eba</label><input id="lf-creator" placeholder="\u81ea\u52a8\u586b\u5199" disabled style="background:var(--bg2);color:var(--text3)"></div>
   <div class="form-group"><label>\u521b\u5efa\u65f6\u95f4</label><input id="lf-created-at" disabled style="background:var(--bg2);color:var(--text3)"></div>
  </div>
  <div class="form-group"><label>\u5907\u6ce8</label><textarea id="lf-notes" placeholder="\u5907\u6ce8\u4fe1\u606f..." rows="2"></textarea></div>'''

if old_form_section in html:
    html = html.replace(old_form_section, new_form_section, 1)
    changes += 1
    print("[OK] Form HTML updated")
else:
    print("[ERR] Form section not found")

# 2. UPDATE openLeadForm clears
old_clear = '  document.getElementById(\'lf-project-name\').value=\'\';\n  document.getElementById(\'lf-client-id\').value=\'\';\n  if(id){'

new_clear = '''  document.getElementById('lf-project-name').value='';
  document.getElementById('lf-client-id').value='';
  document.getElementById('lf-lead-id').value='';
  document.getElementById('lf-opportunity-id').value='';
  document.getElementById('lf-customer-type').value='';
  document.getElementById('lf-credit-code').value='';
  document.getElementById('lf-assigned-sales').value='';
  document.getElementById('lf-department').value='';
  document.getElementById('lf-creator').value='';
  document.getElementById('lf-created-at').value='';
  if(id){'''

if old_clear in html:
    html = html.replace(old_clear, new_clear, 1)
    changes += 1
    print("[OK] openLeadForm clears updated")
else:
    print("[ERR] openLeadForm clears not found")

# 3. UPDATE openLeadForm autofill for new leads
old_start = 'function openLeadForm(id){\n  leadEditId=id||null;\n  document.getElementById(\'lead-form-title\').textContent=id?\'\u7f16\u8f91\u7ebf\u7d22\':\'\u65b0\u5efa\u7ebf\u7d22\';\n  document.getElementById(\'lead-btn-delete\').classList.toggle(\'hidden\',!id);'

new_start = '''function openLeadForm(id){
  leadEditId=id||null;
  document.getElementById('lead-form-title').textContent=id?'\u7f16\u8f91\u7ebf\u7d22':'\u65b0\u5efa\u7ebf\u7d22';
  document.getElementById('lead-btn-delete').classList.toggle('hidden',!id);
  if(!id){
    document.getElementById('lf-creator').value=currentUser?(currentUser.realname||currentUser.name||currentUser.email||''):'';
    document.getElementById('lf-created-at').value=new Date().toLocaleString('zh-CN');
  }'''

if old_start in html:
    html = html.replace(old_start, new_start, 1)
    changes += 1
    print("[OK] openLeadForm auto-fill added")
else:
    print("[ERR] openLeadForm start not found")

# 4. UPDATE populate block
old_pop = '      document.getElementById(\'lf-project-name\').value=l.project_name||\'\';\n      document.getElementById(\'lf-client-id\').value=l.client_id||\'\';\n    }\n  }'

new_pop = '''      document.getElementById('lf-project-name').value=l.project_name||'';
      document.getElementById('lf-client-id').value=l.client_id||'';
      document.getElementById('lf-lead-id').value=l.lead_id||'';
      document.getElementById('lf-opportunity-id').value=l.opportunity_id||'';
      document.getElementById('lf-customer-type').value=l.customer_type||'';
      document.getElementById('lf-credit-code').value=l.credit_code||'';
      document.getElementById('lf-assigned-sales').value=l.assigned_sales||'';
      document.getElementById('lf-department').value=l.department||'';
      document.getElementById('lf-creator').value=l.creator||'';
      document.getElementById('lf-created-at').value=l.created_at?new Date(l.created_at).toLocaleString('zh-CN'):'';
    }
  }'''

if old_pop in html:
    html = html.replace(old_pop, new_pop, 1)
    changes += 1
    print("[OK] openLeadForm populate updated")
else:
    print("[ERR] openLeadForm populate not found")

# 5. UPDATE saveLead payload
old_payload = '  var lead={\n    name:name,\n    contact_name:document.getElementById(\'lf-contact-name\').value.trim(),\n    contact_phone:document.getElementById(\'lf-contact-phone\').value.trim(),\n    contact_email:document.getElementById(\'lf-contact-email\').value.trim(),\n    source:document.getElementById(\'lf-source\').value,\n    industry:document.getElementById(\'lf-industry\').value,\n    scale:document.getElementById(\'lf-scale\').value,\n    max_recycle_count:parseInt(document.getElementById(\'lf-max-recycle\').value)||3,\n    recycle_days:parseInt(document.getElementById(\'lf-recycle-days\').value)||30,\n    status:document.getElementById(\'lf-status\').value,\n    project_name:document.getElementById(\'lf-project-name\').value.trim(),\n    client_id:document.getElementById(\'lf-client-id\').value||null,\n    notes:document.getElementById(\'lf-notes\').value.trim(),\n    updated_at:new Date().toISOString()\n  };'

new_payload = '  var lead={\n    name:name,\n    contact_name:document.getElementById(\'lf-contact-name\').value.trim(),\n    contact_phone:document.getElementById(\'lf-contact-phone\').value.trim(),\n    contact_email:document.getElementById(\'lf-contact-email\').value.trim(),\n    source:document.getElementById(\'lf-source\').value,\n    industry:document.getElementById(\'lf-industry\').value,\n    scale:document.getElementById(\'lf-scale\').value,\n    max_recycle_count:parseInt(document.getElementById(\'lf-max-recycle\').value)||3,\n    recycle_days:parseInt(document.getElementById(\'lf-recycle-days\').value)||30,\n    status:document.getElementById(\'lf-status\').value,\n    project_name:document.getElementById(\'lf-project-name\').value.trim(),\n    client_id:document.getElementById(\'lf-client-id\').value||null,\n    customer_type:document.getElementById(\'lf-customer-type\').value,\n    credit_code:document.getElementById(\'lf-credit-code\').value.trim(),\n    assigned_sales:document.getElementById(\'lf-assigned-sales\').value.trim(),\n    department:document.getElementById(\'lf-department\').value,\n    creator:document.getElementById(\'lf-creator\').value.trim(),\n    notes:document.getElementById(\'lf-notes\').value.trim(),\n    updated_at:new Date().toISOString()\n  };'

if old_payload in html:
    html = html.replace(old_payload, new_payload, 1)
    changes += 1
    print("[OK] saveLead payload updated")
else:
    print("[ERR] saveLead payload not found")

# 6. AUTO-GENERATE lead_id on insert
old_insert = '  if(!leadEditId){\n    lead.company_id=currentCompanyId;\n    lead.created_by=currentUser.id;\n    if(leadFormSource===\'sales\'){lead.assigned_to=currentUser.id;lead.status=\'assigned\';lead.assigned_at=new Date().toISOString();}\n    var {error}=await sb.from(\'lead_pool\').insert(lead);'

new_insert = '''  if(!leadEditId){
    lead.company_id=currentCompanyId;
    lead.created_by=currentUser.id;
    // Auto-generate lead_id: LEAD+YYYYMMDD+3-digit seq
    var today=new Date();
    var yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,'0'),dd=String(today.getDate()).padStart(2,'0');
    var datePrefix='LEAD'+yyyy+mm+dd;
    try{var {data:cnt}=await sb.from('lead_pool').select('lead_id',{count:'exact',head:true}).like('lead_id',datePrefix+'%');var seq=(cnt||0)+1;lead.lead_id=datePrefix+String(seq).padStart(3,'0');}catch(e){lead.lead_id=datePrefix+'001';}
    if(leadFormSource==='sales'){lead.assigned_to=currentUser.id;lead.status='assigned';lead.assigned_at=new Date().toISOString();}
    var {error}=await sb.from('lead_pool').insert(lead);'''

if old_insert in html:
    html = html.replace(old_insert, new_insert, 1)
    changes += 1
    print("[OK] lead_id auto-generate added")
else:
    print("[ERR] insert block not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {os.path.getsize(path)}")
