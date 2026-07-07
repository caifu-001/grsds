import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Fix the UUID quoting in onFWClientInput
old = "h+='<div class=\"name-suggestion-item'+(i===0?' active':'')+'\" onmousedown=\"selectFWClient('+matches[i].id+')\">'+escHtml(matches[i].name)+'</div>';"
new = "h+='<div class=\"name-suggestion-item'+(i===0?' active':'')+'\" onmousedown=\"selectFWClient(\\''+matches[i].id+'\\')\">'+escHtml(matches[i].name)+'</div>';"

if old in c:
    c = c.replace(old, new)
    print("OK: Fixed UUID quoting in onFWClientInput")
else:
    print("FAIL: UUID quoting fix not found")
    idx = c.find("onmousedown=\"selectFWClient(")
    if idx > 0:
        print("Context:", repr(c[idx-5:idx+120]))

# Also fix the closeVisitForm which was found in Fix E
# The old closeVisitForm has `document.getElementById('fw-vm-client').val` (truncated)
# Let me find the actual closeVisitForm and make sure it's clean
idx_close = c.find("function closeVisitForm(){")
if idx_close > 0:
    # Find the end
    end = c.find("\n}\n", idx_close + 30)
    if end < 0:
        end = c.find("\n}", idx_close + 30)
    if end > 0:
        ctx = c[idx_close:end+3]
        print("\ncloseVisitForm:")
        print(ctx)

# Also check: does openVisitForm (回访) have client autocomplete? Let me find it
idx_ov = c.find("function openVisitForm(")
if idx_ov > 0:
    end_ov = c.find("\nfunction ", idx_ov + 10)
    if end_ov < 0:
        end_ov = idx_ov + 2000
    ctx = c[idx_ov:end_ov]
    print("\nopenVisitForm (first 500 chars):")
    print(ctx[:500])

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
print("\nDone")
