import re, tempfile, subprocess, os

content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()
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

# Verify new elements exist
checks = ['uedit-company', 'uedit-company-list', '输入或选择公司']
for c in checks:
    status = 'OK' if c in content else 'MISS'
    print(c + ': ' + status)

# Verify old select is gone
old = 'uedit-company" style'
status2 = 'OK' if old not in content else 'STILL PRESENT'
print('old select gone: ' + status2)
