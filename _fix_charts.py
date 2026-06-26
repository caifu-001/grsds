import re

with open('_last_script.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Find all new Chart(ctx,{ and check what follows the final } of config
pattern = re.compile(r'new Chart\(ctx,\{')
issues = []

for m in pattern.finditer(js):
    pos = m.start()
    # Track: we're inside new Chart(ctx,{config})
    # config = { type, data, options }
    # After the final } of config, should be );
    
    brace_depth = 0
    in_single = False
    in_double = False
    in_template = False
    end = -1
    
    # The { in "ctx,{" is the config opener
    # Find it
    config_start = js.index('{', pos)
    brace_depth = 1
    
    i = config_start + 1
    while i < len(js) and brace_depth > 0:
        c = js[i]
        if c == '\\':
            i += 2
            continue
        if c == "'" and not in_double and not in_template:
            in_single = not in_single
        elif c == '"' and not in_single and not in_template:
            in_double = not in_double
        elif c == '`' and not in_single and not in_double:
            in_template = not in_template
        elif not in_single and not in_double and not in_template:
            if c == '{':
                brace_depth += 1
            elif c == '}':
                brace_depth -= 1
        i += 1
    
    end = i - 1  # position of the matching }
    
    # Now check what follows
    after = js[end+1:end+20].strip()
    if not after.startswith(');'):
        line = js[:end].count('\n') + 1
        # Show context
        snippet = js[max(0,end-60):end+5].replace('\n', '\\n')
        issues.append((line, end, after[:30], snippet))
        print(f'Line {line}: after config }} = {repr(after[:15])}\n  ...{snippet}...\n')

print(f'Total: {len(issues)} issues')
