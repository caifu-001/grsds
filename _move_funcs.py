f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()
lines=f.splitlines(keepends=True)

# Lines to extract (0-indexed): L9634-L9688 = index [9633:9688]
# Target insertion: before L2933 = before index 2932

# Extract the function definitions block
# L9634 is blank, L9635 is function renderClientTags... L9688 is the blank before /* ===== EMPLOYEE
func_block = lines[9633:9688]  # 0-indexed

# Delete from source (reverse order to maintain indices)
del lines[9633:9688]

# Insert before L2933 (now need to account for the deletion)
# deleted 55 lines, so original L2933 is now at index 2932-55 = 2877... no wait
# After deletion, need to find 'async function openForm(' again
# Let me do it the clean way:

new_f = ''.join(lines)
idx = new_f.find('async function openForm(')
# Insert the block before this
new_lines = list(new_f)
# But this is messy with string manipulation

# Better approach: rebuild from lines
# First, find openForm in the post-deletion lines
for i, line in enumerate(lines):
    if 'async function openForm(' in line:
        # Insert the block before this line
        lines[i:i] = func_block
        break

open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8').write(''.join(lines))
print('Done')
