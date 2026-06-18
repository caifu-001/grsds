import re
html = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()
lines = html.splitlines()

# Lead form HTML section
print("=== Lead Form HTML ===")
for i, l in enumerate(lines):
    lo = l.strip()
    if 'lead-form-modal' in lo.lower():
        print(f'L{i+1}: {lo[:150]}')
    if re.search(r'\blf-(name|company|contact|source|industry|scale|status|notes)\b', lo) and '<' in lo:
        print(f'L{i+1}: {lo[:150]}')

print("\n=== openLeadForm / autocomplete / useCompanyName ===")
for i, l in enumerate(lines):
    lo = l.strip()
    if 'function openLeadForm' in lo or 'useCompanyName' in lo or 'autocomplete' in lo.lower():
        print(f'L{i+1}: {lo[:150]}')
