import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Add diagnostic info to wfShowProps when rendering approval/assignee sections
# Find the lines that build approval section
# Replace: var appr=s.approval||{enabled:false,approverRole:'',onReject:'stay'};
# with version that logs the data

old = '''  var appr=s.approval||{enabled:false,approverRole:'',onReject:'stay'};'''
new = '''  var appr=s.approval||{enabled:false,approverRole:'',onReject:'stay'};
  if(window.__wfDiag)console.log('[wfShowProps] idx='+idx,'approval=',JSON.stringify(appr),'s.key='+s.key);'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: appr diagnostic log added')

# add a helper to enable diag from console
old = '''window.addEventListener('error',function(e){console.error('[global err]',e.message,e.filename,e.lineno)});
window.addEventListener('unhandledrejection',function(e){console.error('[unhandled promise]',e.reason)});'''
new = '''window.addEventListener('error',function(e){console.error('[global err]',e.message,e.filename,e.lineno)});
window.addEventListener('unhandledrejection',function(e){console.error('[unhandled promise]',e.reason)});
window.__wfDiag=true;  // toggle workflow diagnostics (set false in console to silence)'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: __wfDiag flag enabled')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Saved')
