import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    local = f.read()
with open(r'D:\1kaifa\grsds\remote_index.html', 'r', encoding='utf-8', errors='replace') as f:
    remote = f.read()

def extract(c, name):
    start = c.find('function ' + name)
    if start < 0:
        return None
    depth = 0
    i = start
    in_str = None
    escape = False
    while i < len(c):
        ch = c[i]
        if in_str:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == in_str:
                in_str = None
        else:
            if ch in ('"', "'", '`'):
                in_str = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return c[start:i + 1]
        i += 1
    return None

for fname in ['wfShowProps', 'wfSetApproval', 'wfSetAssignee', 'renderWorkflowTemplates', 'callAdmin', 'saveWtVisual']:
    l = extract(local, fname)
    r = extract(remote, fname)
    same = l == r
    print(f'{fname}: same={same}  local_len={len(l) if l else 0}  remote_len={len(r) if r else 0}')
    if not same and l and r:
        for i in range(min(len(l), len(r))):
            if l[i] != r[i]:
                print(f'  First diff at char {i}:')
                print(f'    local:  ...{l[max(0,i-30):i+80]}...')
                print(f'    remote: ...{r[max(0,i-30):i+80]}...')
                break
        else:
            print(f'  One is prefix of other; extra in longer')
