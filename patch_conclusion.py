import os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

changes = 0

# ============================================================
# 1. FORM: Change conclusion textarea to select dropdown
# ============================================================
old_conclusion = '<div class="form-group"><label>\u7ed3\u8bba</label><textarea id="pf-conclusion" placeholder="\u9488\u5bf9\u5546\u673a\u8fdb\u884c\u51b3\u7b56\u5c42\u5206\u6790\u9a8c\u8bc1\uff0c\u8ba4\u53ef\u5546\u673a\u5219\u8f6c\u4e0b\u4e00\u6b65\uff0c\u4e0d\u8ba4\u53ef\u5219\u8f6c46\u7ed3\u675f" rows="3"></textarea></div>'

new_conclusion = '<div class="form-group"><label>\u7ed3\u8bba *</label><select id="pf-conclusion" onchange="onConclusionChange()"><option value="">\u8bf7\u9009\u62e9</option><option value="approved">\u2713 \u8ba4\u53ef\u5546\u673a\uff0c\u8fdb\u5165\u4e0b\u4e00\u6b65</option><option value="rejected">\u2717 \u4e0d\u8ba4\u53ef\uff0c\u8f6c\u6b65\u9aa446\u7ed3\u675f</option></select></div>\n  <div class="form-group" id="pf-conclusion-notes-group" style="display:none"><label>\u7ed3\u8bba\u8bf4\u660e</label><textarea id="pf-conclusion-notes" placeholder="\u51b3\u7b56\u5c42\u5206\u6790\u9a8c\u8bc1\u8be6\u60c5\uff0c\u4e3a\u4ec0\u4e48\u8ba4\u53ef/\u4e0d\u8ba4\u53ef..." rows="3"></textarea></div>'

if old_conclusion in html:
    html = html.replace(old_conclusion, new_conclusion, 1)
    changes += 1
    print("[OK] Conclusion dropdown added")
else:
    print("[ERR] Conclusion field not found")

# ============================================================
# 2. JS: onConclusionChange() - show/hide notes field
# ============================================================
old_closeOpp = "function closeOppForm(){document.getElementById('opp-form-modal').classList.add('hidden');oppEditId=null;oppLeadId=null}"

new_closeOpp = '''function closeOppForm(){document.getElementById('opp-form-modal').classList.add('hidden');oppEditId=null;oppLeadId=null}

function onConclusionChange(){
  var val=document.getElementById('pf-conclusion').value;
  var notesGroup=document.getElementById('pf-conclusion-notes-group');
  if(notesGroup)notesGroup.style.display=val?'block':'none';
}'''

if old_closeOpp in html:
    html = html.replace(old_closeOpp, new_closeOpp, 1)
    changes += 1
    print("[OK] onConclusionChange added")
else:
    print("[ERR] closeOppForm not found")

# ============================================================
# 3. openProjectForm: update populate for new conclusion format
# ============================================================
old_concl_pop = "document.getElementById('pf-conclusion').value=p.conclusion||'';"

new_concl_pop = '''document.getElementById('pf-conclusion').value=p.conclusion||'';
      document.getElementById('pf-conclusion-notes').value=p.conclusion_notes||'';
      if(p.conclusion)document.getElementById('pf-conclusion-notes-group').style.display='block';'''

if old_concl_pop in html:
    html = html.replace(old_concl_pop, new_concl_pop, 1)
    changes += 1
    print("[OK] openProjectForm conclusion populate updated")
else:
    print("[ERR] conclusion populate not found")

# ============================================================
# 4. openProjectForm: clear conclusion_notes on new
# ============================================================
old_concl_clear = "document.getElementById('pf-conclusion').value='';"

new_concl_clear = '''document.getElementById('pf-conclusion').value='';
  document.getElementById('pf-conclusion-notes').value='';
  document.getElementById('pf-conclusion-notes-group').style.display='none';'''

if old_concl_clear in html:
    html = html.replace(old_concl_clear, new_concl_clear, 1)
    changes += 1
    print("[OK] openProjectForm conclusion clear updated")
else:
    print("[ERR] conclusion clear not found")

# ============================================================
# 5. saveProject: include conclusion_notes
# ============================================================
old_save_concl = "conclusion:document.getElementById('pf-conclusion').value.trim(),"

new_save_concl = '''conclusion:document.getElementById('pf-conclusion').value,
    conclusion_notes:document.getElementById('pf-conclusion-notes').value.trim(),
    status:document.getElementById('pf-conclusion').value==='rejected'?'suspended':document.getElementById('pf-status').value,'''

if old_save_concl in html:
    html = html.replace(old_save_concl, new_save_concl, 1)
    changes += 1
    print("[OK] saveProject conclusion + status logic updated")
else:
    print("[ERR] saveProject conclusion not found")

# ============================================================
# 6. Workflow step 46: show conclusion from project
# ============================================================
# First add a panel for step 46 (end panel)
# Find wb-panel-payment closing and add wb-panel-end
old_payment_close = '''    <div id="wb-payment-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Legacy stages sub-panel -->'''

new_payment_close = '''    <div id="wb-payment-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- End Panel (step 46) -->
    <div id="wb-panel-end" class="hidden">
     <div style="text-align:center;padding:40px 20px">
      <div style="font-size:48px;margin-bottom:16px">⏹️</div>
      <h2 style="font-size:20px;font-weight:700;margin:0 0 8px" id="wb-end-title">流程结束</h2>
      <p style="color:var(--text2);margin:0 0 24px">该项目流程已完成</p>
      <div style="background:var(--bg2);border-radius:12px;padding:20px;text-align:left;max-width:400px;margin:0 auto">
       <div style="font-weight:600;margin-bottom:8px">📋 决策结论</div>
       <div style="font-size:18px;font-weight:700;margin-bottom:12px" id="wb-end-conclusion">-</div>
       <div style="color:var(--text2);font-size:14px" id="wb-end-conclusion-notes"></div>
      </div>
      <div style="margin-top:24px;display:flex;gap:12px;justify-content:center">
       <button class="btn-save" onclick="markStepDone()">✓ 确认结束</button>
       <button class="btn-cancel" onclick="closeProjectWorkbench()">返回项目列表</button>
      </div>
     </div>
    </div>

    <!-- Legacy stages sub-panel -->'''

if old_payment_close in html:
    html = html.replace(old_payment_close, new_payment_close, 1)
    changes += 1
    print("[OK] End panel HTML added")
else:
    print("[ERR] payment close not found")

# ============================================================
# 7. Add 'end' to the panel list in showStepPanel
# ============================================================
old_panel_array = "var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain',\n              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',\n              'wb-panel-payment','wb-panel-stages','wb-content-default'];"

new_panel_array = "var panels=['wb-panel-basic','wb-panel-editor','wb-panel-competitor','wb-panel-decision-chain',\n              'wb-panel-tender','wb-panel-bidding','wb-panel-contract','wb-panel-delivery',\n              'wb-panel-payment','wb-panel-end','wb-panel-stages','wb-content-default'];"

if old_panel_array in html:
    html = html.replace(old_panel_array, new_panel_array, 1)
    changes += 1
    print("[OK] End panel added to panel list")
else:
    print("[ERR] panel array not found")

# ============================================================
# 8. Add 'end' case in showStepPanel switch
# ============================================================
old_case_payment = """    case 'payment':
      if(panelEl)panelEl.classList.remove('hidden');
      loadPaymentsTo('wb-payment-list');
      break;
    default:"""

new_case_payment = """    case 'payment':
      if(panelEl)panelEl.classList.remove('hidden');
      loadPaymentsTo('wb-payment-list');
      break;
    case 'end':
      // Show project conclusion
      var proj2=allProjects.find(function(p){return p.id===curProjectId});
      if(proj2){
        var concl=proj2.conclusion||'';
        var concMap={approved:'✓ 认可商机，进入下一步',rejected:'✗ 不认可，流程结束'};
        document.getElementById('wb-end-conclusion').textContent=concMap[concl]||concl||'未填写';
        document.getElementById('wb-end-conclusion-notes').textContent=proj2.conclusion_notes||'';
        document.getElementById('wb-end-title').textContent=concl==='rejected'?'流程结束 - 商机不认可':'流程结束 - 商机已完成';
      }
      if(panelEl)panelEl.classList.remove('hidden');
      break;
    default:"""

if old_case_payment in html:
    html = html.replace(old_case_payment, new_case_payment, 1)
    changes += 1
    print("[OK] End case added to showStepPanel")
else:
    print("[ERR] payment case not found")

# ============================================================
# 9. When conclusion = rejected, auto-mark end and jump to 46
# (handled in saveProject already: status=suspended)
# Also auto-mark step46 when conclusion=approved and all done
# ============================================================

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"\nTotal changes: {changes}")
print(f"File size: {os.path.getsize(path)}")
