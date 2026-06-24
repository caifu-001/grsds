import re
path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    h = f.read()

# Check if opp-form-overlay exists as an id
m = re.findall(r'id=.opp-form[^"\s>]*', h)
print("All opp-form IDs:", m)
print()
print("opp-form-overlay in HTML:", 'id="opp-form-overlay"' in h)

# Show line around opp-form-overlay
for match in re.finditer(r'opp-form-overlay', h):
    start = max(0, match.start()-50)
    end = min(len(h), match.end()+100)
    print(f"\nAt char {match.start()}:")
    print(h[start:end])
