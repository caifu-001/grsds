import re
c = open('index.html','r',encoding='utf-8').read()
lines = c.count('\n') + 1
print(f'index.html: {lines} lines, {len(c):,} chars')

funcs = len(re.findall(r'\bfunction\s+\w+', c))
onclicks = len(re.findall(r'onclick=', c))
print(f'Functions: {funcs}, onclick handlers: {onclicks}')

bo = c.count('{')
bc = c.count('}')
print(f'Braces: {bo}:{bc} (delta={bo-bc})')

# Find all Supabase table references
tables = set()
for m in re.finditer(r'''\.from\(\s*['"]([^'"\s]+)['"]''', c):
    tables.add(m.group(1))
print(f'Supabase tables: {sorted(tables)}')
