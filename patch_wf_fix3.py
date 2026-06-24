import re, sys
sys.stdout.reconfigure(encoding='utf-8')
path = r"D:\1kaifa\grsds\index.html"
with open(path,"r",encoding="utf-8") as f:
    h=f.read()

changes=0

# 1. Fix initWorkflow lookup builder
# Find the patched initWorkflow and the WFLookup builder
old_lookup="""initWorkflow();
WFLookup={};
for(var i=0;i<getTemplateSteps(curProject?curProject.template_id:null).length;i++){WFLookup[getTemplateSteps(curProject?curProject.template_id:null)[i].seq]=getTemplateSteps(curProject?curProject.template_id:null)[i]}
"""
old_lookup2="""WFLookup={};
for(var i=0;i<getTemplateSteps(curProject?curProject.template_id:null).length;i++){WFLookup[getTemplateSteps(curProject?curProject.template_id:null)[i].seq]=getTemplateSteps(curProject?curProject.template_id:null)[i]}"""
new_lookup="""var steps=getTemplateSteps(curProject?curProject.template_id:null);
WFLookup={};
for(var i=0;i<steps.length;i++){WFLookup[steps[i].seq]=steps[i]}"""
if old_lookup2 in h:
    h = h.replace(old_lookup2, new_lookup)
    changes+=1
    print("OK 1: WFLookup builder")

# 2. Fix doneCount loop
old_dc="""if(stepDone(WORKFLOW_STEPS[i].seq))doneCount++"""
new_dc="""var st=getTemplateSteps(curProject?curProject.template_id:null);
  for(var i=0;i<st.length;i++){if(stepDone(st[i].seq))doneCount++}"""
# First find the pattern
old_dc_pattern="""for(var i=0;i<WORKFLOW_STEPS.length;i++){if(stepDone(WORKFLOW_STEPS[i].seq))doneCount++}"""
new_dc_pattern="""var st=getTemplateSteps(curProject?curProject.template_id:null);
  for(var i=0;i<st.length;i++){if(stepDone(st[i].seq))doneCount++}"""
if old_dc_pattern in h:
    h = h.replace(old_dc_pattern, new_dc_pattern)
    changes+=1
    print("OK 2: doneCount loop")

# 3. Fix step7Idx in onTrainingOrgComplete (or wherever the training complete callback is)
idx = h.find("var step7Idx=WORKFLOW_STEPS.findIndex")
if idx>0:
    line_end = h.find("\n", idx)
    if line_end > idx:
        old_step7 = h[idx:line_end]
        new_step7 = "var steps=getTemplateSteps(curProject?curProject.template_id:null);\n  var step7Idx=steps.findIndex(function(s){return s.key==='product_training'});"
        h = h[:idx] + new_step7 + h[line_end:]
        changes+=1
        print("OK 3: step7Idx")

# 4. Fix any remaining raw WORKFLOW_STEPS.findIndex / .find / [i] that are NOT the definition
remaining = []
for m in re.finditer(r'WORKFLOW_STEPS', h):
    pos = m.start()
    # Skip the data definition (around 681561)
    if pos > 681500 and pos < 685700:
        continue
    ctx = h[max(0,pos-30):pos+60].replace('\n',' ')
    if 'getTemplateSteps' in ctx[:40]:
        continue
    remaining.append((pos, ctx))

print(f"\nRemaining after patches: {len(remaining)}")
for pos,ctx in remaining:
    print(f"  {pos}: ...{ctx}...")

with open(path,"w",encoding="utf-8") as f:
    f.write(h)
print(f"\nChanges: {changes}, Size: {len(h)} bytes")
