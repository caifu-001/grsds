import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Fix: \u0027 in HTML attributes is not interpreted as JS string escape
# Replace \u0027Enter\u0027  with  &#39;Enter&#39;  (HTML entities work in attributes)
old = "\\u0027Enter\\u0027"
new = "&#39;Enter&#39;"
count = c.count(old)
c = c.replace(old, new)
print(f"Fixed {count} occurrences of \\u0027Enter\\u0027 in HTML attributes")

# Also check for any other \u0027 in HTML attributes (not in JS blocks)
# Find all \u0027 in the file
import re
remaining = c.count("\\u0027")
print(f"Remaining \\u0027 occurrences: {remaining}")
if remaining > 0:
    for m in re.finditer(r'\\u0027', c):
        ctx = c[max(0,m.start()-30):m.end()+30]
        ln = c[:m.start()].count("\n") + 1
        # Only show if it's inside an HTML attribute (not in a JS code block)
        line = c.split("\n")[ln-1]
        is_html_attr = ('onclick="' in line or 'onkeydown="' in line or 'oninput="' in line or 'onblur="' in line)
        if is_html_attr:
            print(f"  Line {ln}: ...{ctx}...")

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
