f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# Strategy: find all literal newlines inside single-quoted JS strings
# These happen when Python writes \n as actual newline instead of literal \n
import re

# Find all instances where a ' is followed by a literal newline before the next ' or ;
patterns = [
    (r"alert\('回访任务列表:\n\s*'", "alert('回访任务列表:\\n'"),
    (r"alert\('"       ,  "alert('"),  # placeholder
]

# More targeted: find all alert/confirm that span multiple lines
fixes = 0
i = 0
while i < len(f):
    # Find alert(' that might span
    c = f[i]
    if c == 'a' and f[i:i+7] == "alert('":
        j = f.find("')", i+7)
        if j == -1:
            j = f.find("');", i+7)
        if j > 0 and '\n' in f[i:j]:
            # This alert has a literal newline inside
            snippet = f[i:j]
            print(f"Found broken alert: {repr(snippet[:100])}")
            fixes += 1
    i += 1

print(f'{fixes} broken alerts found')

# Better approach: search for literal \n in strings
# Find lines that end with ' and next line starts with '
lines = f.splitlines()
for i in range(len(lines)-1):
    cur = lines[i].strip()
    nxt = lines[i+1].strip()
    # Check if current line ends abruptly inside a string
    if (cur.count("'") % 2 == 1) and not cur.endswith('\\'):
        if nxt.startswith("')"): 
            print(f"L{i+1}: {cur[:120]}")
            print(f"L{i+2}: {nxt[:120]}")
