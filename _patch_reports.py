#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CRM 报表与BI分析模块 — 升级补丁脚本
将 _reports_new_html.txt 和 _reports_new_js.txt 的内容注入 index.html
"""
import os, sys, shutil, re

BASE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(BASE, 'index.html')
BAK = os.path.join(BASE, 'index.html.bak')
HTML_NEW = os.path.join(BASE, '_reports_new_html.txt')
JS_NEW = os.path.join(BASE, '_reports_new_js.txt')

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def read_lines(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.readlines()

def write_lines(path, lines):
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)

def count_braces(text):
    """统计花括号平衡情况"""
    opens = text.count('{')
    closes = text.count('}')
    return opens, closes, opens - closes

def count_functions(text):
    """统计 function 声明数量"""
    return len(re.findall(r'\bfunction\s+\w+\s*\(', text))

# ── 1. 备份 ──
print('[1/7] 备份 index.html → index.html.bak')
shutil.copy2(HTML, BAK)
print(f'      备份完成: {BAK}')

# ── 2. 读取原始文件 ──
print('[2/7] 读取原始文件...')
orig_lines = read_lines(HTML)
orig_count = len(orig_lines)
print(f'      原始行数: {orig_count}')

# ── 3. 读取替换内容 ──
print('[3/7] 读取替换内容...')
html_replacement = read_file(HTML_NEW)
js_replacement = read_file(JS_NEW)

html_new_lines = html_replacement.splitlines(keepends=True)
js_new_lines = js_replacement.splitlines(keepends=True)

# 确保最后一行有换行符
def ensure_newline(lines):
    if lines and not lines[-1].endswith('\n'):
        lines[-1] += '\n'
    return lines

html_new_lines = ensure_newline(html_new_lines)
js_new_lines = ensure_newline(js_new_lines)

print(f'      HTML替换内容: {len(html_new_lines)} 行')
print(f'      JS替换内容:   {len(js_new_lines)} 行')

# ── 4. 执行替换（从高行号到低行号，避免偏移） ──
print('[4/7] 执行代码替换...')

# 原始代码段行号（1-indexed → 0-indexed）
# JS: 3280-3450
JS_START = 3280 - 1  # 0-indexed: 3279
JS_END   = 3450       # 0-indexed exclusive: 3450

# HTML: 1631-1672
HTML_START = 1631 - 1  # 0-indexed: 1630
HTML_END   = 1672       # 0-indexed exclusive: 1672

# 替换JS（先替换高行号段）
print('      → 替换报表JS (行3280-3450)')
orig_js_block = ''.join(orig_lines[JS_START:JS_END])
new_lines = orig_lines[:JS_START] + js_new_lines + orig_lines[JS_END:]

# 替换HTML
print('      → 替换报表HTML (行1631-1672)')
orig_html_block = ''.join(new_lines[HTML_START:HTML_END])
new_lines = new_lines[:HTML_START] + html_new_lines + new_lines[HTML_END:]

# ── 5. 插入新CSS样式 ──
print('[5/7] 插入新CSS样式...')
# 在 /* Reports */ 区的 @media 行之后插入新CSS
# 查找位置: 包含 "@media" 且包含 ".chart-bar" 的行（Reports区的@media）
css_insert_idx = None
for i, line in enumerate(new_lines):
    if '@media' in line and '.chart-bar' in line:
        css_insert_idx = i + 1  # 在该行之后插入
        break

if css_insert_idx is None:
    print('      ⚠ 未找到Reports @media行，尝试备选方案...')
    # 备选：在 "/* Notifications */" 之前插入
    for i, line in enumerate(new_lines):
        if line.strip().startswith('/* Notifications */'):
            css_insert_idx = i
            break

if css_insert_idx is None:
    print('      ⚠ 警告：无法定位CSS插入位置，跳过CSS插入')
else:
    new_css = """
/* Reports BI - 新增样式 */
.report-chart-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.report-metric{font-size:36px;font-weight:700;text-align:center;padding:8px 0}
@media(max-width:480px){.report-chart-row{grid-template-columns:1fr}}
"""
    css_lines = new_css.splitlines(keepends=True)
    css_lines = ensure_newline(css_lines)
    new_lines = new_lines[:css_insert_idx] + css_lines + new_lines[css_insert_idx:]
    print(f'      在行{css_insert_idx+1}处插入{len(css_lines)}行CSS')

# ── 6. 写入 ──
print('[6/7] 写入 index.html...')
write_lines(HTML, new_lines)
new_count = len(new_lines)
print(f'      新行数: {new_count} (变化: {new_count - orig_count:+d})')

# ── 7. 验证JS语法 ──
print('[7/7] 验证JS语法...')

# 提取<script>标签内的所有JS代码
full_html = ''.join(new_lines)
script_match = re.findall(r'<script>(.*?)</script>', full_html, re.DOTALL)
if not script_match:
    script_match = re.findall(r'<script[^>]*>(.*?)</script>', full_html, re.DOTALL)

js_code = '\n'.join(script_match)
opens, closes, diff = count_braces(js_code)
func_count = count_functions(js_code)

print(f'      花括号: {{ {opens}  }} {closes}  (差值: {diff})')
print(f'      函数声明: {func_count}')

if diff == 0:
    print('      ✓ 花括号平衡')
else:
    print(f'      ✗ 花括号不平衡! 差值={diff}')

# 验证新JS段的花括号
new_js_opens, new_js_closes, new_js_diff = count_braces(js_replacement)
new_js_funcs = count_functions(js_replacement)
print(f'      新报表JS: {{ {new_js_opens}  }} {new_js_closes}  (差值: {new_js_diff}), 函数: {new_js_funcs}')

if new_js_diff == 0:
    print('      ✓ 新报表JS花括号平衡')
else:
    print(f'      ✗ 新报表JS花括号不平衡! 差值={new_js_diff}')

# 打印汇总
print('')
print('=' * 56)
print('  升级完成!')
print(f'  原始行数: {orig_count}')
print(f'  新行数:   {new_count}')
print(f'  变化:     {new_count - orig_count:+d} 行')
print(f'  备份文件: {BAK}')
print('=' * 56)
