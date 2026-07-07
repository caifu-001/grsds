import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Inject diagnostic logging into wfShowProps to surface real cause
# 1. Replace wfSetProp with instrumented version
old = '''function wfSetProp(idx,key,value){
  if(idx<0||idx>=wfEditorSteps.length)return;
  wfEditorSteps[idx][key]=value;
  wfRenderAll();
  if(key==='seq')wfShowProps(idx);
}'''
new = '''function wfSetProp(idx,key,value){
  console.log('[wfSetProp]',{idx,key,value,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetProp] invalid idx');return}
    wfEditorSteps[idx][key]=value;
    wfRenderAll();
    if(key==='seq')wfShowProps(idx);
  }catch(e){console.error('[wfSetProp] error:',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetProp instrumented')
else:
    print('wfSetProp not found as-is, skipping')

# 2. Replace wfSetApproval
old = '''function wfSetApproval(idx,key,val){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:'',onReject:'stay'};
  wfEditorSteps[idx].approval[key]=val;
  wfShowProps(idx);
}'''
new = '''function wfSetApproval(idx,key,val){
  console.log('[wfSetApproval]',{idx,key,val,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetApproval] invalid idx');return}
    if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:'',onReject:'stay'};
    wfEditorSteps[idx].approval[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetApproval] error:',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetApproval instrumented')
else:
    print('wfSetApproval not found')

# 3. Replace wfSetAssignee
old = '''function wfSetAssignee(idx,key,val){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:'dept',value:''};
  wfEditorSteps[idx].assignee[key]=val;
  wfShowProps(idx);
}'''
new = '''function wfSetAssignee(idx,key,val){
  console.log('[wfSetAssignee]',{idx,key,val,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetAssignee] invalid idx');return}
    if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:'dept',value:''};
    wfEditorSteps[idx].assignee[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetAssignee] error:',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetAssignee instrumented')
else:
    print('wfSetAssignee not found')

# 4. Verify: check if panel is a select or input that doesn't accept clicks
# Add end-of-wfShowProps log
old = '''  panel.innerHTML=h;
}
function wfSetApproval(idx,key,val){'''
new = '''  panel.innerHTML=h;
  console.log('[wfShowProps] rendered',idx,'panel.innerHTML.length=',h.length);
}
function wfSetApproval(idx,key,val){'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfShowProps end log')
else:
    print('panel.innerHTML=h transition not found')

# 5. Add a global error handler at the top of script to catch silent errors
old = '''document.getElementById('script-loaded-check').style.display='none';'''
new = '''window.addEventListener('error',function(e){console.error('[global err]',e.message,e.filename,e.lineno)});
window.addEventListener('unhandledrejection',function(e){console.error('[unhandled promise]',e.reason)});
document.getElementById('script-loaded-check').style.display='none';'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: global error handler')
else:
    print('script-loaded-check not found')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('\nSaved')
