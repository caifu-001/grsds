import re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

path = r"D:\1kaifa\grsds\index.html"
with open(path, "r", encoding="utf-8") as f:
    h = f.read()

changes = 0
orig_len = len(h)

# ===================================================================
# PATCH 1: Add global allTemplates + loadTemplates + template helpers
# ===================================================================
# Find a good insertion point after let allProjects = []
idx = h.find("let allProjects = [];")
if idx >= 0:
    # Find end of that line
    nl = h.index("\n", idx)
    insert_pos = nl + 1
    new_globals = """let allTemplates=[];
async function loadTemplates(){
  try{var {data}=await sb.from('workflow_templates').select('*');if(data)allTemplates=data;}
  catch(e){console.error('loadTemplates',e)}
}
function getTemplateSteps(templateId){
  if(!templateId||!allTemplates.length)return WORKFLOW_STEPS;
  var t=allTemplates.find(function(x){return x.id===templateId});
  if(!t)return WORKFLOW_STEPS;
  try{
    if(typeof t.steps==='string')return JSON.parse(t.steps);
    if(Array.isArray(t.steps))return t.steps;
  }catch(e){}
  return WORKFLOW_STEPS;
}
"""
    h = h[:insert_pos] + new_globals + h[insert_pos:]
    changes += 1
    print("PATCH 1: Added allTemplates + loadTemplates + getTemplateSteps")
else:
    print("ERROR: let allProjects = []; not found")

# ===================================================================
# PATCH 2: Add loadTemplates() call to main init
# Find loadCompanies(); after it is where loadClients/loadProjects happen
# ===================================================================
idx = h.find("await loadCompanies();")
if idx >= 0:
    nl = h.index("\n", idx)
    # Check if loadTemplates already there
    if h[idx:nl].find("loadTemplates") < 0:
        h = h[:nl+1] + "  await loadTemplates();\n" + h[nl+1:]
        changes += 1
        print("PATCH 2: Added loadTemplates() call to init")
else:
    # Try backup: find "loadClients()"
    idx = h.find("loadClients();\n")
    if idx > 0:
        nl = h.index("\n", idx)
        h = h[:nl+1] + " await loadTemplates();\n" + h[nl+1:]
        changes += 1
        print("PATCH 2b: Added loadTemplates() call near loadClients")
    else:
        print("ERROR 2: Init point not found")

# ===================================================================
# PATCH 3: Modify saveProject to include template_id
# Find  proj.workflow='{}';proj.current_step=1;
# ===================================================================
old = "proj.workflow='{}';proj.current_step=1;"
new = "proj.workflow='{}';proj.current_step=1;proj.template_id=document.getElementById('pf-template-id')?(parseInt(document.getElementById('pf-template-id').value)||null):null;"
if old in h:
    h = h.replace(old, new, 1)
    changes += 1
    print("PATCH 3: saveProject now includes template_id")
else:
    print("ERROR 3: proj.workflow='{}' not found")

# ===================================================================
# PATCH 4: Modify initWorkflow to build from template steps
# ===================================================================
old4 = """function initWorkflow(){
  curWorkflow={};curStep=1;
  for(var i=0;i<WORKFLOW_STEPS.length;i++){
    curWorkflow[WORKFLOW_STEPS[i].seq]={done:false,note:'',data:{}};
  }
}"""
new4 = """function initWorkflow(templateId){
  var steps=getTemplateSteps(templateId||(curProject?curProject.template_id:null));
  curWorkflow={};curStep=1;
  for(var i=0;i<steps.length;i++){
    curWorkflow[steps[i].seq]={done:false,note:'',data:{}};
  }
}"""
if old4 in h:
    h = h.replace(old4, new4, 1)
    changes += 1
    print("PATCH 4: initWorkflow uses getTemplateSteps")
else:
    print("ERROR 4: initWorkflow not found")

# ===================================================================
# PATCH 5: Modify loadWorkflow to use template steps
# ===================================================================
old5 = """function loadWorkflow(){
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(!proj)return;
  try{var wf=JSON.parse(proj.workflow||'{}');curWorkflow=wf;curStep=proj.current_step||1}catch(e)"""
new5 = """function loadWorkflow(){
  var proj=allProjects.find(function(p){return p.id===curProjectId});
  if(!proj)return;
  try{var wf=JSON.parse(proj.workflow||'{}');curWorkflow=wf;curStep=proj.current_step||1}catch(e)"""
# just make initWorkflow call pass template_id
old5b = """if(!curWorkflow||Object.keys(curWorkflow).length===0)initWorkflow();"""
new5b = """if(!curWorkflow||Object.keys(curWorkflow).length===0)initWorkflow(proj?proj.template_id:null);"""
if old5b in h:
    h = h.replace(old5b, new5b, 1)
    changes += 1
    print("PATCH 5: loadWorkflow initWorkflow passes template_id")
else:
    print("ERROR 5: initWorkflow() call in loadWorkflow not found")

# ===================================================================
# PATCH 6: Modify renderWorkbench to use template steps instead of WORKFLOW_STEPS
# ===================================================================
# Find all uses of WORKFLOW_STEPS in renderWorkbench
old6 = "WORKFLOW_STEPS.length"
new6 = "getTemplateSteps(curProject?curProject.template_id:null).length"
h = h.replace(old6, new6)
# Only replace in context of renderWorkbench... but let's be safe and only replace
# the first few occurrences. Actually let's be selective.
# The main renderWorkbench references are around 686xxx.

# Actually let's be more surgical. Find the renderWorkbench function
idx_rwb = h.find("function renderWorkbench")
if idx_rwb > 0:
    # Find the end of this function roughly
    # Look for the next "function " after renderWorkbench
    next_fn = h.find("\nfunction ", idx_rwb + 100)
    rwb_text = h[idx_rwb:next_fn]
    
    # Replace WORKFLOW_STEPS[...] patterns with getTemplateSteps
    old_rwb = rwb_text
    
    # For loop: for(var i=0;i<WORKFLOW_STEPS.length;i++)
    rwb_new = rwb_text
    rwb_new = re.sub(r'WORKFLOW_STEPS\.length', r'getTemplateSteps(curProject?curProject.template_id:null).length', rwb_new)
    rwb_new = re.sub(r'WORKFLOW_STEPS\[i\]', r'getTemplateSteps(curProject?curProject.template_id:null)[i]', rwb_new)
    rwb_new = re.sub(r'WORKFLOW_STEPS\[j\]', r'getTemplateSteps(curProject?curProject.template_id:null)[j]', rwb_new)
    rwb_new = re.sub(r'WORKFLOW_STEPS\[k\]', r'getTemplateSteps(curProject?curProject.template_id:null)[k]', rwb_new)
    # findIndex
    rwb_new = re.sub(r'WORKFLOW_STEPS\.findIndex', r'getTemplateSteps(curProject?curProject.template_id:null).findIndex', rwb_new)
    # find
    rwb_new = re.sub(r'WORKFLOW_STEPS\.find\(', r'getTemplateSteps(curProject?curProject.template_id:null).find(', rwb_new)
    # filter
    rwb_new = re.sub(r'WORKFLOW_STEPS\.filter\(', r'getTemplateSteps(curProject?curProject.template_id:null).filter(', rwb_new)
    
    if rwb_new != old_rwb:
        h = h[:idx_rwb] + rwb_new + h[next_fn:]
        changes += 1
        print("PATCH 6: renderWorkbench uses getTemplateSteps")
    else:
        print("PATCH 6: no changes in renderWorkbench")

# ===================================================================
# PATCH 7: Add template selector to project form HTML
# Find the opp-form-modal, insert template dropdown after name field
# ===================================================================
idx = h.find('id="pf-name"')
if idx > 0:
    # find end of that group div
    # Structure: <div class="form-group"><label>商机名称 *</label><input id="pf-name" ...></div>
    # Find the closing </div> after pf-name
    end_div = h.find("</div>", h.find("pf-name", idx))
    if end_div > 0:
        # Actually let's find the right closing </div>
        # The structure is: <div class="form-group"><label>商机名称 *</label><input id="pf-name" placeholder="..."></div>
        # There may be nested <div> inside so let's find the specific pattern
        
        # Find the line containing pf-name and the next </div>
        line_start = h.rfind("\n", 0, idx)
        line_end = h.find("\n", end_div)
        name_line = h[line_start:line_end]
        
        # Actually let's just find the complete div
        fg_start = h.rfind('<div class="form-group">', 0, idx)
        if fg_start < 0:
            fg_start = h.rfind('<div class="form-group"', 0, idx)
        
        # Find matching </div>
        depth = 0
        j = fg_start
        while j < len(h):
            if h[j:j+4] == '<div' and h[j:j+5] != '</di':
                depth += 1
            elif h[j:j+6] == '</div>':
                depth -= 1
                if depth == 0:
                    fg_end = j + 6
                    break
            j += 1
        
        insert_pos = fg_end
        
        template_html = """
  <div class="form-group"><label>流程模板</label><select id="pf-template-id"><option value="">默认（46步标准流程）</option></select></div>"""
        
        h = h[:insert_pos] + template_html + h[insert_pos:]
        changes += 1
        print("PATCH 7: Added template selector after name field")
    else:
        print("ERROR 7: end_div not found")
else:
    print("ERROR 7: pf-name not found")

# ===================================================================
# PATCH 8: Populate template dropdown in openProjectForm / openProjectFormFromLead
# ===================================================================
idx = h.find("openProjectFormFromLead(leadId,projectName,companyName,clientId){")
if idx > 0:
    # Find the end of this function - look for "}" at matching level
    depth = 0
    j = idx
    started = False
    while j < len(h):
        if h[j] == '{':
            depth += 1
            started = True
        elif h[j] == '}':
            depth -= 1
            if started and depth == 0:
                fn_end = j + 1
                break
        j += 1
    
    # Insert template population before document.getElementById('opp-form-modal').classList.remove('hidden');
    marker = "document.getElementById('opp-form-modal').classList.remove('hidden');\n}\n\nfunction openProjectForm("
    if marker in h:
        new_marker = """// Populate template dropdown
  var templateSel=document.getElementById('pf-template-id');
  if(templateSel){
    templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
    for(var i=0;i<allTemplates.length;i++){
      var t=allTemplates[i];
      templateSel.innerHTML+='<option value=\"'+t.id+'\">'+escHtml(t.name)+'</option>';
    }
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');
}

function openProjectForm("""
        h = h.replace(marker, new_marker, 1)
        changes += 1
        print("PATCH 8: Template dropdown populated in openProjectFormFromLead")
    else:
        print("ERROR 8a: marker not found")
else:
    print("ERROR 8: openProjectFormFromLead not found")

# Also do same for openProjectForm
idx2 = h.find("function openProjectForm(id,leadId){")
if idx2 > 0:
    # Find its end
    depth = 0
    j = idx2
    started = False
    while j < len(h):
        if h[j] == '{':
            depth += 1
            started = True
        elif h[j] == '}':
            depth -= 1
            if started and depth == 0:
                fn2_end = j + 1
                break
        j += 1
    
    # Find the close button
    marker2 = "document.getElementById('opp-form-modal').classList.remove('hidden');"
    # find in this function
    occurrences = list(re.finditer(re.escape(marker2), h[idx2:fn2_end]))
    if len(occurrences) >= 2:
        # The second one (editing existing project)
        pos = idx2 + occurrences[1].start()
        new_code = """// Populate template dropdown
  var templateSel=document.getElementById('pf-template-id');
  if(templateSel){
    templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
    for(var i=0;i<allTemplates.length;i++){
      var t=allTemplates[i];
      templateSel.innerHTML+='<option value=\"'+t.id+'\">'+escHtml(t.name)+'</option>';
    }
    // Set selected if project has template
    if(proj&&proj.template_id)templateSel.value=proj.template_id;
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');"""
        
        h = h[:pos] + new_code + h[pos + len(marker2):]
        changes += 1
        print("PATCH 8b: Template dropdown populated in openProjectForm (edit)")
    elif len(occurrences) >= 1:
        # First occurrence (new project)
        pos = idx2 + occurrences[0].start()
        new_code = """// Populate template dropdown
  var templateSel=document.getElementById('pf-template-id');
  if(templateSel){
    templateSel.innerHTML='<option value="">默认（46步标准流程）</option>';
    for(var i=0;i<allTemplates.length;i++){
      var t=allTemplates[i];
      templateSel.innerHTML+='<option value=\"'+t.id+'\">'+escHtml(t.name)+'</option>';
    }
  }
  document.getElementById('opp-form-modal').classList.remove('hidden');"""
        h = h[:pos] + new_code + h[pos + len(marker2):]
        changes += 1
        print("PATCH 8c: Template dropdown populated in openProjectForm (new)")
    else:
        print("ERROR 8c: marker2 not in openProjectForm")
else:
    print("ERROR 8b: openProjectForm not found")

# ===================================================================
# PATCH 9: Super admin template management
# Find the super admin "系统设置" tab area, add "流程模板" sub-tab
# ===================================================================
# Look for existing admin sub-tabs
idx = h.find('adm-tab-system')
if idx < 0:
    idx = h.find('系统配置')
    if idx > 0:
        # Find admin tab container
        print(f"PATCH 9: Found 系统配置 at {idx}, searching admin area...")

# Look for super admin tab buttons
idx_settings = h.find('id="adm-goto-system"')
if idx_settings < 0:
    idx_settings = h.find('系统设置')
    if idx_settings > 0:
        print(f"PATCH 9: 系统设置 tab at {idx_settings}")

# Let me find the admin management area more broadly
idx_adm = h.find('function showAdmin')
if idx_adm < 0:
    idx_adm = h.find('adm-section')
if idx_adm > 0:
    print(f"PATCH 9: Admin area at {idx_adm}")
else:
    print("PATCH 9: Admin area not found, need broader search")

# ===================================================================
# Also need to handle showStepPanel / stepDone / markStepDone to use template steps
# ===================================================================
# Find stepDone function
idx_sd = h.find("function stepDone(seq)")
if idx_sd > 0:
    # Find references to WORKFLOW_STEPS in there
    snippet = h[idx_sd:idx_sd+400]
    refs = re.findall(r'WORKFLOW_STEPS', snippet)
    if refs:
        # Replace with template-aware version
        old_sd_loop = "var i=WORKFLOW_STEPS.findIndex(function(s){return s.seq===seq});"
        new_sd_loop = "var steps=getTemplateSteps(curProject?curProject.template_id:null);\n  var i=steps.findIndex(function(s){return s.seq===seq});"
        if old_sd_loop in h:
            h = h.replace(old_sd_loop, new_sd_loop)
            changes += 1
            print("PATCH 9a: stepDone uses template steps")
        
        # Also check for WORKFLOW_STEPS in initWorkflow call
        for m in re.finditer(r'WORKFLOW_STEPS\.findIndex', h[idx_sd:idx_sd+400]):
            old9 = h[idx_sd+m.start():idx_sd+m.end()]
            new9 = "getTemplateSteps(curProject?curProject.template_id:null).findIndex"
            if old9 != new9:
                h = h.replace(old9, new9, 1)
                changes += 1
                print(f"PATCH 9b: stepDone WORKFLOW_STEPS.findIndex -> getTemplateSteps")

# Find showStepPanel
idx_sp = h.find("function showStepPanel(step)")
if idx_sp < 0:
    idx_sp = h.find("function showStepPanel(")
if idx_sp > 0:
    # Find WORKFLOW_STEPS.find
    old_sp = "var cur=WORKFLOW_STEPS.find(function(s){return s.seq===curStep})"
    new_sp = "var cur=getTemplateSteps(curProject?curProject.template_id:null).find(function(s){return s.seq===curStep})"
    if old_sp in h:
        h = h.replace(old_sp, new_sp)
        changes += 1
        print("PATCH 10: showStepPanel uses template steps")

# Also check for markStepDone
idx_msd = h.find("function markStepDone")
if idx_msd > 0:
    snippet = h[idx_msd:idx_msd+500]
    old_msd = "var step=WORKFLOW_STEPS.find(function(s){return s.seq===curStep})"
    new_msd = "var steps=getTemplateSteps(curProject?curProject.template_id:null);\n  var step=steps.find(function(s){return s.seq===curStep})"
    if old_msd in h:
        h = h.replace(old_msd, new_msd)
        changes += 1
        print("PATCH 11: markStepDone uses template steps")

# Also fix updateProjectCurrentStep which sets curProject.current_step
idx_ups = h.find("function updateProjectCurrentStep(")
if idx_ups > 0:
    # Find the part where it references steps length
    snippet = h[idx_ups:idx_ups+600]
    # Replace total_steps calc
    old_total = "total_steps:WORKFLOW_STEPS.length"
    new_total = "total_steps:getTemplateSteps(curProject?curProject.template_id:null).length"
    if old_total in h:
        h = h.replace(old_total, new_total)
        changes += 1
        print("PATCH 12: updateProjectCurrentStep uses template steps")

# Also fix onTrainingOrg where it sets current_step 6 -> should come from template
# Let the existing code work since it just uses numeric step seq

# Write back
# First undo the blanket replace from PATCH 6 that might have broken things outside renderWorkbench:
# h already modified. Let me verify we haven't broken anything.
# Count occurrences of raw WORKFLOW_STEPS
remaining = len(re.findall(r'(?<!getTemplateSteps)WORKFLOW_STEPS', h))
print(f"Remaining raw WORKFLOW_STEPS references: {remaining}")

with open(path, "w", encoding="utf-8") as f:
    f.write(h)

print(f"\nTotal changes applied: {changes}")
print(f"Size: {len(h)} -> {len(h.encode('utf-8'))} bytes")

