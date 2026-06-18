content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()

# ============================================================
# PATCH 1: Add 4 new admin subtab buttons
# ============================================================
old_tabs_end = '<button class="admin-subtab hidden" id="admin-tab-companies" onclick="switchAdminTab(\'companies\')">公司审核</button>\n  </div>'
new_tabs_end = '''<button class="admin-subtab hidden" id="admin-tab-companies" onclick="switchAdminTab('companies')">公司审核</button>
   <button class="admin-subtab" id="admin-tab-employees" onclick="switchAdminTab('employees')">员工管理</button>
   <button class="admin-subtab" id="admin-tab-logs" onclick="switchAdminTab('logs')">操作日志</button>
   <button class="admin-subtab" id="admin-tab-config" onclick="switchAdminTab('config')">系统配置</button>
   <button class="admin-subtab" id="admin-tab-security" onclick="switchAdminTab('security')">数据安全</button>
  </div>'''

if old_tabs_end in content:
    content = content.replace(old_tabs_end, new_tabs_end)
    print('PATCH 1 OK: admin subtabs added')
else:
    print('PATCH 1 FAIL: subtabs anchor not found')

# ============================================================
# PATCH 2: Add new admin panels (employees, logs, config, security)
# Insert BEFORE </div> that closes admin-view
# ============================================================
old_panels_end = '''   <div id="admin-perms-grid" style="overflow-x:auto"></div>
  </div>
 </div>'''

new_panels = '''   <div id="admin-perms-grid" style="overflow-x:auto"></div>
  </div>

  <!-- Employee Management -->
  <div id="admin-employees" class="admin-panel hidden">
   <div class="toolbar" style="margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <div class="search-wrap"><input id="admin-emp-search" placeholder="搜索员工..." oninput="renderAdminEmployees()"></div>
    <select id="emp-dept-filter" onchange="renderAdminEmployees()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="">全部部门</option></select>
    <select id="emp-status-filter" onchange="renderAdminEmployees()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="">全部状态</option><option value="active">在职</option><option value="inactive">离职</option></select>
    <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openEmployeeForm()">+ 添加员工</button>
   </div>
   <div id="admin-emp-list"></div>
   <!-- Employee form modal (inline) -->
   <div id="emp-form-modal" class="modal-overlay" style="display:none"><div class="modal" style="max-width:500px">
    <div class="modal-header"><span id="emp-form-title">添加员工</span><button class="modal-close" onclick="closeEmployeeForm()">&times;</button></div>
    <div class="modal-body">
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">姓名</label><input id="ef-name" placeholder="员工姓名" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">邮箱</label><input id="ef-email" placeholder="登录邮箱" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">角色</label><select id="ef-role" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"></select>
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">部门</label><select id="ef-dept" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="">未分配</option></select>
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">数据权限</label><select id="ef-data-scope" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="all">全部数据</option><option value="dept">本部门</option><option value="own">仅自己</option></select>
     <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">状态</label><select id="ef-status" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="active">在职</option><option value="inactive">离职</option></select>
     <div id="ef-reassign-row" style="display:none;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">客户交接给</label><select id="ef-reassign" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;background:var(--card);color:var(--text)"><option value="">回收公共池</option></select>
     </div>
     <div class="btns"><button class="btn-cancel" onclick="closeEmployeeForm()">取消</button><button class="btn-confirm" onclick="saveEmployee()">保存</button></div>
    </div>
   </div></div>
  </div>

  <!-- Operation Logs -->
  <div id="admin-logs" class="admin-panel hidden">
   <div class="toolbar" style="margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <select id="log-action" onchange="renderOperationLogs()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
     <option value="">全部操作</option><option value="create">创建</option><option value="update">更新</option><option value="delete">删除</option><option value="export">导出</option>
    </select>
    <select id="log-entity" onchange="renderOperationLogs()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)">
     <option value="">全部类型</option><option value="client">客户</option><option value="contact">联系人</option><option value="order">订单</option><option value="contract">合同</option>
    </select>
    <input id="log-search" placeholder="搜索..." oninput="renderOperationLogs()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;width:160px">
    <button class="btn-save" style="padding:8px 16px;font-size:13px;margin-left:auto" onclick="exportOperationLogs()">导出CSV</button>
   </div>
   <div id="admin-log-list" style="overflow-x:auto"></div>
  </div>

  <!-- System Configuration -->
  <div id="admin-config" class="admin-panel hidden">
   <div class="admin-tabs" style="margin-bottom:12px">
    <button class="admin-subtab active" onclick="switchConfigTab('fields')">自定义字段</button>
    <button class="admin-subtab" onclick="switchConfigTab('forms')">自定义表单</button>
    <button class="admin-subtab" onclick="switchConfigTab('stages')">销售阶段</button>
    <button class="admin-subtab" onclick="switchConfigTab('tags')">自定义标签</button>
    <button class="admin-subtab" onclick="switchConfigTab('numbering')">编号规则</button>
   </div>
   <!-- Custom Fields -->
   <div id="cfg-fields" class="admin-panel" style="padding:0">
    <div class="toolbar" style="margin-bottom:10px">
     <select id="cfg-field-entity" onchange="renderCustomFields()" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);font-size:13px;background:var(--card);color:var(--text)"><option value="client">客户</option><option value="contact">联系人</option><option value="order">订单</option><option value="product">产品</option></select>
     <button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openFieldForm()">+ 添加字段</button>
    </div>
    <div id="cfg-field-list"></div>
    <div id="field-form-modal" class="modal-overlay" style="display:none"><div class="modal" style="max-width:450px">
     <div class="modal-header"><span id="field-form-title">添加自定义字段</span><button class="modal-close" onclick="closeFieldForm()">&times;</button></div>
     <div class="modal-body">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">实体类型</label><select id="fif-entity" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="client">客户</option></select>
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">字段标识</label><input id="fif-name" placeholder="custom_field" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">显示名称</label><input id="fif-label" placeholder="自定义字段" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">字段类型</label><select id="fif-type" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="text">文本</option><option value="number">数字</option><option value="date">日期</option><option value="select">下拉</option><option value="textarea">多行文本</option></select>
      <div id="fif-options-row" style="display:none;margin-bottom:12px">
       <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">选项(逗号分隔)</label><input id="fif-options" placeholder="选项1,选项2" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px">
      </div>
      <label style="font-size:13px;color:var(--text2);margin-bottom:8px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="fif-required"> 必填</label>
      <div class="btns"><button class="btn-cancel" onclick="closeFieldForm()">取消</button><button class="btn-confirm" onclick="saveField()">保存</button></div>
     </div>
    </div></div>
   </div>
   <!-- Custom Forms -->
   <div id="cfg-forms" class="admin-panel hidden" style="padding:0">
    <div class="toolbar" style="margin-bottom:10px"><button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openFormBuilder()">+ 创建表单</button></div>
    <div id="cfg-form-list"></div>
   </div>
   <!-- Sales Stages -->
   <div id="cfg-stages" class="admin-panel hidden" style="padding:0">
    <div class="toolbar" style="margin-bottom:10px"><button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openStageForm()">+ 添加阶段</button></div>
    <div id="cfg-stage-list"></div>
    <div id="stage-form-modal" class="modal-overlay" style="display:none"><div class="modal" style="max-width:450px">
     <div class="modal-header"><span id="stage-form-title">添加销售阶段</span><button class="modal-close" onclick="closeStageForm()">&times;</button></div>
     <div class="modal-body">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">阶段名称</label><input id="sgf-name" placeholder="方案演示" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">标识key</label><input id="sgf-key" placeholder="demo" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">颜色</label><input type="color" id="sgf-color" value="#4F6EF7" style="width:60px;height:36px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px;cursor:pointer">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">成交概率(%)</label><input type="number" id="sgf-prob" value="50" min="0" max="100" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <div class="btns"><button class="btn-cancel" onclick="closeStageForm()">取消</button><button class="btn-confirm" onclick="saveStage()">保存</button></div>
     </div>
    </div></div>
   </div>
   <!-- Custom Tags -->
   <div id="cfg-tags" class="admin-panel hidden" style="padding:0">
    <div class="toolbar" style="margin-bottom:10px"><button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openTagForm()">+ 添加标签</button></div>
    <div id="cfg-tag-list" style="display:flex;flex-wrap:wrap;gap:8px"></div>
    <div id="tag-form-modal" class="modal-overlay" style="display:none"><div class="modal" style="max-width:400px">
     <div class="modal-header"><span id="tag-form-title">添加标签</span><button class="modal-close" onclick="closeTagForm()">&times;</button></div>
     <div class="modal-body">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">标签名称</label><input id="tgf-name" placeholder="重要客户" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">颜色</label><input type="color" id="tgf-color" value="#4F6EF7" style="width:60px;height:36px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px;cursor:pointer">
      <div class="btns"><button class="btn-cancel" onclick="closeTagForm()">取消</button><button class="btn-confirm" onclick="saveTag()">保存</button></div>
     </div>
    </div></div>
   </div>
   <!-- Numbering Rules -->
   <div id="cfg-numbering" class="admin-panel hidden" style="padding:0">
    <div class="toolbar" style="margin-bottom:10px"><button class="btn-save" style="padding:8px 16px;font-size:13px" onclick="openNumberRule()">+ 添加规则</button></div>
    <div id="cfg-number-list"></div>
    <div id="num-form-modal" class="modal-overlay" style="display:none"><div class="modal" style="max-width:450px">
     <div class="modal-header"><span id="num-form-title">添加编号规则</span><button class="modal-close" onclick="closeNumberForm()">&times;</button></div>
     <div class="modal-body">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">实体类型</label><select id="nmf-entity" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="client">客户</option><option value="order">订单</option><option value="quotation">报价</option><option value="contract">合同</option></select>
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">前缀</label><input id="nmf-prefix" placeholder="KH" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">日期格式</label><select id="nmf-datefmt" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px;background:var(--card);color:var(--text)"><option value="YYYYMMDD">YYYYMMDD</option><option value="YYMMDD">YYMMDD</option><option value="YYYYMM">YYYYMM</option><option value="none">无日期</option></select>
      <label style="font-size:13px;color:var(--text2);margin-bottom:4px;display:block">序号位数</label><input type="number" id="nmf-seqlength" value="3" min="2" max="8" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border);font-size:14px;margin-bottom:12px">
      <div class="btns"><button class="btn-cancel" onclick="closeNumberForm()">取消</button><button class="btn-confirm" onclick="saveNumberRule()">保存</button></div>
     </div>
    </div></div>
   </div>
  </div>

  <!-- Data Security -->
  <div id="admin-security" class="admin-panel hidden">
   <div style="display:grid;gap:16px">
    <div class="card" style="padding:16px">
     <h4 style="margin:0 0 12px">数据备份</h4>
     <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">
      <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="bk-clients" checked> 客户</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="bk-contacts"> 联系人</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="bk-orders"> 订单</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:6px"><input type="checkbox" id="bk-products"> 产品</label>
     </div>
     <div style="display:flex;gap:8px">
      <button class="btn-confirm" style="padding:8px 20px;font-size:13px" onclick="doBackup()">立即备份</button>
      <button class="btn-cancel" style="padding:8px 20px;font-size:13px" onclick="loadBackupHistory()">备份历史</button>
     </div>
     <div id="bk-history" style="margin-top:12px;font-size:13px"></div>
    </div>

    <div class="card" style="padding:16px">
     <h4 style="margin:0 0 12px">导出权限管控</h4>
     <div style="font-size:13px;color:var(--text2);margin-bottom:12px">配置各角色是否允许导出数据</div>
     <div id="sec-export-roles"></div>
    </div>

    <div class="card" style="padding:16px">
     <h4 style="margin:0 0 12px">数据脱敏</h4>
     <div style="display:flex;flex-direction:column;gap:8px">
      <label style="font-size:13px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="dm-mobile" onchange="toggleDataMasking()"> 隐藏客户手机号（显示138****1234）</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="dm-price" onchange="toggleDataMasking()"> 隐藏金额/价格</label>
      <label style="font-size:13px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="dm-email" onchange="toggleDataMasking()"> 隐藏邮箱地址</label>
     </div>
    </div>
   </div>
  </div>
 </div>'''

if old_panels_end in content:
    content = content.replace(old_panels_end, new_panels)
    print('PATCH 2 OK: admin panels added')
else:
    print('PATCH 2 FAIL: panels anchor not found')

# Save
with open(r"D:\1kaifa\grsds\index.html", 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print(f'File saved: {len(content.splitlines())} lines')
