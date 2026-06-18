# Remove dead #lead-modal (no JS references, ~3KB)
import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the dead lead-modal
modal_start = content.find('id="lead-modal"')
if modal_start < 0:
    print("lead-modal not found")
    exit()

# Find the opening <!--  comment just before it
comment_start = content.rfind('<!--', 0, modal_start)
if comment_start < 0:
    comment_start = modal_start
else:
    # Move to start of the comment line
    while comment_start > 0 and content[comment_start-1] != '\n':
        comment_start -= 1

# Find matching closing </div> for the modal-overlay
depth = 0
pos = content.find('<div', comment_start)
modal_end = modal_start
while pos >= 0 and pos < len(content):
    tag = content[pos:pos+4]
    if tag == '<div' and content[pos+4] in ' >\t':
        depth += 1
    elif content[pos:pos+6] == '</div>':
        depth -= 1
        if depth == 0:
            modal_end = pos + 6
            break
    pos = content.find('<', pos+1)
    if pos < 0:
        break

if modal_end <= modal_start:
    print("ERROR: could not find end of lead-modal")
    exit()

# Remove extra whitespace before the next element
while modal_end < len(content) and content[modal_end] in '\r\n\t ':
    modal_end += 1

removed = content[comment_start:modal_end]
size = len(removed)
line_count = removed.count('\n')

print(f"Removing lead-modal: {line_count} lines, {size} bytes")
print(f"First 80 chars: {removed[:80].strip()}")

content = content[:comment_start] + content[modal_end:]

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

# Verify
dup_ids = {k:v for k,v in __import__('collections').Counter(re.findall(r'id="([^"]+)"', content)).items() if v > 1}
print(f"Lines after: {content.count(chr(10))}")
print(f"Duplicate IDs: {len(dup_ids)}")
if dup_ids:
    for k,v in list(dup_ids.items())[:5]:
        print(f"  {k}: {v}x")
