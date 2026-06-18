content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# Find admin subtab buttons in HTML (not CSS)
# Look for the onclick="switchAdminTab pattern
idx = content.find('switchAdminTab(')
if idx > 0:
    # Find the start of the admin tabs section
    start = content.rfind('<div', 0, idx)
    # Find the end
    end = content.find('</div>', idx)
    print('ADMIN SUBTABS HTML:')
    print(content[start-50:end+100])
    print(f'\nPosition: {start} to {end}')

print('\n=== ADMIN PANELS ===')
# Find all admin- panels
import re
panels = re.finditer(r'id="admin-[a-z_]+"', content)
for p in panels:
    pi = p.start()
    line_start = content.rfind('\n', 0, pi)
    print(f'  Offset {pi}: {p.group()} (line ~{content[:pi].count(chr(10))+1})')
