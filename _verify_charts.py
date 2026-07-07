import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

ok = 0
fail = 0

# 1. Chart grouping
idx = c.find("function drawScoutingCategoryCharts")
if idx > 0:
    seg = c[idx:idx + 500]
    if "byProd" in seg or "product_name" in seg:
        print("  PASS: 图表分组改为 product_name")
        ok += 1
    else:
        print("  FAIL: 图表分组未改")
        fail += 1
else:
    print("  FAIL: 图表函数未找到")
    fail += 1

# 2. Margin chart canvas
count = c.count("sc-margin-chart")
if count >= 1:
    print(f"  PASS: 毛利率图表 Canvas ({count}处)")
    ok += 1
else:
    print("  FAIL: 毛利率图表 Canvas 缺失")
    fail += 1

# 3. Compare table header margin
idx2 = c.find("function refreshScoutingCompare")
if idx2 > 0:
    seg2 = c[idx2:idx2 + 5000]
    margin_str1 = "\u6bdb\u5229\u7387"
    if margin_str1 in seg2:
        print("  PASS: 对比表表头含毛利率列")
        ok += 1
    else:
        print("  FAIL: 对比表表头缺毛利率")
        fail += 1
    
    # 4. Margin calculation
    if "itSp>0" in seg2 or "itMargin" in seg2:
        print("  PASS: 对比表含毛利率计算逻辑")
        ok += 1
    else:
        print("  FAIL: 毛利率计算逻辑缺失")
        fail += 1
else:
    print("  FAIL: refreshScoutingCompare 未找到")
    fail += 2

# 5. Product form new fields
for fid in ["pfm-moq", "pfm-sample", "pfm-channel", "pfm-compliance"]:
    if fid in c:
        print(f"  PASS: 产品表单字段 {fid}")
        ok += 1
    else:
        print(f"  FAIL: 产品表单字段 {fid} 缺失")
        fail += 1

print(f"\n--- {ok} pass, {fail} fail ---")
