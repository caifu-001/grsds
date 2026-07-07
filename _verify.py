import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

c = open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8-sig").read()

checks = [
    ("对比复选框列", "sc-compare-cb", 1),
    ("对比已选过滤开关", "sc-filter-compare", 2),
    ("全选函数 toggleAllCompare", "toggleAllCompare", 2),
    ("表头无多余的毛利率<th>", "headHtml='<tr><th>\\u4ea7\\u54c1</th>'", 1),
    ("表头checkbox列", '<th style="width:32px">对比</th>', 1),
    ("colspan=8", 'colspan="8"', 1),
    ("colspan=14", 'colspan="14"', 1),
    ("表格行checkbox", 'sc-compare-cb" data-id', 1),
]

all_ok = True
for name, pattern, expected in checks:
    cnt = c.count(pattern)
    status = "OK" if cnt >= expected else f"FAIL (got {cnt}, need {expected})"
    if "FAIL" in status:
        all_ok = False
    print(f"  {status}: {name}")

print(f"\n{'ALL PASSED' if all_ok else 'SOME FAILED'}")
