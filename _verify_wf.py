import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

checks = [
    'wt-modal-overlay',
    'renderWorkflowTemplates',
    'admin-tab-workflows',
    'id="admin-workflows"',
    "tab==='workflows'",
    'openWorkflowTemplateForm',
    'function saveWt',
    'function deleteWt',
    'function showWtModal',
    'function openWtEdit',
    'openWtEdit(',
]
for c in checks:
    print(f'{c}: {h.count(c)}')
