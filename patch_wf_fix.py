import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r"D:\1kaifa\grsds\index.html","r",encoding='utf-8') as f:
    h=f.read()

changes=0

# PATCH 1: Add allTemplates to global vars
old="var allProjects=[],allStages=[],allBiddings=[],allDeliveries=[],allPayments=[],c"
if old in h:
    new="var allProjects=[],allStages=[],allBiddings=[],allDeliveries=[],allPayments=[],allTemplates=[],c"
    h=h.replace(old,new,1)
    changes+=1
    print("OK 1: allTemplates to globals")

# PATCH 1b: Add loadTemplates/getTemplateSteps functions after the global block
# Find where loadWorkflow is (after all globals)
idx=h.find("async function loadBiddings(")
if idx>0:
    # Find end of this function
    j=idx
    depth=0;started=False
    while j<len(h):
        if h[j]=='{':depth+=1;started=True
        elif h[j]=='}':
            depth-=1
            if started and depth==0:end=j+1;break
        j+=1
    insert=end
    fn_code="""async function loadTemplates(){
  try{if(isSuperAdmin){var {data}=await sbAdmin.from('workflow_templates').select('*');if(data)allTemplates=data}else{var {data}=await sb.from('workflow_templates').select('*');if(data)allTemplates=data}}
  catch(e){console.error('loadTemplates',e)}
}
function getTemplateSteps(templateId){
  if(!templateId||!allTemplates.length)return WORKFLOW_STEPS;
  var t=allTemplates.find(function(x){return x.id===templateId});
  if(!t)return WORKFLOW_STEPS;
  try{if(typeof t.steps==='string')return JSON.parse(t.steps);if(Array.isArray(t.steps))return t.steps}catch(e){}
  return WORKFLOW_STEPS;
}
"""
    h=h[:insert]+"\n"+fn_code+h[insert:]
    changes+=1
    print("OK 1b: loadTemplates + getTemplateSteps added")

# Check remaining raw WORKFLOW_STEPS refs
import re
remaining=[m.start() for m in re.finditer(r'(?<![gG]etTemplateSteps\([^)]{0,200})WORKFLOW_STEPS',h)]
print(f"\nRemaining raw WORKFLOW_STEPS: {len(remaining)}")
if remaining:
    for r in remaining[:10]:
        ctx=h[max(0,r-40):r+60].replace('\n',' ')
        print(f"  {r}: ...{ctx}...")

# Also check if stepDone has raw WORKFLOW_STEPS
idx_sd=h.find("function stepDone(seq)")
if idx_sd>0:
    snippet=h[idx_sd:idx_sd+600]
    raw_findIndex=__import__('re').search(r'WORKFLOW_STEPS\.findIndex',snippet)
    if raw_findIndex:
        old_sd="WORKFLOW_STEPS.findIndex(function(s){return s.seq===seq})"
        new_sd="getTemplateSteps(curProject?curProject.template_id:null).findIndex(function(s){return s.seq===seq})"
        if old_sd in h:
            h=h.replace(old_sd,new_sd)
            changes+=1
            print("OK SD: stepDone WORKFLOW_STEPS replaced")

idx_md=h.find("function markStepDone")
if idx_md>0:
    snippet=h[idx_md:idx_md+600]
    if 'WORKFLOW_STEPS.find' in snippet:
        old_md="WORKFLOW_STEPS.find(function(s){return s.seq===curStep})"
        new_md="getTemplateSteps(curProject?curProject.template_id:null).find(function(s){return s.seq===curStep})"
        if old_md in h:
            h=h.replace(old_md,new_md)
            changes+=1
            print("OK MD: markStepDone WORKFLOW_STEPS replaced")

idx_up=h.find("function updateProjectCurrentStep(")
if idx_up>0:
    snippet=h[idx_up:idx_up+800]
    if 'WORKFLOW_STEPS.length' in snippet:
        old_up="total_steps:WORKFLOW_STEPS.length"
        new_up="total_steps:getTemplateSteps(curProject?curProject.template_id:null).length"
        if old_up in h:
            h=h.replace(old_up,new_up)
            changes+=1
            print("OK UPC: updateProjectCurrentStep WORKFLOW_STEPS replaced")

# Final check
remaining2=len(__import__('re').findall(r'(?<![gG]etTemplateSteps\([^)]{0,200})WORKFLOW_STEPS',h))
print(f"\nFinal remaining raw WORKFLOW_STEPS: {remaining2}")

with open(path,"w",encoding="utf-8") as f:
    f.write(h)
print(f"\nTotal changes: {changes}, Size: {len(h)} bytes")
path=r"D:\1kaifa\grsds\index.html"
