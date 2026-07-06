import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the entire old "Invitation Accept/Reject" block
# From "// === Invitation Accept/Reject ===" to the end of rejectInvitation() + pendingInvitation cleanup
old_block = r'// === Invitation Accept/Reject ===[\s\S]*?// 入职后刷新邀请状态[\s\S]*?\}'
match = re.search(old_block, content)
if match:
    print('Found old invitation block, length:', match.end() - match.start())
    content = content[:match.start()] + content[match.end():]
else:
    # Broader: from "var pendingInvitation=null" through the two old functions
    alt = r'var pendingInvitation=null;[\s\S]*?function rejectInvitation\(\)\{[\s\S]*?\n\}'
    match = re.search(alt, content)
    if match:
        # Also remove the showCompanyRegScreen call and the function's closing }
        # Find the next } that closes the old code segment
        after = match.end()
        # Remove preceding // === comment too
        start = content.rfind('// ===', 0, match.start())
        if start > 0 and 'Invitation Accept/Reject' in content[start:match.start()]:
            match_start = start
        else:
            match_start = match.start()
        content = content[:match_start] + content[after:]
        print(f'Removed old invitation block (alt pattern), start={match_start}, bytes={after-match_start}')
    else:
        print('Pattern not found')

# Also remove the invitation-screen HTML if it exists
inv_screen = re.search(r'<div id="invitation-screen"[\s\S]*?</div>\s*</div>', content)
if inv_screen:
    print('Removing invitation-screen HTML')
    content = content[:inv_screen.start()] + content[inv_screen.end():]

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

divs = content.count('<div') - content.count('</div>')
curls = content.count('{') - content.count('}')
print('div balance:', divs, 'curly balance:', curls)
