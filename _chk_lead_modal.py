import re
content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()
# Check references
refs = []
for target in ["lead-modal", "lead-form-modal"]:
    # Check if JS uses getElementById for it (excluding the HTML declaration)
    js = re.findall(r'(?s)<script>(.*?)</script>', content)
    for script in js:
        if ("getElementById('" + target + "')") in script or ('getElementById("' + target + '")') in script:
            refs.append(target)
            break
print("JS references:")
for r in refs:
    print(f"  getElementById('{r}')")

# Check if old lead-modal is used at all in JS
old_refs = []
for line_num, line in enumerate(content.split('\n'), 1):
    if 'lead-modal' in line and 'lead-form-modal' not in line and 'lead-assign-modal' not in line:
        old_refs.append(line_num)
print(f"Old lead-modal refs (lines): {old_refs}")
# Check if old lf-* fields are in the old modal
modal_start = content.find('id="lead-modal"')
modal_end = content.find('<!--', modal_start + 100)
if modal_end < 0:
    modal_end = modal_start + 3000
old_modal = content[modal_start:modal_end]
for fld in ['lf-name', 'lf-contact-name', 'lf-contact-phone', 'lf-notes', 'lf-source', 'lf-status']:
    if f'id="{fld}"' in old_modal:
        print(f"  {fld}: in OLD modal")
