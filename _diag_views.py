import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Look at raw HTML around service-view, analytics-view, collab-view, projects-view
for vid in ["service-view", "analytics-view", "collab-view", "projects-view"]:
    idx = c.find(f'id="{vid}"')
    if idx < 0: idx = c.find(f"id='{vid}'")
    if idx < 0:
        print(f"{vid}: NOT FOUND in HTML")
        continue
    # Show surrounding context
    ctx = c[max(0,idx-50):idx+500]
    print(f"\n=== {vid} (at char {idx}) ===")
    # Find the closing </div> for this specific element
    # Count nested divs
    depth = 0
    started = False
    inner_start = c.find(">", idx) + 1
    for i in range(inner_start, min(inner_start + 5000, len(c))):
        tag = c[i:i+4]
        if tag == "<div":
            depth += 1
        elif tag == "</di" and c[i:i+6] == "</div>":
            if depth == 0:
                inner = c[inner_start:i]
                print(f"  innerHTML: {len(inner)} chars")
                print(f"  first/last 100: '{inner[:100].strip()}' ... '{inner[-100:].strip()}'")
                # Check for analytics panels inside
                for sub in ["an-overview", "an-sales-funnel", "an-collection", "an-profit", "an-client-health"]:
                    if sub in inner:
                        print(f"  ✓ contains {sub}")
                for sub in ["sv-tickets", "sv-visits", "sv-warranty", "sv-kb"]:
                    if sub in inner:
                        print(f"  ✓ contains {sub}")
                for sub in ["collab-panel", "mo-panel"]:
                    if sub in inner:
                        print(f"  ✓ contains {sub}")
                for sub in ["project-list", "project-detail"]:
                    if sub in inner:
                        print(f"  ✓ contains {sub}")
                break
            depth -= 1
        elif tag == "</ta":
            # not a div
            pass
