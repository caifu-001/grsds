import re
with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 替换 1: super_admin 分支
old1 = "if(currentUserRole==='super_admin'){try{var ur=await callAdmin('select','profiles',{query:'*'});if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}}catch(e){}}"
new1 = "if(currentUserRole==='super_admin'){try{var ur=await callAdmin('select','profiles',{query:'*'});if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList;populatePerfSelects();}else{console.warn('loadAdminData(super) profiles:',ur)}}catch(e){console.error('loadAdminData users:',e)}}"

if old1 in content:
    content = content.replace(old1, new1)
    print('Replaced 1: OK')
else:
    print('Replace 1: NOT FOUND')

# 替换 2: admin 分支
old2 = "try{var ur=await callAdmin('select','profiles',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId}]});if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList.slice();populatePerfSelects();}}catch(e){console.error('loadAdminData users:',e)}"
new2 = "try{var ur=await callAdmin('select','profiles',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId}]});if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList.slice();populatePerfSelects();}else{console.warn('loadAdminData profiles:',ur)}}catch(e){console.error('loadAdminData users:',e)}"

if old2 in content:
    content = content.replace(old2, new2)
    print('Replaced 2: OK')
else:
    print('Replace 2: NOT FOUND')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print('Saved')
