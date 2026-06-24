import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Check remaining he( occurrences in WF section
wf_start = h.find('/* ===== WORKFLOW TEMPLATES ===== */')
wf_end = h.find('/* ===== EXTEND PERMISSION MATRIX ===== */')
wf = h[wf_start:wf_end]
print(f"Remaining he( in WF section: {wf.count('he(')}")
print(f"escHtml( in WF section: {wf.count('escHtml(')}")
print(f"escHtml( in whole file: {h.count('escHtml(')}")
