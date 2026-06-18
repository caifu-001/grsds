import re
content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# Find dead lead-modal
pos = content.find('id="lead-modal"')
if pos < 0:
    print("lead-modal not found")
else:
    line = content[:pos].count('\n') + 1
    
    # Find size
    depth = 0
    i = content.find('<div', pos)
    while i >= 0 and i < len(content):
        if content[i:i+4] == '<div' and (i+4 >= len(content) or content[i+4] in ' >\t'):
            depth += 1
        elif content[i:i+6] == '</div>':
            depth -= 1
            if depth == 0:
                size = i + 6 - pos
                break
        i = content.find('<', i+1)
    
    print(f"Dead #lead-modal at line {line}, ~{size//1024}KB")

# Check JS references  
js = re.findall(r'(?s)<script>(.*?)</script>', content)
all_js = '\n'.join(js)
if "lead-modal" in all_js and "lead-form-modal" not in all_js:
    print("lead-modal IS referenced in JS")
else:
    print("lead-modal: NO JS references (dead code)")
    
# Also check if old sales-leads-panel is still used  
if "sales-leads-panel" in all_js:
    print("sales-leads-panel: still used in JS (keep)")
else:
    print("sales-leads-panel: NO JS references")
