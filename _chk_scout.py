import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Find scouting modal HTML
idx = c.find('id="scouting-modal"')
if idx > 0:
    print(c[idx:idx + 3500])

print("\n\n=== openScoutingForm ===")
idx2 = c.find("function openScoutingForm")
if idx2 > 0:
    end2 = c.find("\nfunction ", idx2 + 10)
    print(c[idx2:end2])

print("\n\n=== saveScouting ===")
idx3 = c.find("function saveScouting")
if idx3 > 0:
    end3 = c.find("\nfunction ", idx3 + 10)
    print(c[idx3:end3])
