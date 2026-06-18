import re, tempfile, subprocess, os
from collections import Counter

content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# Check: any remaining duplicate IDs?
ids = re.findall(r'id="([^"]+)"', content)
dupes = {k:v for k,v in Counter(ids).items() if v > 1}
print(f"Remaining duplicate IDs: {len(dupes)}")
for k, v in sorted(dupes.items()):
    print(f"  {k}: {v}x")

# JS syntax check
scripts = re.findall(r'(?s)<script>(.*?)</script>', content)
all_js = '\n'.join(scripts)
tmp = os.path.join(tempfile.gettempdir(), '_syntax_check.js')
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(all_js)
result = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
print(f"JS Syntax: {'PASSED' if result.returncode == 0 else result.stderr[:200]}")
os.unlink(tmp)
print(f"Line count: {content.count(chr(10))}")
