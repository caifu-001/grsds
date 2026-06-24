import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# Pattern: find openProjectFormFromLead(JSON.stringify...) in onclick
# In renderLeads and renderPoolLeads
pat = r"openProjectFormFromLead\('\+JSON\.stringify\(l\.id\)\+',\+JSON\.stringify\(l\.project_name\|\|l\.name\|\|''\)\+',\+JSON\.stringify\(l\.name\|\|''\)\+',\+JSON\.stringify\(l\.client_id\|\|''\)\+'\)"

matches = list(re.finditer(pat, html))
print(f"Found {len(matches)} occurrences of openProjectFormFromLead(JSON.stringify...)")

for m in matches:
    pos = m.start()
    print(f"  At char {pos}")

# Replace each occurrence with the index-based approach
# First, add _leadProjectCache array init
init_pos = html.find("var oppEditId=null,oppLeadId=null;")
if init_pos >= 0:
    html = html[:init_pos] + "var _leadProjectCache=[];\n" + html[init_pos:]
    print("[OK] Added _leadProjectCache init")
    changes += 1
else:
    print("[ERR] oppEditId init not found")

# Replace in renderLeads: openProjectFormFromLead(...) => openProjectFormFromLeadIdx(li)
# Need to add push before the button
# Let's find the pattern in renderLeads
render_leads_pos = html.find("function renderLeads(){")
render_pool_pos = html.find("function renderPoolLeads(){")

if render_leads_pos >= 0:
    # Find the button line in renderLeads
    lead_button_pat = r"(html\+='<button class=\"btn-lead-success\" onclick=\"event\.stopPropagation\(\);)" + pat
    m = re.search(lead_button_pat, html[render_leads_pos:render_pool_pos] if render_pool_pos > render_leads_pos else html[render_leads_pos:])
    if m:
        abs_start = render_leads_pos + m.start()
        abs_end = render_leads_pos + m.end()
        old_text = html[abs_start:abs_end]
        # Replace: add push before the button, change onclick
        new_text = "var li=_leadProjectCache.length;\n    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||''});\n    html+='<button class=\"btn-lead-success\" onclick=\"event.stopPropagation();openProjectFormFromLeadIdx('+li+')\">转项目</button>'"
        html = html[:abs_start] + new_text + html[abs_end:]
        print("[OK] Replaced renderLeads button")
        changes += 1

# Find renderPoolLeads section
if render_pool_pos >= 0:
    # Find the button line in renderPoolLeads  
    pool_button_pat = r"(html\+='<button class=\"btn-lead-success\" onclick=\"event\.stopPropagation\(\);)" + pat
    m = re.search(pool_button_pat, html[render_pool_pos:])
    if m:
        abs_start = render_pool_pos + m.start()
        abs_end = render_pool_pos + m.end()
        old_text = html[abs_start:abs_end]
        new_text = "var li=_leadProjectCache.length;\n    _leadProjectCache.push({id:l.id,projectName:l.project_name||l.name||'',companyName:l.name||'',clientId:l.client_id||''});\n    html+='<button class=\"btn-lead-success\" onclick=\"event.stopPropagation();openProjectFormFromLeadIdx('+li+')\">转项目</button>'"
        html = html[:abs_start] + new_text + html[abs_end:]
        print("[OK] Replaced renderPoolLeads button")
        changes += 1

# Add openProjectFormFromLeadIdx function
func = '''function openProjectFormFromLeadIdx(idx){
  var entry=_leadProjectCache[idx];
  if(!entry){showToast('线索数据丢失');return}
  openProjectFormFromLead(entry.id,entry.projectName,entry.companyName,entry.clientId);
}
'''
# Insert before openProjectFormFromLead
insert_before = "\nfunction openProjectFormFromLead("
if insert_before in html:
    html = html.replace(insert_before, "\n" + func + "function openProjectFormFromLead(", 1)
    print("[OK] Added openProjectFormFromLeadIdx")
    changes += 1

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {len(html.encode('utf-8'))}")
