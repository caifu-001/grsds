import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 旧版 loadMyInvitations + renderMyInvitations + acceptMyInvitation + rejectMyInvitation
alt_pattern = r'var myInvitations=\[\];[\s\S]*?function rejectMyInvitation\([^)]*\)\{[\s\S]*?\n\}'
match = re.search(alt_pattern, content)
if match:
    content = content[:match.start()] + content[match.end():]
    print(f"Removed {match.end() - match.start()} bytes (old invitation code)")

# Remove calls to renderMyInvitations
content = content.replace('renderMyInvitations();', '// renderMyInvitations removed')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

divs = content.count('<div') - content.count('</div>')
curls = content.count('{') - content.count('}')
print('div balance:', divs, 'curly balance:', curls)
