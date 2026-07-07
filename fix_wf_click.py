import sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

fixes = 0

# 1. wfSetApproval — add try/catch + logs
old = 'function wfSetApproval(idx,key,val){\n  if(idx<0||idx>=wfEditorSteps.length)return;\n  if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:"",onReject:"stay"};\n  wfEditorSteps[idx].approval[key]=val;\n  wfShowProps(idx);\n}'
new = 'function wfSetApproval(idx,key,val){\n  console.log("wfSetApproval",idx,key,val,"steps:",wfEditorSteps?wfEditorSteps.length:undefined);\n  try{\n    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn("wfSetApproval: invalid idx or wfEditorSteps");return}\n    if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:"",onReject:"stay"};\n    wfEditorSteps[idx].approval[key]=val;\n    wfShowProps(idx);\n  }catch(e){console.error("wfSetApproval error:",e)}\n}'
if old in c:
    c = c.replace(old, new)
    fixes += 1
    print('FIXED: wfSetApproval')
else:
    print('wfSetApproval NOT FOUND')
    idx=c.find('function wfSetApproval')
    if idx>=0: print(c[idx:idx+300])

# 2. wfSetAssignee — add try/catch + logs
old = 'function wfSetAssignee(idx,key,val){\n  if(idx<0||idx>=wfEditorSteps.length)return;\n  if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:"dept",value:""};\n  wfEditorSteps[idx].assignee[key]=val;\n  wfShowProps(idx);\n}'
new = 'function wfSetAssignee(idx,key,val){\n  console.log("wfSetAssignee",idx,key,val,"steps:",wfEditorSteps?wfEditorSteps.length:undefined);\n  try{\n    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length){console.warn("wfSetAssignee: invalid idx or wfEditorSteps");return}\n    if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:"dept",value:""};\n    wfEditorSteps[idx].assignee[key]=val;\n    wfShowProps(idx);\n  }catch(e){console.error("wfSetAssignee error:",e)}\n}'
if old in c:
    c = c.replace(old, new)
    fixes += 1
    print('FIXED: wfSetAssignee')
else:
    print('wfSetAssignee NOT FOUND')

# 3. wfShowProps — entry log
old = 'function wfShowProps(idx){\n  var panel=document.getElementById("wf-props-panel");\n  if(!panel)return;'
new = 'function wfShowProps(idx){\n  console.log("wfShowProps called",idx,"steps:",wfEditorSteps?wfEditorSteps.length:undefined,"depts:",allDepartments?allDepartments.length:0,"roles:",allRoles?allRoles.length:0);\n  var panel=document.getElementById("wf-props-panel");\n  if(!panel){console.warn("wfShowProps: panel not found");return}'
if old in c:
    c = c.replace(old, new)
    fixes += 1
    print('FIXED: wfShowProps')
else:
    print('wfShowProps NOT FOUND as-is, locating...')
    idx=c.find('function wfShowProps')
    if idx>=0: print(repr(c[idx:idx+250]))

# 4. saveWtVisual — add logs for approval/assignee save
idx = c.find('function saveWtVisual')
if idx >= 0:
    # find the save block
    old_save = 'var steps=[];\n  for(var i=0;i<wfEditorSteps.length;i++){\n    var s=Object.assign({},wfEditorSteps[i]);\n    delete s._x;delete s._y;\n    // Preserve new approval/assignee/permissions fields as-is (already merged by Object.assign)\n    steps.push(s);\n  }'
    if old_save in c:
        new_save = 'var steps=[];\n  console.log("saveWtVisual: saving",wfEditorSteps.length,"steps");\n  for(var i=0;i<wfEditorSteps.length;i++){\n    var s=Object.assign({},wfEditorSteps[i]);\n    delete s._x;delete s._y;\n    if(s.approval)console.log("  step",i,"approval:",JSON.stringify(s.approval));\n    if(s.assignee)console.log("  step",i,"assignee:",JSON.stringify(s.assignee));\n    steps.push(s);\n  }'
        c = c.replace(old_save, new_save)
        fixes += 1
        print('FIXED: saveWtVisual logs')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print(f'\nTotal fixes: {fixes}')
