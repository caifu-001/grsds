#!/usr/bin/env python3
# -*- coding: utf-8 -*-
src = open('_reports_new_js.txt', encoding='utf-8').read()
idx = src.find('async function renderDashboardCard')
end = src.find('function exportReportCSV')
func = src[idx:end]
lines = func.split('\n')
depth = 0
for i, line in enumerate(lines):
    opens = line.count('{')
    closes = line.count('}')
    if opens or closes:
        depth += opens - closes
        if depth < 0:
            print(f'L{i+1} NEGATIVE depth={depth}: {line.rstrip()[:150]}')
    if i >= 65:  # print from middle to end
        print(f'L{i+1} [{opens:+d}/{closes:+d}] d={depth}: {line.rstrip()[:150]}')
print()
print('FINAL depth:', depth)
print('Total lines:', len(lines))
