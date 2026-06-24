import re, sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Replace he( only at word boundary (preceded by non-word char or start)
# Pattern: lookbehind for \b (word boundary) then he(
# Actually easier: find all he( occurrences and check if it's standalone
count = 0
def replacer(m):
    global count
    before = m.group(1)  # the char before 'he('
    # Only replace if before is not a word char (not part of "the(" or "cache(")
    if not before.isalnum() and before != '_':
        count += 1
        return before + 'escHtml('
    return m.group(0)

h2 = re.sub(r'(.)he\(', replacer, h, flags=re.DOTALL)
# Also handle he( at start of string
if h.startswith('he('):
    h2 = 'escHtml(' + h2[3:]
    count += 1

print(f"Replaced {count} he( -> escHtml(")

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h2)

print("Done")
