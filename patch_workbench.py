import re, os

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# ============================================================
# 1. Replace projects-view HTML block
# ============================================================
old_projects_view_start = '<!-- ===== Projects View ===== -->'
old_projects_view_end = '<div id="script-loaded-check"'

# Find the block
start_idx = html.find(old_projects_view_start)
end_idx = html.find(old_projects_view_end, start_idx)
if start_idx == -1 or end_idx == -1:
    print("ERROR: Could not find projects-view block")
    exit(1)

new_projects_view = '''<!-- ===== Projects View ===== -->
<div id="projects-view" class="hidden">
 <div id="project-list-panel" class="project-panel">
  <div style="background:#ffeb3b;padding:8px 12px;margin-bottom:8px;border-radius:4px;font-size:13px;font-weight:700">DIAG: panel visible - JS will replace</div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
   <h3 style="font-size:16px;font-weight:700;margin:0">项目管理</h3>
   <button class="btn-sm btn-sm-primary" onclick="openProjectForm()">+ 新建项目</button>
  </div>
  <div id="pm-project-list" style="display:flex;flex-direction:column;gap:8px"><div style="text-align:center;padding:40px;color:var(--text2)">加载中...</div></div>
 </div>

 <!-- ===== Project Workbench ===== -->
 <div id="project-workbench" class="hidden" style="display:none;flex-direction:column;height:calc(100vh - 60px)">
  <!-- Top Bar -->
  <div id="wb-topbar" style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);background:var(--card-bg);flex-shrink:0;flex-wrap:wrap">
   <button class="btn-sm" onclick="closeProjectWorkbench()" style="flex-shrink:0">← 返回列表</button>
   <h3 style="font-size:15px;font-weight:700;margin:0;flex:1;min-width:120px" id="wb-project-name">-</h3>
   <span style="font-size:11px;color:var(--text2);flex-shrink:0" id="wb-step-label">当前步骤：-</span>
   <div style="width:80px;height:4px;background:var(--border);border-radius:2px;flex-shrink:0">
    <div id="wb-progress-bar" style="height:100%;background:var(--primary);border-radius:2px;transition:width .3s;width:0%"></div>
   </div>
   <span style="font-size:11px;color:var(--text2);min-width:32px;flex-shrink:0" id="wb-progress-text">0/46</span>
  </div>

  <!-- Split Layout -->
  <div style="display:flex;flex:1;overflow:hidden">
   <!-- Left: Workflow Nav -->
   <div id="wb-left" style="width:250px;border-right:1px solid var(--border);overflow-y:auto;overflow-x:hidden;flex-shrink:0;background:var(--bg2)">
    <div id="wb-workflow-nav" style="padding:4px 0 120px"></div>
   </div>

   <!-- Right: Content Area -->
   <div id="wb-right" style="flex:1;overflow-y:auto;padding:16px;background:var(--bg)">
    <div id="wb-content-default" style="text-align:center;padding:60px 20px;color:var(--text3);font-size:14px">👈 点击左侧流程步骤查看详情</div>

    <!-- Step-specific panels (hidden by default, shown based on active step) -->
    <div id="wb-panel-basic" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 12px">📋 项目基本信息</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
       <div><label style="font-size:11px;color:var(--text3)">项目名称</label><div style="font-weight:600" id="wb-info-name">-</div></div>
       <div><label style="font-size:11px;color:var(--text3)">关联客户</label><div id="wb-info-client">-</div></div>
       <div><label style="font-size:11px;color:var(--text3)">预算</label><div id="wb-info-budget">-</div></div>
       <div><label style="font-size:11px;color:var(--text3)">状态</label><div id="wb-info-status">-</div></div>
       <div><label style="font-size:11px;color:var(--text3)">开始日期</label><div id="wb-info-start">-</div></div>
       <div><label style="font-size:11px;color:var(--text3)">结束日期</label><div id="wb-info-end">-</div></div>
      </div>
     </div>
    </div>

    <div id="wb-panel-editor" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 4px" id="wb-editor-title">📝 步骤详情</h3>
     <div style="font-size:12px;color:var(--text3);margin-bottom:12px" id="wb-editor-desc"></div>
     <textarea id="wb-editor-note" rows="6" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text)" placeholder="记录备注..."></textarea>
     <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
      <button class="btn-save" onclick="saveStepNote()">💾 保存备注</button>
      <button class="btn-sm btn-sm-primary" onclick="markStepDone()">✓ 标记完成</button>
      <span style="font-size:11px;color:var(--text3)" id="wb-save-status"></span>
     </div>
    </div>

    <div id="wb-panel-competitor" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 12px">📊 竞争分析</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px">
      <label style="font-size:12px;font-weight:600">竞争对手名单（每行一个）</label>
      <textarea id="wb-competitor-list" rows="5" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-bottom:12px" placeholder="公司A&#10;公司B&#10;公司C"></textarea>
      <label style="font-size:12px;font-weight:600">竞争分析笔记</label>
      <textarea id="wb-competitor-note" rows="5" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text)" placeholder="优劣势分析、市场份额、关键人..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveStepNote()">💾 保存</button>
     </div>
    </div>

    <div id="wb-panel-decision-chain" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 12px">🔗 决策链分析</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:12px">
      <label style="font-size:12px;font-weight:600">决策链成员（每行：姓名 | 角色 | 影响力 1-5 | 倾向）</label>
      <textarea id="wb-chain-members" rows="6" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text);margin-bottom:12px" placeholder="张三 | 技术总监 | 4 | 中立&#10;李四 | 采购经理 | 5 | 倾向我方&#10;王五 | 财务副总 | 3 | 倾向竞对"></textarea>
      <label style="font-size:12px;font-weight:600">汇报策略</label>
      <textarea id="wb-chain-strategy" rows="4" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text)" placeholder="针对各决策人的汇报策略..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveStepNote()">💾 保存</button>
     </div>
    </div>

    <div id="wb-panel-tender" class="hidden" style="max-width:640px">
     <h3 style="margin:0 0 12px">📑 招标方案</h3>
     <div style="background:var(--card-bg);border:1px solid var(--border);border-radius:10px;padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
       <div><label style="font-size:11px;color:var(--text3)">招标方式</label>
        <select id="wb-tender-type" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);font-size:14px">
         <option value="">-</option><option value="open">公开招标</option><option value="invited">邀请招标</option><option value="competitive">竞争性谈判</option><option value="single">单一来源</option>
        </select>
       </div>
       <div><label style="font-size:11px;color:var(--text3)">预计金额</label><input id="wb-tender-amount" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);font-size:14px" placeholder="万元"></div>
       <div><label style="font-size:11px;color:var(--text3)">发标日期</label><input type="date" id="wb-tender-date" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);font-size:14px"></div>
       <div><label style="font-size:11px;color:var(--text3)">截标日期</label><input type="date" id="wb-tender-deadline" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);font-size:14px"></div>
      </div>
      <label style="font-size:12px;font-weight:600">招标要点</label>
      <textarea id="wb-tender-note" rows="4" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;resize:vertical;background:var(--card-bg);color:var(--text)" placeholder="资质要求、评分标准、特殊条款..."></textarea>
      <button class="btn-save" style="margin-top:8px" onclick="saveStepNote()">💾 保存</button>
     </div>
    </div>

    <!-- Bidding Module (steps 21-37) -->
    <div id="wb-panel-bidding" class="hidden">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;font-weight:700;margin:0">📑 招投标</h3>
      <button class="btn-sm btn-sm-primary" onclick="openBiddingForm()">+ 新建投标</button>
     </div>
     <div id="wb-bidding-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Contract Module (steps 38-41) -->
    <div id="wb-panel-contract" class="hidden">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;font-weight:700;margin:0">📋 合同</h3>
      <button class="btn-sm btn-sm-primary" onclick="openProjectContractForm()">+ 新建合同</button>
     </div>
     <div id="wb-contract-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Delivery Module (steps 42-44) -->
    <div id="wb-panel-delivery" class="hidden">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;font-weight:700;margin:0">📦 项目交付</h3>
      <button class="btn-sm btn-sm-primary" onclick="openDeliveryForm()">+ 新建交付</button>
     </div>
     <div id="wb-delivery-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Payment Module (step 45) -->
    <div id="wb-panel-payment" class="hidden">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;font-weight:700;margin:0">💰 项目收款</h3>
      <button class="btn-sm btn-sm-primary" onclick="openPaymentForm()">+ 新建收款</button>
     </div>
     <div id="wb-payment-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Stage Management (kept for compatibility) -->
    <div id="wb-panel-stages" class="hidden">
     <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:16px;font-weight:700;margin:0">📊 阶段管理</h3>
      <button class="btn-sm btn-sm-primary" onclick="openStageForm()">+ 添加阶段</button>
     </div>
     <div id="wb-stages-list" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

   </div><!-- /wb-right -->
  </div><!-- /split -->
 </div><!-- /project-workbench -->
</div><!-- /projects-view -->
'''

html = html[:start_idx] + new_projects_view + html[end_idx:]

# ============================================================
# 2. Add workbench CSS
# ============================================================
old_css = '.delivery-item,.payment-item{background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}'
new_css = '''.delivery-item,.payment-item{background:var(--card-bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}

/* ── Project Workbench ── */
.wb-phase{padding:0;margin:0;border-bottom:1px solid var(--border)}
.wb-phase-header{display:flex;align-items:center;gap:6px;padding:8px 12px;cursor:pointer;font-size:12px;font-weight:700;color:var(--text);background:var(--card-bg);user-select:none;position:sticky;top:0;z-index:1}
.wb-phase-header:hover{background:var(--bg2)}
.wb-phase-header .wb-phase-caret{font-size:10px;transition:transform .2s;width:12px;text-align:center}
.wb-phase-collapsed .wb-phase-caret{transform:rotate(-90deg)}
.wb-phase-header .wb-phase-count{font-size:10px;color:var(--text3);margin-left:auto}
.wb-step{display:flex;align-items:center;gap:8px;padding:6px 12px 6px 20px;cursor:pointer;transition:background .1s;border-left:3px solid transparent;font-size:12px}
.wb-step:hover{background:var(--bg2)}
.wb-step.active{background:rgba(59,130,246,.08);border-left-color:var(--primary);font-weight:600}
.wb-step.done{opacity:.55}
.wb-step.done .wb-step-name{text-decoration:line-through}
.wb-step.skipped{opacity:.35;pointer-events:none}
.wb-step-num{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;background:var(--card-bg);color:var(--text3)}
.wb-step.active .wb-step-num{background:var(--primary);border-color:var(--primary);color:#fff}
.wb-step.done .wb-step-num{background:var(--primary);border-color:var(--primary);color:#fff}
.wb-step-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-size:12px}
.wb-step-badge{font-size:9px;padding:1px 5px;border-radius:6px;font-weight:600;white-space:nowrap;flex-shrink:0}
.wb-badge-decision{background:#fee2e2;color:#991b1b}
.wb-badge-branch{background:#e0e7ff;color:#3730a3}
.wb-badge-end{background:#f3f4f6;color:#6b7280}
.wb-decision-popup{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--card-bg);border:1px solid var(--border);border-radius:12px;padding:24px;z-index:20000;box-shadow:0 8px 40px rgba(0,0,0,.15);min-width:320px;text-align:center}
.wb-decision-mask{position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:19999}
.wb-connector{display:flex;align-items:center;gap:6px;padding:0 12px;margin:4px 0;font-size:11px;color:var(--text3)}
.wb-connector-line{flex:1;height:0;border-top:1px dashed var(--border)}
.wb-connector-label{flex-shrink:0;font-weight:600}
@media(max-width:768px){
  #wb-left{width:200px!important}
  #wb-topbar{gap:4px;padding:6px 8px}
  #wb-topbar h3{font-size:13px}
}'''

html = html.replace(old_css, new_css, 1)

# ============================================================
# Write back
# ============================================================
with open(path, 'w', encoding='utf-8') as f:
    f.write(html)

print("HTML + CSS replacement done. File size:", os.path.getsize(path))
