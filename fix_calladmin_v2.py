import re

path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

fixes = 0

# ═══════ 1. 还原 callAdmin 函数内部（r 是原生 fetch Response）═══════
# 1a. if(r&&r.error) → if(!r.ok)  （只有 callAdmin 函数内的那个）
# 1b. return r.data → return await r.json()
# 1c. await r.text() 保留不变 ✓

# callAdmin 函数中 var r=await fetch(SUPAFUNC_BASE,...) → r 是 Response
# 错误处理必须用 !r.ok 而不是 r.error
old = "var r=await fetch(SUPAFUNC_BASE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token||''},body:body});\n    if(r&&r.error){var txt=await r.text();console.error('callAdmin failed:',r.status,txt);return{data:null,error:{message:'Admin API '+(opts.failMsg||'error')}}};\n    return r.data;"
new = "var r=await fetch(SUPAFUNC_BASE,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(await sb.auth.getSession()).data.session?.access_token||''},body:body});\n    if(!r.ok){var txt=await r.text();console.error('callAdmin failed:',r.status,txt);return{data:null,error:{message:'Admin API '+(opts.failMsg||'error')}}};\n    return await r.json();"

if old in c:
    c = c.replace(old, new)
    fixes += 1
    print('FIXED: callAdmin internal — restored if(!r.ok) + return await r.json()')
else:
    print('NOT FOUND: callAdmin internal pattern')
    # dump to find differences
    idx = c.find('async function callAdmin')
    print(c[idx:idx+500])

# ═══════ 2. 修复 renderWorkflowTemplates — 用 callAdmin 了，要正确处理 {data,error} ═══════
# renderWorkflowTemplates 里 var r=await callAdmin('select','workflow_templates',...)
# 所以 r 是 {data,error}，但当前错误地用 r.status / r.error 当 fetch Response
# 等等...看日志，它打印的是原始的 supabase URL，不是 callAdmin！
# 让我确认当前代码

idx = c.find('function renderWorkflowTemplates')
wf_code = c[idx:idx+600]
print('\n=== renderWorkflowTemplates 当前代码 ===')
print(wf_code)

# ═══════ 3. 验证：确保所有 callAdmin 调用者的 r/ur/var 处理正确 ═══════
# callAdmin 返回 {data, error}
# 消费: var.freshData = var.data;  if(var.error){...}

print(f'\nTotal fixes: {fixes}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved')
