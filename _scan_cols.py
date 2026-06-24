# Scan all SQL files for lead_pool column definitions
import re, os

sql_dir = r"D:\1kaifa\grsds"
cols = set()

for fn in os.listdir(sql_dir):
    if not fn.endswith('.sql'): continue
    with open(os.path.join(sql_dir, fn), 'r', encoding='utf-8') as f:
        text = f.read()
    # ALTER TABLE lead_pool ADD COLUMN IF NOT EXISTS col_name TYPE ...
    for m in re.finditer(r'ALTER\s+TABLE\s+lead_pool\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+(\w+)', text, re.IGNORECASE):
        cols.add(m.group(1))
    # CREATE TABLE columns
    in_create = False
    for line in text.split('\n'):
        if re.search(r'CREATE\s+TABLE.*lead_pool', line, re.IGNORECASE):
            in_create = True
            continue
        if in_create:
            if line.strip().startswith(');') or line.strip().startswith(')') :
                in_create = False
                continue
            m = re.match(r'\s*(\w+)', line)
            if m:
                cols.add(m.group(1))

print("Base table columns (from CREATE + all ALTERs across 32 SQL files):")
for c in sorted(cols):
    print(f"  {c}")
