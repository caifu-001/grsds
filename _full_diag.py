import sys, re
sys.stdout.reconfigure(encoding='utf-8')

print("=== 当前状态诊断 ===")

with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# 1. renderWorkflowTemplates async 状态
rwt_pos = h.find('function renderWorkflowTemplates')
prefix = h[max(0,rwt_pos-10):rwt_pos]
print(f"1. renderWorkflowTemplates async: {'async ' in prefix}")

# 2. 找出 admin-security 的闭合标签位置
sec_pos = h.find('id="admin-security"')
# 这个 div 内可能有多层嵌套，需要用 div 计数器找匹配的 </div>
d_count = 0; started = False
sec_end = sec_pos
for i in range(sec_pos, len(h)):
    # 找 <div (不匹配 </div)
    if h[i:i+4].lower() == '<div' and not h[i:i+5].lower() == '</div':
        d_count += 1; started = True
    elif h[i:i+6].lower() == '</div>':
        d_count -= 1
    if started and d_count == 0:
        sec_end = i + 6
        break
print(f"2. admin-security: {sec_pos} -> {sec_end}")

wf_pos = h.find('id="admin-workflows"')
if wf_pos > 0:
    # admin-workflows div 的闭合
    d2 = 0; s2 = False
    wf_end_pos = wf_pos
    for i in range(wf_pos, len(h)):
        if h[i:i+4].lower() == '<div' and not h[i:i+5].lower() == '</div':
            d2 += 1; s2 = True
        elif h[i:i+6].lower() == '</div>':
            d2 -= 1
        if s2 and d2 == 0:
            wf_end_pos = i + 6
            break
    print(f"2b. admin-workflows: {wf_pos} -> {wf_end_pos}")
    print(f"    admin-workflows {'inside' if wf_pos < sec_end else 'OUTSIDE'} admin-security")

# 3. selectLeadCompany 末尾 onLeadTypeChange
slc = h.find('function selectLeadCompany')
d3 = 0; s3 = False; i = slc
while i < len(h):
    if h[i] == '{': d3 += 1; s3 = True
    elif h[i] == '}': d3 -= 1
    if s3 and d3 == 0: break
    i += 1
fn_slc = h[slc:i+1]
has_olt = 'onLeadTypeChange()' in fn_slc
print(f"3. onLeadTypeChange() in selectLeadCompany: {has_olt}")
if not has_olt:
    print(f"   最后100字符: {repr(fn_slc[-100:])}")

# 4. allClients 懒加载是否有 credit_code
opf = h.find('function openProjectFormFromLead')
d4 = 0; s4 = False; i = opf
while i < len(h):
    if h[i] == '{': d4 += 1; s4 = True
    elif h[i] == '}': d4 -= 1
    if s4 and d4 == 0: break
    i += 1
fn_opf = h[opf:i+1]
# 找 allClients=data 前面的 select
ac_pos = fn_opf.find('allClients=data')
cc_in_lazy = 'credit_code' in fn_opf[max(0,ac_pos-300):ac_pos] if ac_pos > 0 else 'N/A'
print(f"4. allClients lazy load has credit_code: {cc_in_lazy}")

# 5. contacts query 有无 title
has_title = "'title'" in fn_opf or '"title"' in fn_opf
print(f"5. contacts query has title: {has_title}")

# 6. openProjectFormFromLead 是否为 async
prefix2 = h[max(0,opf-20):opf]
print(f"6. openProjectFormFromLead async: {'async' in prefix2}")

# 7. 所有非 async 含 await 的函数
func_pattern = re.compile(r'(async\s+)?function\s+(\w+)\s*\(')
bad_funcs = []
for m in func_pattern.finditer(h):
    name = m.group(2)
    is_async = m.group(1) is not None
    d = 0; s = False; j = m.start()
    while j < len(h):
        if h[j] == '{': d += 1; s = True
        elif h[j] == '}': d -= 1
        if s and d == 0: break
        j += 1
    body = h[m.start():j+1]
    if 'await ' in body and not is_async:
        ln = h[:m.start()].count('\n') + 1
        bad_funcs.append(f"{name}() at line {ln}")
if bad_funcs:
    print(f"7. Non-async await functions ({len(bad_funcs)}):")
    for bf in bad_funcs:
        print(f"   - {bf}")
else:
    print("7. No non-async await functions")
