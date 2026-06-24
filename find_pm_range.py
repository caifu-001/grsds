import re, os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================================
# Replace the entire Project Management + Workflow JS block
# from "// ====== Project Management ======"
# to end of "function resetWorkflow..."
# ============================================================

# Find start of PM block
pm_start_marker = "// ====== Project Management ====="
pm_start = html.find(pm_start_marker)
if pm_start == -1:
    print("ERROR: 'Project Management' marker not found")
    exit(1)

# Find end: the "function openProjectDetail" line that comes after the WORKFLOW_STEPS block
# Actually let's find the end of the old workflow code and replace everything from pm_start

# Find "function openProjectDetail" - this exists in both old and new, we need to replace the OLD version
# Let's find the first occurrence of openProjectDetail after pm_start
search_start = pm_start
old_opd = html.find("function openProjectDetail(", search_start)
if old_opd == -1:
    print("ERROR: openProjectDetail not found")
    exit(1)

# Find the end of the old openProjectDetail + its body - look for the next "function " or end of script
# Actually, let's find what's after openProjectDetail body. The old OPD had:
#   curProjectId=pid;curProjectName=pname;
#   loadWorkflow();
#   switchProjectTab('stages');
#   ... existing code ...
# }
# Then more lines before the next function.
# Let's find the closing } and next function after.

# Simpler: find the old WORKFLOW_STEPS as an anchor
old_wf_steps = html.find("var WORKFLOW_STEPS=[", search_start)
if old_wf_steps != -1:
    # Find end of WORKFLOW_STEPS ] then old initWorkflow through resetWorkflow
    # Look for "function openProjectDetail(" after the steps
    old_opd2 = html.find("function openProjectDetail(", old_wf_steps)
    if old_opd2 != -1:
        old_opd = old_opd2

# Now find the end of old openProjectDetail - it should end with "switchProjectTab('stages');" + rest  
# and then old code. Let's find the "}" closing brace after OPD body, then "document.getElementById"
# Actually, the OPD we need to replace ends right before the old "lead-view" or next major section
# Let's find "</script>" that's closest but AFTER OPD... No.

# Better: find the text "switchProjectTab('stages');" which was OLD and was replaced
# Now search for the OLD OPD content - it had an extra block after switchProjectTab
old_sw_tab = html.find("switchProjectTab('stages');", old_opd)
if old_sw_tab != -1:
    # Find the } that closes this function, then next function after OPD body
    # The OPD had extra code: document.getElementById('stages-project-name')...
    # Actually our edit already replaced that. Let me find what's current.
    pass

# Let's look at what currently exists after WORKFLOW_STEPS
# The edit we applied earlier changed OPD, but the rest (loadWorkflow, saveWorkflow, etc) is still there.

# SIMPLEST approach: find the old "function switchProjectTab" and replace everything from PM start
# to the line before "function loadProjects" or to the old content.

# Actually, let me just find the current OPD and everything after it up to the next major section
# Find "</script>" after old_opd
script_end = html.find("</script>", old_opd)
if script_end != -1:
    # But we only want up to end of OPD body + old workflow functions.
    # Let's find what comes after OPD - old workflow functions (loadWorkflow, saveWorkflow etc)
    # These were inserted between deletePayment and the old OPD. Let me look for deletePayment.
    del_pay = html.find("function deletePayment(", old_opd)
    if del_pay != -1 and del_pay < old_wf_steps + 2000:
        # old_wf insert happened AFTER deletePayment
        pass

# OK let me just search for markers to figure out the exact range
# Find "// ===== Project Workflow ======" - this was inserted by earlier edit
old_workflow_marker = html.find("// ===== Project Workflow =====", search_start)
if old_workflow_marker == -1:
    print("ERROR: Project Workflow comment not found")
    exit(1)

# The OLD OPD (modified by earlier edit) starts with:
# function openProjectDetail(pid,pname){
#   curProjectId=pid;curProjectName=pname;
#   loadWorkflow();
#   switchProjectTab('stages');
#   ... original code ...
# }

# Find the END of old OPD body - look for the closing brace pattern
# The old OPD ends with lines after switchProjectTab - the existing bidding/contract tabs logic
# Let me find "document.getElementById('stages-project-name')" which is still in old OPD
stages_pn = html.find(".getElementById('stages-project-name')", old_workflow_marker)
if stages_pn == -1:
    stages_pn = html.find("getElementById('stages-project-name')", old_workflow_marker)

# Find where the old OPD function ends - the closing } then next function or </script>
# Let's search for the old OPD body tail: the function should end with... let me check what's there

# Actually I realize the simplest approach: just find the OLD OPD function start line
# and everything from there to the end of the old workflow code before the next section.
# The next section starts with: "</script>" and then "<div id="leads-view""

leads_view_marker = html.find('<div id="leads-view"', search_start)
if leads_view_marker == -1:
    print("ERROR: leads-view not found")
    exit(1)

# Now, everything from pm_start to leads_view_marker needs replacement.
# But pm_start includes "switchProjectTab", "loadProjects", "renderProjects", "openProjectDetail" (old)
# and all workflow functions.

# Actually let's just split it: find the EXACT end of the old section.
# The old section ends right before '// following lines...' or '</script>'

# Let me find what comes right before leads_view_marker
before_leads = html[max(0, leads_view_marker - 200):leads_view_marker]
print("Before leads_view:", repr(before_leads[-100:]))

# Actually, I'll just do a simpler search-replace. Find the entire old block and replace.
# Markers:
# START: "// ====== Project Management ======"
# END: right before '</script>\n</div>\n<!-- ===== END service-view ===== -->\n\n<div id="leads-view"'

# Find that exact end pattern
end_marker = '</script>\n\n</div>\n<!-- ===== END service-view ===== -->\n\n<div id="leads-view"'
end_idx = html.find(end_marker, search_start)
if end_idx == -1:
    # Try with different whitespace
    end_marker2 = '</script>\n</div>\n<!-- ===== END service-view ===== -->\n<div id="leads-view"'
    end_idx = html.find(end_marker2, search_start)
if end_idx == -1:
    end_marker3 = '</script>\n\n</div>\n<!-- ===== END service-view ===== -->\n\n<div id="leads-view"'
    end_idx = html.find(end_marker3, search_start)
if end_idx == -1:
    # Search for leads_view_marker directly and go backwards
    end_idx = html.rfind('</script>', search_start, leads_view_marker)
    if end_idx != -1:
        end_idx += len('</script>')

if end_idx == -1:
    print("ERROR: could not find end marker")
    exit(1)

print(f"PM start: {pm_start}, PM end: {end_idx}")
print("End context:", repr(html[end_idx-50:end_idx+30]))
