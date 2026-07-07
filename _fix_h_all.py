import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

# Check: are there functions named "h" defined? Or is it always a standalone escape function?
# Look for "function h(" definition
def_count = len(re.findall(r'\bfunction h\(', c))
print(f"function h( definitions: {def_count}")

# Find all unique patterns where h( appears
matches = list(re.finditer(r'(?<!\w)h\(', c))
print(f"Total h( matches (word boundary): {len(matches)}")

# Show the first few to understand context
for i, m in enumerate(matches[:5]):
    start = max(0, m.start() - 15)
    end = min(len(c), m.end() + 40)
    ctx = c[start:end].replace("\n", "\\n")
    print(f"  {i+1}: ...{ctx}...")

# If h is not defined as a function and is always used as an escape, replace all
# But first check if there's a var h = ... or const h = ...
if def_count == 0:
    var_h = len(re.findall(r'\bvar h\s*=', c))
    const_h = len(re.findall(r'\bconst h\s*=', c))
    let_h = len(re.findall(r'\blet h\s*=', c))
    print(f"var h=: {var_h}, const h=: {const_h}, let h=: {let_h}")
    if var_h + const_h + let_h == 0:
        print("h is NOT defined anywhere - replacing all with escHtml")
        # But careful: don't replace inside strings or in hex/other contexts
        # Pattern: h( preceded by a non-identifier char
        new_c = re.sub(r'(?<!\w)h\(', 'escHtml(', c)
        with open(p, "w", encoding="utf-8-sig", newline="") as f:
            f.write(new_c.replace("\n", "\r\n"))
        remaining = len(re.findall(r'(?<!\w)h\(', new_c))
        print(f"Remaining h( after: {remaining}")
        import os
        print(f"Size: {os.path.getsize(p)/1024:.1f} KB")
    else:
        print("h has a definition, being careful...")
        # Just replace the known 4 h(m patterns explicitly
        c = c.replace("+h(matches[i].name)+", "+escHtml(matches[i].name)+")
        c = c.replace("'pf-company-name').value='+h(matches[i].name)+'", "'pf-company-name').value='+escHtml(matches[i].name)+'")
        with open(p, "w", encoding="utf-8-sig", newline="") as f:
            f.write(c.replace("\n", "\r\n"))
else:
    print("h is defined as a function")
