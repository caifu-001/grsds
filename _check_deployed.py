import sys, io, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Get deployed version from git
r = subprocess.run(["git", "-C", r"D:\1kaifa\grsds", "show", "HEAD:index.html"],
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
c = r.stdout

print(f"Size: {len(c)} bytes")
print(f"First bytes hex: {c[:20].encode('utf-8').hex()}")

# Find all inline scripts
pos = 0
count = 0
while True:
    s = c.find("<script", pos)
    if s < 0:
        break
    te = c.find(">", s)
    e = c.find("</script>", te)
    if e < 0:
        break
    tag = c[s : te + 1]
    if "src=" not in tag:
        js_content = c[te + 1 : e]
        if count == 0:
            # First big script
            depth = 0
            for ch in js_content:
                if ch == "{":
                    depth += 1
                elif ch == "}":
                    depth -= 1
            print(f"Main inline script: {len(js_content)} chars, brace diff: {depth}")
        else:
            print(f"Inline script #{count}: {len(js_content)} chars")
    else:
        print(f"External script: {tag[:80]}...")
    count += 1
    pos = e + 9

print(f"\nTotal script blocks: {count}")
