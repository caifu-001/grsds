import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# 1. Scouting modal form HTML
idx = c.find('id="scouting-modal"')
print("=== 选品弹窗HTML (前4000) ===")
print(c[idx:idx + 4000])

print("\n\n=== openScoutingForm ===")
idx2 = c.find("function openScoutingForm")
end2 = c.find("\nfunction ", idx2 + 10)
print(c[idx2:end2])

print("\n\n=== saveScouting ===")
idx3 = c.find("function saveScouting")
end3 = c.find("\nfunction ", idx3 + 10)
print(c[idx3:end3])

print("\n\n=== approveScouting (一键入库) ===")
idx4 = c.find("function approveScouting")
end4 = c.find("\nfunction ", idx4 + 10)
print(c[idx4:end4])

# 2. Analysis area HTML
print("\n\n=== 分析区域HTML (scouting-compare) ===")
idx5 = c.find("scouting-compare-head")
if idx5 > 0:
    # Find enclosing section
    start5 = c.rfind("<div", idx5 - 500, idx5)
    end5 = c.find("</div>", idx5 + 2000)
    print(c[start5:end5 + 6])
