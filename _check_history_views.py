import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# Check multiple recent commits for view existence
import subprocess

commits = ['44d70d7', '0e57b14', 'b828b2c', '7e03885', 'd79df2f', '855f95c', 'eb8aa12']
views = ['dash-view','opportunity-view','collaboration-view','main-view']

for c in commits:
    result = subprocess.run(['git', 'show', c + ':index.html'], 
                          capture_output=True, text=True, cwd=r'D:\1kaifa\grsds')
    if result.returncode != 0:
        print('%s: ERROR %s' % (c[:7], result.stderr[:80]))
        continue
    h = result.stdout
    status = []
    for v in views:
        pos = h.find('id="' + v + '"')
        status.append(v if pos > 0 else '')
    present = [s for s in status if s]
    missing = [v for v in views if v not in present]
    print('%s: present=%s missing=%s' % (c[:7], present, missing))
