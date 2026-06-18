# Fix duplicate lf-* IDs in old dead lead-modal
import re

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the old lead-modal boundaries
modal_start = content.find('id="lead-modal"')
# Find where this modal div ends (matching </div></div> pair)
# Look for the next <!-- comment that marks a new section
next_comment = content.find('<!--', modal_start + 100)
# Actually find the matching closing tags
# Count nested divs
depth = 0
pos = content.find('<div', modal_start)
modal_end = modal_start
while pos >= 0:
    if content[pos:pos+4] == '<div' and content[pos+4] in ' >':
        depth += 1
    elif content[pos:pos+6] == '</div>':
        depth -= 1
        if depth == 0:
            modal_end = pos + 6
            break
    pos += 1
    if pos >= len(content) - 1:
        break
    pos = content.find('<', pos)
    if pos < 0:
        break

if modal_end <= modal_start:
    print("ERROR: could not find end of lead-modal")
    import sys; sys.exit(1)

# Extract old modal content
old_modal = content[modal_start:modal_end]
print(f"Old modal: {modal_start} to {modal_end} ({modal_end - modal_start} bytes)")

# Rename lf-* IDs to old-lf-*
fields = ['lf-name', 'lf-contact-name', 'lf-contact-phone', 'lf-notes', 'lf-source', 'lf-status', 'lf-company', 'lf-value', 'lf-expected-date', 'lf-probability', 'lf-owner']
new_modal = old_modal
for fld in fields:
    new_modal = new_modal.replace(f'id="{fld}"', f'id="old-{fld}"')

changes = 1 if new_modal != old_modal else 0
content = content[:modal_start] + new_modal + content[modal_end:]

if changes > 0:
    print("OK: renamed lf-* IDs in old lead-modal")
else:
    print("SKIP: no lf-* IDs found in old modal")

# Also rename the old form-title (we already changed first one to class)
# Check if there's a dummy-form-title that should be an ID
# Count remaining dupes
ids = re.findall(r'id="([^"]+)"', content)
from collections import Counter
dupes = {k:v for k,v in Counter(ids).items() if v > 1}
print(f"Remaining duplicate IDs: {len(dupes)}")
for k, v in sorted(dupes.items()):
    print(f"  {k}: {v}x")

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"Changes: {changes}")
