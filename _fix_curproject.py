import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h=f.read()

pattern = "getTemplateSteps(curProject?curProject.template_id:null)"
count = h.count(pattern)
print(f"Found {count} occurrences")

replacement = 'safeGetSteps()'
h = h.replace(pattern, replacement)
print(f"After replace: {h.count(replacement)} occurrences")

# Insert safeGetSteps before initWorkflow
insert_before = "function initWorkflow(templateId){"
safe_fn = """function safeGetSteps(){
  try{return getTemplateSteps(curProject?curProject.template_id:null);}
  catch(e){return WORKFLOW_STEPS;}
}
"""
idx = h.find(insert_before)
h = h[:idx] + safe_fn + "\n" + h[idx:]

# Also handle the explicit initWorkflow call at global scope
# It should get WORKFLOW_STEPS not via safeGetSteps (since curProject undefined)
# Already fixed earlier

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h)

print("Done")
