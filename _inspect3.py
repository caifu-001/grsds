content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# Find admin-perms panel and what follows
p = content.find('id="admin-perms"')
end = content.find('</div>', p)
# Find the NEXT major section
print('Admin perms panel:')
print(content[p:end+100])
print('\n=== WHAT FOLLOWS ADMIN PERMS? ===')
# Find close of admin-view
av = content.find('id="admin-view"')
av_end = content.find('</div>', av)
# Walk forward to find which </div> closes admin-view
div_count = 1
pos = av + len('id="admin-view"')
while div_count > 0 and pos < len(content):
    next_open = content.find('<div', pos)
    next_close = content.find('</div>', pos)
    if next_close < next_open or next_open == -1:
        div_count -= 1
        if div_count == 0:
            print(f'admin-view closes at offset {next_close}')
            print(content[next_close-50:next_close+100])
            break
        pos = next_close + 6
    else:
        div_count += 1
        pos = next_open + 4

# Check what's after admin-view
print('\n=== NEXT 200 chars after admin-view ===')
print(content[next_close+6:next_close+206])
