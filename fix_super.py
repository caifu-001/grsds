import sys

path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# super_admin 分支
old1 = "if(currentUserRole==='super_admin'){try{var ur=await callAdmin('select','profiles',{query:'*'});if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}}catch(e){}}"
new1 = "if(currentUserRole==='super_admin'){try{var ur=await callAdmin('select','profiles',{query:'*'});if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList;populatePerfSelects();}else{console.warn('loadAdminData(super) profiles:',ur)}}catch(e){console.error('loadAdminData users:',e)}}"

if old1 in content:
    content = content.replace(old1, new1)
    print('Replace super_admin: OK')
else:
    print('NOT FOUND, dumping context...')
    idx = content.find("super_admin'){try")
    if idx == -1:
        idx = content.find("super_admin')")
    if idx >= 0:
        print('CONTEXT:')
        print(content[idx:idx+300])
    else:
        print('Cannot find super_admin branch at all')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Saved')
