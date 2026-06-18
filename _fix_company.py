# Fix employee edit form: company field from select to searchable input+datalist
import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) openUserEditForm: replace <select> with <input>+<datalist>
old_select = '(isSuperAdmin?\'<label style="font-size:13px;display:block;margin-bottom:4px">公司</label><select id="uedit-company" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px">\'+allCompanies.map(function(c){return \\\'<option value="\\\'+c.id+\\\'"\\\'+(u.company_id===c.id?\\\' selected\\\':\\\'\\\')+\\\'>\\\'+escHtml(c.name)+\\\'</option>\\\';}).join(\\\'\\\')+\\\'</select>\\\':\\\'\\\')'

new_input = "(isSuperAdmin?'<label style=\"font-size:13px;display:block;margin-bottom:4px\">公司</label><input id=\"uedit-company\" list=\"uedit-company-list\" placeholder=\"输入或选择公司\" autocomplete=\"off\" value=\"'+(function(){var cn='';for(var i=0;i<allCompanies.length;i++){if(allCompanies[i].id===u.company_id){cn=allCompanies[i].name;break}}return escHtml(cn);})()+'\" style=\"width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:10px\"><datalist id=\"uedit-company-list\">'+allCompanies.map(function(c){return '<option value=\"'+escHtml(c.name)+'\">';}).join('')+'</datalist>':'')"

assert old_select in content, "old select not found!"
content = content.replace(old_select, new_input)
print("1) openUserEditForm HTML: replaced")

# 2) saveUserEdit: change company_id lookup from select value to name search
old_company = "var companyId=isSuperAdmin?parseInt(document.getElementById('uedit-company').value)||null:null;"
new_company = "var companyId=null;if(isSuperAdmin){var cname=document.getElementById('uedit-company').value.trim();if(cname){var found=null;var cab=typeof allAdminCompanies!=='undefined'?allAdminCompanies:allCompanies||[];for(var i=0;i<cab.length;i++){if(cab[i].name===cname){found=cab[i];break}}if(found){companyId=found.id}}}"

assert old_company in content, "old companyId line not found!"
content = content.replace(old_company, new_company)
print("2) saveUserEdit company lookup: replaced")

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

# Verify
import subprocess, tempfile, os
scripts = re.findall(r'(?s)<script>(.*?)</script>', content)
all_js = '\n'.join(scripts)
tmp = os.path.join(tempfile.gettempdir(), '_syn.js')
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(all_js)
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
print('JS Syntax:', 'PASSED' if r.returncode == 0 else r.stderr[:300])
os.unlink(tmp)

opens = all_js.count('{')
closes = all_js.count('}')
print(f'Braces: {opens}:{closes} = {opens-closes}')
print(f'Lines: {content.count(chr(10))}')

# Check dup IDs
dup = {k:v for k,v in __import__('collections').Counter(re.findall(r'id="([^"]+)"', content)).items() if v > 1}
print(f'Duplicate IDs: {len(dup)}')
if dup:
    for k,v in list(dup.items())[:5]:
        print(f'  {k}: {v}x')
