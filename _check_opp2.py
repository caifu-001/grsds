import re
with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    h = f.read()

overlay_refs = re.findall(r"[^-]opp-form-overlay", h)
modal_refs = re.findall(r"[^-]opp-form-modal", h)
print("opp-form-overlay (not prefixed) JS refs:", len(overlay_refs))
print("opp-form-modal (not prefixed) JS refs:", len(modal_refs))
print()
for m in re.finditer(r"[^-]opp-form-overlay", h):
    start = max(0, m.start()-30)
    end = min(len(h), m.end()+60)
    print(f"  char {m.start()}: ...{h[start:end].strip()}...")
print()
for m in re.finditer(r"[^-]opp-form-modal", h):
    start = max(0, m.start()-30)
    end = min(len(h), m.end()+60)
    print(f"  char {m.start()}: ...{h[start:end].strip()}...")
