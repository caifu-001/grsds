import sys, io, subprocess
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Compare the big script between current HEAD and last known working version
# Last working was probably f456552
for commit in ["f456552", "e2555f3"]:
    r = subprocess.run(["git", "-C", r"D:\1kaifa\grsds", "show", f"{commit}:index.html"],
                       capture_output=True, encoding="utf-8", errors="replace")
    c = r.stdout
    
    # Extract the big inline script
    pos = 0
    script_count = 0
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
            if script_count == 2:  # 3rd inline = big one
                js = c[te + 1 : e]
                # Balance braces
                depth = 0
                for ch in js:
                    if ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                print(f"\nCommit {commit}: big script {len(js)} chars, brace diff={depth}")
                
                # Node check
                import tempfile, os as _os
                tmp = tempfile.mktemp(suffix=".js")
                try:
                    with open(tmp, "w", encoding="utf-8") as f:
                        f.write(js)
                    r2 = subprocess.run(["node", "--check", tmp], capture_output=True, text=True, timeout=15)
                    if r2.returncode != 0:
                        print(f"  Node error: {r2.stderr[:300]}")
                    else:
                        print("  Node: OK")
                except Exception as e:
                    print(f"  Node: {e}")
                finally:
                    try: _os.unlink(tmp)
                    except: pass
            script_count += 1
        pos = e + 9
