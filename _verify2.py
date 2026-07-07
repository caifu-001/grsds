import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

c = open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8-sig").read()

checks = [
    ("横向对比筛选栏", "sc-cmp-filter-name", 1),
    ("分类筛选下拉", "sc-cmp-filter-cat", 2),
    ("状态筛选下拉", "sc-cmp-filter-status", 2),
    ("隐藏无报价开关", "sc-cmp-ignore-noprice", 2),
    ("横向对比容器", "scouting-compare-container", 2),
    ("横向表头: 供应商|渠道|采购价|销售价|毛利率|佣金|MOQ|样品|合规|参数|状态", "escHtml(it.supplier_name||'-')+', checks=['供应商'], '|', 'escHtml(it.supplier_name')'", 1),
    ("供应商为行的横向表", "escHtml(it.supplier_name||'-')</b></td>", 1),
    ("按产品分组的div", "prodGroups[", 2),
    ("税后毛利率计算", "taxRate/100):0", 1),
    ("对比筛选联动", "cmpFiltered.push", 2),
    ("采购价最低绿色高亮", "itPp===minPrice", 1),
]

all_ok = True
for name, pattern, expected in checks:
    cnt = c.count(pattern)
    status = "OK" if cnt >= expected else f"FAIL (got {cnt}, need {expected})"
    if "FAIL" in status:
        all_ok = False
    print(f"  {status}: {name}")

print(f"\n{'ALL PASSED' if all_ok else 'SOME FAILED'}")

# Print snippet of the new compare table section
import re
m = re.search(r'escHtml\(it\.supplier_name', c)
if m:
    idx = m.start()
    print(f"\n=== new compare body snippet ===")
    print(c[idx:idx+300])
