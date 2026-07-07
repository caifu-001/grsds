import sys, io, subprocess, difflib
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def get_big_script(commit):
    r = subprocess.run(["git", "-C", r"D:\1kaifa\grsds", "show", f"{commit}:index.html"],
                       capture_output=True, encoding="utf-8", errors="replace")
    c = r.stdout
    pos = 0
    cnt = 0
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
            if cnt == 2:
                return c[te + 1 : e], c[:s].count("\n") + 1
            cnt += 1
        pos = e + 9
    return "", 0

old_js, old_start = get_big_script("e2555f3")
new_js, new_start = get_big_script("HEAD")

# Only show actual differences
old_lines = old_js.split("\n")
new_lines = new_js.split("\n")

diffs = list(difflib.unified_diff(old_lines, new_lines, lineterm=""))
# Only show substantive changes (skip whitespace-only)
real_diffs = [d for d in diffs if not (
    d.startswith("@@") or 
    d.startswith("---") or 
    d.startswith("+++") or 
    d.strip() == "" or
    (d.startswith("-") and d[1:].strip() == "") or 
    (d.startswith("+") and d[1:].strip() == "")
)]

print(f"Total diff lines: {len(diffs)}, substantive: {len(real_diffs)}")

# Show first 60 real diffs
for d in real_diffs[:80]:
    print(d[:200])
