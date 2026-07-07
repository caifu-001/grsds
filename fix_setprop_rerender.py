import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Real fix: wfSetProp should re-render panel for all changes
# But the new instrumented version is too verbose. Let me make it cleaner.

# Step 1: Replace the instrumented wfSetProp with a clean fix
old = '''function wfSetProp(idx,key,value){
  console.log('[wfSetProp]',{idx,key,value,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetProp] invalid idx');return}
    wfEditorSteps[idx][key]=value;
    wfRenderAll();
    if(key==='seq')wfShowProps(idx);
  }catch(e){console.error('[wfSetProp] error:',e)}
}'''
new = '''function wfSetProp(idx,key,value){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    wfEditorSteps[idx][key]=value;
    wfRenderAll();
    wfShowProps(idx);  // always re-render panel so select/input show new values
  }catch(e){console.error('[wfSetProp]',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetProp re-renders panel always')
else:
    print('Instrumented wfSetProp not found, trying original')
    old2 = '''function wfSetProp(idx,key,value){
  if(idx<0||idx>=wfEditorSteps.length)return;
  wfEditorSteps[idx][key]=value;
  wfRenderAll();
  if(key==='seq')wfShowProps(idx);
}'''
    if old2 in c:
        c = c.replace(old2, new)
        print('FIXED: wfSetProp (clean version)')
    else:
        print('Not found')

# Step 2: Make sure wfSetApproval/wfSetAssignee are clean (no verbose console)
old = '''function wfSetApproval(idx,key,val){
  console.log('[wfSetApproval]',{idx,key,val,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetApproval] invalid idx');return}
    if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:'',onReject:'stay'};
    wfEditorSteps[idx].approval[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetApproval] error:',e)}
}'''
new = '''function wfSetApproval(idx,key,val){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:'',onReject:'stay'};
    wfEditorSteps[idx].approval[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetApproval]',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetApproval (clean)')
else:
    print('wfSetApproval instrumented not found')

old = '''function wfSetAssignee(idx,key,val){
  console.log('[wfSetAssignee]',{idx,key,val,stepsLen:wfEditorSteps?wfEditorSteps.length:0});
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn('[wfSetAssignee] invalid idx');return}
    if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:'dept',value:''};
    wfEditorSteps[idx].assignee[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetAssignee] error:',e)}
}'''
new = '''function wfSetAssignee(idx,key,val){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:'dept',value:''};
    wfEditorSteps[idx].assignee[key]=val;
    wfShowProps(idx);
  }catch(e){console.error('[wfSetAssignee]',e)}
}'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: wfSetAssignee (clean)')
else:
    print('wfSetAssignee instrumented not found')

# Step 3: Remove diagnostic console.log in wfShowProps end
old = '''  panel.innerHTML=h;
  console.log('[wfShowProps] rendered',idx,'panel.innerHTML.length=',h.length);
}
function wfSetApproval(idx,key,val){'''
new = '''  panel.innerHTML=h;
}
function wfSetApproval(idx,key,val){'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: removed wfShowProps end log')

# Step 4: Remove global error handler (keep it for future debug)
# Actually, keep it - it's harmless and useful
# But remove the noisy saveWtVisual console.logs
old = '''  var steps=[];
  console.log("saveWtVisual: saving",wfEditorSteps.length,"steps");
  for(var i=0;i<wfEditorSteps.length;i++){
    var s=Object.assign({},wfEditorSteps[i]);
    delete s._x;delete s._y;
    if(s.approval)console.log("  step",i,"approval:",JSON.stringify(s.approval));
    if(s.assignee)console.log("  step",i,"assignee:",JSON.stringify(s.assignee));
    steps.push(s);
  }'''
new = '''  var steps=[];
  for(var i=0;i<wfEditorSteps.length;i++){
    var s=Object.assign({},wfEditorSteps[i]);
    delete s._x;delete s._y;
    steps.push(s);
  }'''
if old in c:
    c = c.replace(old, new)
    print('FIXED: removed saveWtVisual verbose logs')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('\nSaved')
