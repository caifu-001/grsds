import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

checks = [
    'function showWtModal',
    'function wfDragStart',
    'function wfDrop',
    'function wfRenderAll',
    'function wfSelectStep',
    'function wfDeleteStep',
    'function wfAutoLayout',
    'function saveWtVisual',
    'function wfNodeDragStart',
    'function wfSetProp',
    'function wfCanvasClick',
    'function wfShowProps',
    'wf-editor',
    'wf-canvas-wrap',
    'wf-props-panel',
    'wf-step-tpl',
    'ondragstart',
    'ondrop',
    'ondragover',
]
for c in checks:
    print(f'{c}: {h.count(c)}')
