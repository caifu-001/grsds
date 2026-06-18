import re, tempfile, subprocess, os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract all JS
scripts = re.findall(r'(?s)<script>(.*?)</script>', content)
all_js = '\n'.join(scripts)

# JS syntax check
tmp = os.path.join(tempfile.gettempdir(), '_syn.js')
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(all_js)
r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
if r.returncode == 0:
    print('JS Syntax: PASSED')
else:
    print('JS Syntax: FAILED')
    for line in r.stderr.split('\n')[:8]:
        print('  ', line)
os.unlink(tmp)

# Brace balance
opens = all_js.count('{')
closes = all_js.count('}')
print(f'Braces: {opens}:{closes} = {opens-closes}')

# Line count
print(f'Lines: {len(content.splitlines())}')

# Check key functions
funcs = ['renderAdminEmployees','openEmployeeForm','saveEmployee','toggleEmpStatus','editEmployee',
         'loadOperationLogs','renderOperationLogs','exportOperationLogs','writeOpLog',
         'switchConfigTab','renderCustomFields','openFieldForm','saveField','deleteField',
         'renderCustomForms','openFormBuilder','renderSalesStages','openStageForm','saveStage',
         'renderCustomTags','openTagForm','saveTag','renderNumberingRules','openNumberRule','saveNumberRule',
         'renderSecurityPanel','toggleDataMasking','doBackup','loadBackupHistory','toggleRoleExport']
for fn in funcs:
    status = 'OK' if fn in all_js else 'MISSING'
    print(f'  {fn}: {status}')

# Check key DOM IDs
ids = ['admin-employees','admin-logs','admin-config','admin-security',
       'cfg-fields','cfg-forms','cfg-stages','cfg-tags','cfg-numbering',
       'emp-form-modal','field-form-modal','stage-form-modal','tag-form-modal','num-form-modal']
for did in ids:
    status = 'OK' if did in content else 'MISSING'
    print(f'  DOM {did}: {status}')
