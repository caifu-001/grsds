import re
path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 匹配 2 种 callAdmin('select','profiles',...) 的返回处理
# 模式 1: if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}
# 模式 2: if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList.slice();populatePerfSelects();}

# 模式 1: 全替换
count = 0
for old, new in [
    ("if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList;populatePerfSelects();}",
     "if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList;populatePerfSelects();}else{console.warn('callAdmin returned no data:',ur)}"),
    ("if(ur.ok){adminUserList=await ur.json();allUsers=adminUserList.slice();populatePerfSelects();}",
     "if(ur&&ur.data){adminUserList=ur.data;allUsers=adminUserList.slice();populatePerfSelects();}else{console.warn('callAdmin returned no data:',ur)}"),
]:
    n = content.count(old)
    content = content.replace(old, new)
    print(f'  {old[:50]}... → {n} matches')
    count += n

# 同样修 callAdmin('update','profiles',...) 等其他调用的 ur.ok 误用
# 找到所有 if(ur.ok) 用法，看看 context
import re
matches = list(re.finditer(r'if\(ur\.ok\)', content))
print(f'\nRemaining if(ur.ok) usages: {len(matches)}')
for m in matches[:5]:
    print(f'  at pos {m.start()}: ...{content[max(0,m.start()-40):m.end()+80]}...')

# 还有 ur.json() 误用
matches2 = list(re.finditer(r'await ur\.json\(\)', content))
print(f'\nRemaining await ur.json() usages: {len(matches2)}')
for m in matches2[:5]:
    print(f'  at pos {m.start()}: ...{content[max(0,m.start()-40):m.end()+80]}...')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print(f'\nTotal replaced: {count}, Saved')
