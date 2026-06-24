import re, json

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# Helper: parse phone/email JSON array, join with \n
helper_fn = r'''function fmtMulti(v){if(!v)return'';if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return v}}if(Array.isArray(v))return v.filter(function(x){return x}).join('\n');return String(v);}'''

# 1. HTML: change contact-phone input → textarea
old = '<input id="lf-contact-phone" placeholder="选择客户后自动填充" readonly style="background:var(--bg2);color:var(--text3)">'
new = '<textarea id="lf-contact-phone" placeholder="选择客户后自动填充（多号分行）" readonly style="background:var(--bg2);color:var(--text3);resize:vertical;min-height:38px" rows="2"></textarea>'
if old in html:
    html = html.replace(old, new, 1)
    changes += 1
    print("[OK] 1. HTML textarea for phone")
else:
    print("[ERR] 1. HTML not found")

# 2. selectLeadCompany: use fmtMulti for phone/email
old2 = "document.getElementById('lf-contact-phone').value=firstVal(contacts[0].phone);\n    document.getElementById('lf-contact-email').value=firstVal(contacts[0].email);"
new2 = "document.getElementById('lf-contact-phone').value=fmtMulti(contacts[0].phone);\n    document.getElementById('lf-contact-email').value=fmtMulti(contacts[0].email);"
if old2 in html:
    html = html.replace(old2, new2, 1)
    changes += 1
    print("[OK] 2. selectLeadCompany fmtMulti")
else:
    print("[ERR] 2. selectLeadCompany not found")

# 3. selectLeadContact: use fmtMulti
old3 = "document.getElementById('lf-contact-phone').value=pv(m.phone);\n  document.getElementById('lf-contact-email').value=pv(m.email);"
new3 = "document.getElementById('lf-contact-phone').value=fmtMulti(m.phone);\n  document.getElementById('lf-contact-email').value=fmtMulti(m.email);"
if old3 in html:
    html = html.replace(old3, new3, 1)
    changes += 1
    print("[OK] 3. selectLeadContact fmtMulti")
else:
    print("[ERR] 3. selectLeadContact not found")

# 4. openLeadForm: use fmtMulti
old4 = "document.getElementById('lf-contact-phone').value=l.contact_phone||'';"
new4 = "document.getElementById('lf-contact-phone').value=fmtMulti(l.contact_phone)||'';"
if old4 in html:
    html = html.replace(old4, new4, 1)
    changes += 1
    print("[OK] 4. openLeadForm fmtMulti")
else:
    print("[ERR] 4. openLeadForm not found")

# 5. Add fmtMulti function before selectLeadCompany
insert_before = "\nfunction selectLeadCompany("
if insert_before in html and helper_fn not in html:
    html = html.replace(insert_before, "\n"+helper_fn+"\nfunction selectLeadCompany(", 1)
    changes += 1
    print("[OK] 5. Added fmtMulti helper")
elif helper_fn in html:
    print("[OK] 5. fmtMulti already present")

# 6. saveLead: join multi-line phone back to JSON array
old6 = "contact_phone:document.getElementById('lf-contact-phone').value.trim(),"
new6 = "contact_phone:(function(){var v=document.getElementById('lf-contact-phone').value.trim();if(!v)return'';var lines=v.split('\\n').filter(function(x){return x.trim()});return lines.length>1?JSON.stringify(lines):lines[0]||'';})(),"
if old6 in html:
    html = html.replace(old6, new6, 1)
    changes += 1
    print("[OK] 6. saveLead phone → JSON array")
else:
    print("[ERR] 6. saveLead phone not found")

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"Size: {len(html.encode('utf-8'))} bytes")
