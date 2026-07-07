import re

path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

fixes = 0

# 1. renderWorkflowTemplates 里 r.status → r.error.message
old_wf_err = "if(r&&r.error){console.log('renderWorkflowTemplates: fetch failed',r.status);list.innerHTML='<p style=\"color:var(--text2)\">加载失败 (HTTP '+r.status+')</p>';return}"
new_wf_err = "if(r&&r.error){console.log('renderWorkflowTemplates: fetch failed',r.error);list.innerHTML='<p style=\"color:var(--text2)\">加载失败: '+escHtml(r.error.message||'未知错误')+'</p>';return}"
if old_wf_err in c:
    c = c.replace(old_wf_err, new_wf_err)
    fixes += 1
    print('FIXED: renderWorkflowTemplates error handling')

# 2. 全量搜索其他 callAdmin 返回值的错误分支，也用了 r.status 的
# pattern: 任何地方在 if(r&&r.error) 后用 r.status
for m in re.finditer(r'if\([a-z]+&&[a-z]+\.error\)\{[^}]*\.status', c):
    ctx = c[m.start():m.end()+80]
    print(f'  found r.status misuse: ...{ctx}...')

# 3. 搜索其他 load 函数是否也有同样问题
for func_name in ['custom_field_defs', 'roles', 'departments', 'sales_stages_def', 'custom_tags', 'numbering_rules', 'custom_forms', 'backup_logs']:
    for m in re.finditer(rf'callAdmin\(.*{func_name}[^)]*\)[^;]{{0,300}}', c):
        ctx = m.group()[:200]
        if '.status' in ctx or '.ok' in ctx:
            print(f'  WARNING in {func_name}: {ctx}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\nTotal fixes: {fixes}')
