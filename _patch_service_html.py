# -*- coding: utf-8 -*-
"""After-Sales Customer Service Module - Frontend Patch for index.html"""
import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

patches = 0

# ============================================================
# Patch 1: Add "售后" tab button after 库存 tab (L874)
# ============================================================
old_tab = '''<button class="topbar-tab" id="tab-inventory" onclick="switchTab('inventory')">库存</button>'''
new_tab = '''<button class="topbar-tab" id="tab-inventory" onclick="switchTab('inventory')">库存</button>
<button class="topbar-tab" id="tab-service" onclick="switchTab('service')">售后</button>'''
if old_tab in html:
    html = html.replace(old_tab, new_tab)
    patches += 1
    print('P1 OK: tab button added')

# ============================================================
# Patch 2: Add after-sales view after collab-view, before leads-view
# ============================================================
old_div = '</div>\n<div id="leads-view" class="hidden">'
after_sales_view = '''</div>
<!-- After-Sales Service View -->
<div id="service-view" class="hidden">
 <div class="sub-tabs" id="moresubs-after" style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;gap:4px;flex-wrap:wrap">
  <button class="sub-tab active" onclick="switchServiceTab('tickets')">🎫 工单</button>
  <button class="sub-tab" onclick="switchServiceTab('visits')">📞 回访</button>
  <button class="sub-tab" onclick="switchServiceTab('warranty')">🛡️ 质保</button>
  <button class="sub-tab" onclick="switchServiceTab('kb')">📚 知识库</button>
 </div>

 <!-- TICKETS PANEL -->
 <div id="sv-tickets" class="sv-panel">
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">
   <select id="ticket-status-filter" onchange="renderTickets()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部状态</option><option value="pending">待处理</option><option value="dispatched">已派单</option><option value="in_progress">处理中</option><option value="completed">已完成</option><option value="confirmed">已确认</option><option value="closed">已关闭</option>
   </select>
   <select id="ticket-type-filter" onchange="renderTickets()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部类型</option><option value="complaint">投诉</option><option value="repair">报修</option><option value="service">服务</option><option value="other">其他</option>
   </select>
   <div class="search-wrap"><input id="ticket-search" placeholder="搜索工单..." oninput="renderTickets()"></div>
   <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openTicketForm()">+ 新建工单</button>
  </div>
  <div id="ticket-grid" class="client-grid"></div>
  <div class="empty hidden" id="ticket-empty"><div class="empty-icon">🎫</div>暂无工单</div>
 </div>

 <!-- VISITS PANEL -->
 <div id="sv-visits" class="sv-panel hidden">
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">
   <select id="visit-type-filter" onchange="renderVisits()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部类型</option><option value="post_sale">成交回访</option><option value="care">关怀回访</option><option value="churn">流失回访</option><option value="other">其他</option>
   </select>
   <select id="visit-status-filter" onchange="renderVisits()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部状态</option><option value="planned">计划中</option><option value="completed">已完成</option><option value="cancelled">已取消</option>
   </select>
   <div class="search-wrap"><input id="visit-search" placeholder="搜索回访..." oninput="renderVisits()"></div>
   <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openVisitForm()">+ 新建回访</button>
   <button class="btn-sm" style="background:#fff;border:1px solid var(--border)" onclick="openVisitTaskForm()">📅 回访任务</button>
  </div>
  <!-- Visit tasks alert bar -->
  <div id="visit-tasks-alert" style="margin:0 16px 8px;padding:10px 14px;background:#fef3c7;border-radius:8px;font-size:13px;display:none"></div>
  <div id="visit-grid" class="client-grid"></div>
  <div class="empty hidden" id="visit-empty"><div class="empty-icon">📞</div>暂无回访记录</div>
 </div>

 <!-- WARRANTY PANEL -->
 <div id="sv-warranty" class="sv-panel hidden">
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">
   <select id="warranty-status-filter" onchange="renderWarranties()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部状态</option><option value="active">有效</option><option value="expired">已过期</option><option value="void">已作废</option><option value="claimed">已理赔</option>
   </select>
   <div class="search-wrap"><input id="warranty-search" placeholder="搜索质保..." oninput="renderWarranties()"></div>
   <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openWarrantyForm()">+ 新建质保</button>
  </div>
  <!-- Expiring soon alert -->
  <div id="warranty-alert" style="margin:0 16px 8px;padding:10px 14px;background:#fee2e2;border-radius:8px;font-size:13px;display:none"></div>
  <div id="warranty-grid" class="client-grid"></div>
  <div class="empty hidden" id="warranty-empty"><div class="empty-icon">🛡️</div>暂无质保记录</div>

  <!-- Maintenance Plans -->
  <div style="margin-top:20px;padding:16px;border-top:2px solid var(--border)">
   <div class="toolbar" style="margin-bottom:10px">
    <h3 style="font-size:15px;font-weight:700;margin:0">🔧 维保计划</h3>
    <button class="btn-sm btn-sm-primary" onclick="openMaintenanceForm()">+ 新建计划</button>
   </div>
   <div id="maintenance-grid" class="client-grid"></div>
   <div class="empty hidden" id="maintenance-empty"><div class="empty-icon">🔧</div>暂无维保计划</div>
  </div>
 </div>

 <!-- KNOWLEDGE BASE PANEL -->
 <div id="sv-kb" class="sv-panel hidden">
  <div class="toolbar" style="flex-wrap:wrap;gap:8px">
   <select id="kb-category-filter" onchange="renderKB()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
    <option value="all">全部分类</option><option value="faq">常见问题</option><option value="solution">解决方案</option><option value="script">标准话术</option><option value="policy">政策法规</option><option value="other">其他</option>
   </select>
   <div class="search-wrap"><input id="kb-search" placeholder="搜索知识库..." oninput="renderKB()"></div>
   <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openKBForm()">+ 新建文章</button>
  </div>
  <div id="kb-grid"></div>
  <div class="empty hidden" id="kb-empty"><div class="empty-icon">📚</div>暂无知识库文章</div>
 </div>

 <!-- TICKET FORM MODAL -->
 <div id="ticket-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width:560px">
   <div class="modal-header"><span id="ticket-form-title">新建工单</span><button class="modal-close" onclick="closeTicketForm()">&times;</button></div>
   <div class="modal-body">
    <label>标题</label><input id="tf-title" placeholder="工单标题" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <div style="display:flex;gap:10px;margin-bottom:12px">
     <div style="flex:1"><label>类型</label><select id="tf-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="service">服务</option><option value="repair">报修</option><option value="complaint">投诉</option><option value="other">其他</option></select></div>
     <div style="flex:1"><label>优先级</label><select id="tf-priority" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="normal">普通</option><option value="high">高</option><option value="urgent">紧急</option><option value="low">低</option></select></div>
    </div>
    <label>关联客户</label><select id="tf-client" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px"><option value="">不关联</option></select>
    <label>工程师/负责人</label><input id="tf-engineer" placeholder="工程师姓名" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>工单描述</label><textarea id="tf-desc" rows="3" placeholder="描述问题详情..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;resize:vertical"></textarea>
    <label>完成备注</label><textarea id="tf-completion" rows="2" placeholder="完工验收备注..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;resize:vertical"></textarea>
    <label>满意度 (1-5)</label><input id="tf-satisfaction" type="number" min="1" max="5" value="5" style="width:80px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:16px">
    <button class="btn-save" style="width:100%" onclick="saveTicket()">保存</button>
   </div>
  </div>
 </div>

 <!-- VISIT FORM MODAL -->
 <div id="visit-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width:500px">
   <div class="modal-header"><span id="visit-form-title">新建回访</span><button class="modal-close" onclick="closeVisitForm()">&times;</button></div>
   <div class="modal-body">
    <label>回访标题</label><input id="vf-title" placeholder="回访主题" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <div style="display:flex;gap:10px;margin-bottom:12px">
     <div style="flex:1"><label>类型</label><select id="vf-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="care">关怀回访</option><option value="post_sale">成交回访</option><option value="churn">流失回访</option><option value="other">其他</option></select></div>
     <div style="flex:1"><label>方式</label><select id="vf-method" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="phone">电话</option><option value="wechat">微信</option><option value="email">邮件</option><option value="visit">上门</option><option value="other">其他</option></select></div>
    </div>
    <label>关联客户</label><select id="vf-client" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px"><option value="">不关联</option></select>
    <label>计划日期</label><input id="vf-planned-date" type="date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>回访内容</label><textarea id="vf-content" rows="3" placeholder="回访记录..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;resize:vertical"></textarea>
    <label>满意度 (1-5)</label><input id="vf-satisfaction" type="number" min="1" max="5" style="width:80px;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:16px">
    <button class="btn-save" style="width:100%" onclick="saveVisit()">保存</button>
   </div>
  </div>
 </div>

 <!-- WARRANTY FORM MODAL -->
 <div id="warranty-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width:500px">
   <div class="modal-header"><span id="warranty-form-title">新建质保</span><button class="modal-close" onclick="closeWarrantyForm()">&times;</button></div>
   <div class="modal-body">
    <label>产品名称</label><input id="wf-product" placeholder="产品名称" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>序列号</label><input id="wf-serial" placeholder="产品序列号" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>关联客户</label><select id="wf-client" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px"><option value="">不关联</option></select>
    <div style="display:flex;gap:10px;margin-bottom:12px">
     <div style="flex:1"><label>质保开始</label><input id="wf-start" type="date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"></div>
     <div style="flex:1"><label>质保截止</label><input id="wf-end" type="date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"></div>
    </div>
    <label>质保类型</label><select id="wf-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px"><option value="standard">标准质保</option><option value="extended">延保</option><option value="free">免费</option><option value="paid">付费</option></select>
    <label>质保条款</label><textarea id="wf-terms" rows="2" placeholder="质保条款说明..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;resize:vertical"></textarea>
    <button class="btn-save" style="width:100%" onclick="saveWarranty()">保存</button>
   </div>
  </div>
 </div>

 <!-- MAINTENANCE FORM MODAL -->
 <div id="maintenance-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width:500px">
   <div class="modal-header"><span id="maintenance-form-title">新建维保计划</span><button class="modal-close" onclick="closeMaintenanceForm()">&times;</button></div>
   <div class="modal-body">
    <label>产品名称</label><input id="mf-product" placeholder="产品名称" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>关联客户</label><select id="mf-client" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px"><option value="">不关联</option></select>
    <div style="display:flex;gap:10px;margin-bottom:12px">
     <div style="flex:1"><label>计划类型</label><select id="mf-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="preventive">预防性维护</option><option value="inspection">巡检</option><option value="corrective">纠正性维修</option><option value="upgrade">升级</option></select></div>
     <div style="flex:1"><label>周期</label><select id="mf-interval" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="weekly">每周</option><option value="monthly">每月</option><option value="quarterly">每季</option><option value="yearly">每年</option></select></div>
    </div>
    <label>下次维保日期</label><input id="mf-next" type="date" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>负责人</label><input id="mf-assigned" placeholder="负责人姓名" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>备注</label><textarea id="mf-notes" rows="2" placeholder="维保备注..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:16px;resize:vertical"></textarea>
    <button class="btn-save" style="width:100%" onclick="saveMaintenance()">保存</button>
   </div>
  </div>
 </div>

 <!-- KB ARTICLE FORM MODAL -->
 <div id="kb-modal" class="modal-overlay hidden">
  <div class="modal" style="max-width:600px">
   <div class="modal-header"><span id="kb-form-title">新建知识库文章</span><button class="modal-close" onclick="closeKBForm()">&times;</button></div>
   <div class="modal-body">
    <label>标题</label><input id="kbf-title" placeholder="文章标题" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <div style="display:flex;gap:10px;margin-bottom:12px">
     <div style="flex:1"><label>分类</label><select id="kbf-category" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"><option value="faq">常见问题</option><option value="solution">解决方案</option><option value="script">标准话术</option><option value="policy">政策法规</option><option value="other">其他</option></select></div>
     <div style="flex:1"><label>关联产品</label><input id="kbf-products" placeholder="产品名称(逗号分隔)" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px"></div>
    </div>
    <label>标签</label><input id="kbf-tags" placeholder="标签(逗号分隔)" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
    <label>内容</label><textarea id="kbf-content" rows="8" placeholder="文章正文..." style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:16px;resize:vertical"></textarea>
    <button class="btn-save" style="width:100%" onclick="saveKB()">保存</button>
   </div>
  </div>
 </div>
<div id="leads-view" class="hidden">'''
if old_div in html:
    html = html.replace(old_div, after_sales_view)
    patches += 1
    print('P2 OK: service view panels added')
else:
    print('P2 FAIL: leads-view anchor not found')
    # Try finding it differently
    idx = html.find('<div id="leads-view" class="hidden">')
    if idx == -1:
        print('  leads-view NOT FOUND at all')

# ============================================================
# Patch 3: Add to allViews array (after iv, before ;)
# ============================================================
old_allviews = 'if(lv)allViews.push(lv);'
# Find the pattern: after collab-view push, before next line
old_av = 'if(colv2)allViews.push(colv2);if(purc'
if old_av in html:
    new_av = 'if(colv2)allViews.push(colv2);var sv2=document.getElementById(\'service-view\');if(sv2)allViews.push(sv2);if(purc'
    html = html.replace(old_av, new_av)
    patches += 1
    print('P3 OK: allViews updated')
else:
    print('P3 FAIL: allViews pattern not found')

# ============================================================
# Patch 4: Add to allTabs array
# ============================================================
old_tabs_pattern = 'var allTabs=[thm,tc,to,'
if old_tabs_pattern in html:
    new_tabs_pattern = 'var allTabs=[thm,tc,to,document.getElementById(\'tab-service\'),'
    html = html.replace(old_tabs_pattern, new_tabs_pattern)
    patches += 1
    print('P4 OK: allTabs updated')
else:
    print('P4 FAIL: allTabs pattern not found')

# ============================================================
# Patch 5: Add switchTab case for 'service'
# ============================================================
old_switch = "if(tab==='collab'){var"
if old_switch in html:
    new_switch = "if(tab==='collab'){var cols=document.getElementById('collab-view');if(cols)cols.classList.remove('hidden');loadComments();}\nif(tab==='service'){var ssv=document.getElementById('service-view');if(ssv)ssv.classList.remove('hidden');switchServiceTab('tickets');}\nif(tab==='collab'){var"
    # Actually, we should insert BEFORE the collab case
    # Let me find a better insertion point
    print('P5 retry with new strategy')
    
# Better approach: find switchTab function and add service case
old_switch2 = "if(tab==='admin'){"
if old_switch2 in html:
    new_switch2 = "if(tab==='service'){var sv2=document.getElementById('service-view');if(sv2)sv2.classList.remove('hidden');switchServiceTab('tickets');return}\n  if(tab==='admin'){"
    html = html.replace(old_switch2, new_switch2)
    patches += 1
    print('P5 OK: switchTab service case added')
else:
    print('P5 FAIL: switchTab pattern not found')

# Save
with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\nTotal patches: {patches}')
print(f'Lines: {len(html.splitlines())}')

# Verify brace balance
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
total = 0
for idx, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        print(f'Brace imbalance script {idx}: diff={d}')
        total += d
print(f'Brace balance diff: {total}')
