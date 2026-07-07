import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Check key functions called by switchTab
for fn_name in ["switchAnalyticsTab", "switchProjectTab", "switchServiceTab", "switchCollabTab"]:
    cnt = c.count(f"function {fn_name}(")
    print(f"function {fn_name}: {'EXISTS' if cnt > 0 else 'MISSING'} ({cnt})")

# Check service-view content
idx = c.find('id="service-view"')
if idx > 0:
    end = c.find("</div>", idx + 50)
    tag_end = c.find(">", idx)
    inner_start = tag_end + 1
    # Find closing tag by balance
    depth = 0
    started = False
    end2 = inner_start
    for i in range(inner_start, len(c)):
        if c[i:i+4] == "</div":
            if depth == 0:
                end2 = i
                break
            depth -= 1
        elif c[i:i+4] == "<div":
            depth += 1
    snippet = c[inner_start:end2]
    print(f"\nservice-view innerHTML: {len(snippet)} chars")
    print(snippet[:300])

# Check analytics-view content
idx = c.find('id="analytics-view"')
if idx > 0:
    tag_end = c.find(">", idx)
    inner_start = tag_end + 1
    depth = 0
    end2 = inner_start
    for i in range(inner_start, len(c)):
        if c[i:i+4] == "</div":
            if depth == 0:
                end2 = i
                break
            depth -= 1
        elif c[i:i+4] == "<div":
            depth += 1
    snippet = c[inner_start:end2]
    print(f"\nanalytics-view innerHTML: {len(snippet)} chars")
    print(snippet[:500])

# Check collab-view content
idx = c.find('id="collab-view"')
if idx > 0:
    tag_end = c.find(">", idx)
    inner_start = tag_end + 1
    depth = 0; end2 = inner_start
    for i in range(inner_start, len(c)):
        if c[i:i+4] == "</div":
            if depth == 0: end2 = i; break
            depth -= 1
        elif c[i:i+4] == "<div": depth += 1
    snippet = c[inner_start:end2]
    print(f"\ncollab-view innerHTML: {len(snippet)} chars")
    print(snippet[:300])

# Check projects-view
idx = c.find('id="projects-view"')
if idx > 0:
    tag_end = c.find(">", idx)
    inner_start = tag_end + 1
    depth = 0; end2 = inner_start
    for i in range(inner_start, len(c)):
        if c[i:i+4] == "</div":
            if depth == 0: end2 = i; break
            depth -= 1
        elif c[i:i+4] == "<div": depth += 1
    snippet = c[inner_start:end2]
    print(f"\nprojects-view innerHTML: {len(snippet)} chars")
    print(snippet[:300])
