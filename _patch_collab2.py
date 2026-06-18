# -*- coding: utf-8 -*-
"""Inject follow-up + dept messages panels into collab module"""

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Add "跟进" and "消息" sub-tabs to collab subtabs
old_subtabs = '''<button class="collab-subtab" data-ctab="comment" onclick="switchCollabTab('comment')">\u534f\u4f5c</button>'''
new_subtabs = '''<button class="collab-subtab" data-ctab="followup" onclick="switchCollabTab('followup')">\u8ddf\u8fdb</button>
   <button class="collab-subtab" data-ctab="comment" onclick="switchCollabTab('comment')">\u534f\u4f5c</button>
   <button class="collab-subtab" data-ctab="msg" onclick="switchCollabTab('msg')">\u6d88\u606f</button>'''
html = html.replace(old_subtabs, new_subtabs)

# 2. Add followup panel before comment panel
followup_panel = '''
  <div id="collab-followup-panel" class="collab-panel hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <h3 style="font-size:16px;font-weight:700;margin:0">\u8ddf\u8fdb\u8bb0\u5f55</h3>
    <select id="fu-client-filter" onchange="loadFollowups()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="">\u5168\u90e8\u5ba2\u6237</option>
    </select>
    <select id="fu-type-filter" onchange="loadFollowups()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="">\u5168\u90e8\u7c7b\u578b</option>
     <option value="\u7535\u8bdd">\u7535\u8bdd</option><option value="\u62dc\u8bbf">\u62dc\u8bbf</option><option value="\u5fae\u4fe1">\u5fae\u4fe1</option><option value="\u90ae\u4ef6">\u90ae\u4ef6</option><option value="\u4f1a\u8bae">\u4f1a\u8bae</option><option value="\u5176\u4ed6">\u5176\u4ed6</option>
    </select>
    <button class="btn-sm btn-sm-primary" onclick="openFollowupForm()">+ \u65b0\u589e\u8ddf\u8fdb</button>
   </div>
   <div id="followup-list">\u52a0\u8f7d\u4e2d...</div>
  </div>
'''
html = html.replace('''<div id="collab-comment-panel" class="collab-panel hidden">''', followup_panel + '''<div id="collab-comment-panel" class="collab-panel hidden">''')

# 3. Add message panel
msg_panel = '''
  <div id="collab-msg-panel" class="collab-panel hidden">
   <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <h3 style="font-size:16px;font-weight:700;margin:0">\u90e8\u95e8\u6d88\u606f</h3>
    <select id="msg-dept-filter" onchange="loadMessages()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px">
     <option value="">\u5168\u90e8\u90e8\u95e8</option>
    </select>
    <button class="btn-sm btn-sm-primary" onclick="openMsgForm()">+ \u53d1\u6d88\u606f</button>
   </div>
   <div id="msg-list">\u52a0\u8f7d\u4e2d...</div>
  </div>
 </div>
 '''
html = html.replace('''</div>
 </div>
 <div id="leads-view" class="hidden">''', msg_panel + '''<div id="leads-view" class="hidden">''')

# 4. Inject JS functions
collab_js2 = '''
// === Collab: Follow-up Records ===
async function loadFollowups(){
  if(!currentCompanyId)return;
  var clientFilter=document.getElementById('fu-client-filter').value;
  var typeFilter=document.getElementById('fu-type-filter').value;
  // Populate client filter
  var sel=document.getElementById('fu-client-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allClients.length;i++){var cl=allClients[i];sel.innerHTML+='<option value=\"'+cl.id+'\">'+h(cl.name)+'</option>'}
  }
  var q=sb.from('engagement_logs').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(clientFilter)q=q.eq('client_id',clientFilter);
  if(typeFilter)q=q.eq('type',typeFilter);
  var {data}=await q;
  var list=document.getElementById('followup-list');
  if(!data||!data.length){list.innerHTML='<div class=\"empty\" style=\"padding:20px\">暂无跟进记录</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var f=data[i];var cl2=allClients.find(function(x){return x.id===f.client_id});
    h+='<div class=\"schedule-item\" style=\"border-left-color:#8B5CF6\"><div class=\"sch-title\"><span style=\"background:#EDE9FE;color:#7C3AED;padding:1px 6px;border-radius:4px;font-size:11px\">'+h(f.type||'其他')+'</span> '+(cl2?h(cl2.name):'未知客户')+'</div><div style=\"font-size:13px;margin:4px 0\">'+h(f.content||'')+'</div>'+(f.outcome?'<div style=\"font-size:12px;color:#10B981\">'+h(f.outcome)+'</div>':'')+(f.next_step?'<div class=\"sch-meta\">下一步: '+h(f.next_step)+(f.next_date?' ('+f.next_date+')':'')+'</div>':'')+'<div class=\"sch-meta\">'+new Date(f.created_at).toLocaleString('zh-CN')+'<button class=\"btn-sm\" style=\"font-size:10px;padding:1px 6px;color:var(--danger);margin-left:8px\" onclick=\"deleteEngagement(\''+f.id+'\')\">删除</button></div></div>';
  }
  list.innerHTML=h;
}

function openFollowupForm(){
  var h='<div class=\"modal-overlay\" id=\"followup-modal\"><div class=\"modal-sheet\"><h3>新增跟进记录</h3>';
  h+='<div class=\"form-group\"><label>客户 *</label><select id=\"fu-client\"><option value=\"\">请选择</option>';
  for(var i=0;i<allClients.length;i++)h+='<option value=\"'+allClients[i].id+'\">'+h(allClients[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class=\"form-group\"><label>跟进类型</label><select id=\"fu-type\"><option value=\"电话\">电话</option><option value=\"拜访\">拜访</option><option value=\"微信\">微信</option><option value=\"邮件\">邮件</option><option value=\"会议\">会议</option><option value=\"其他\">其他</option></select></div>';
  h+='<div class=\"form-group\"><label>跟进内容 *</label><textarea id=\"fu-content\" rows=\"3\" placeholder=\"请输入跟进内容...\"></textarea></div>';
  h+='<div class=\"form-group\"><label>结果</label><input id=\"fu-outcome\" placeholder=\"跟进结果（可选）\"></div>';
  h+='<div class=\"form-row\"><div class=\"form-group\"><label>下一步计划</label><input id=\"fu-next-step\" placeholder=\"下一步\"></div><div class=\"form-group\"><label>下次跟进日期</label><input type=\"date\" id=\"fu-next-date\"></div></div>';
  h+='<div class=\"modal-actions\"><button class=\"btn-cancel\" onclick=\"this.closest(\'.modal-overlay\').remove()\">取消</button><button class=\"btn-save\" onclick=\"saveFollowup()\">保存</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function saveFollowup(){
  var clientId=document.getElementById('fu-client').value;
  var type=document.getElementById('fu-type').value;
  var content=document.getElementById('fu-content').value.trim();
  if(!clientId||!content){showToast('请填写客户和内容');return}
  var outcome=document.getElementById('fu-outcome').value.trim();
  var nextStep=document.getElementById('fu-next-step').value.trim();
  var nextDate=document.getElementById('fu-next-date').value||null;
  var {error}=await sb.from('engagement_logs').insert({company_id:currentCompanyId,client_id:clientId,type:type,content:content,outcome:outcome||null,next_step:nextStep||null,next_date:nextDate,created_by:currentUser.id});
  document.getElementById('followup-modal').remove();
  if(error){showToast('保存失败: '+error.message);return}
  loadFollowups();showToast('已保存');
}

// === Collab: Department Messages ===
async function loadMessages(){
  if(!currentCompanyId)return;
  var deptFilter=document.getElementById('msg-dept-filter').value;
  var sel=document.getElementById('msg-dept-filter');
  if(sel.options.length<=1){
    for(var i=0;i<allDepartments.length;i++){var d=allDepartments[i];sel.innerHTML+='<option value=\"'+d.id+'\">'+h(d.name)+'</option>'}
  }
  var q=sb.from('dept_messages').select('*').eq('company_id',currentCompanyId).order('created_at',{ascending:false});
  if(deptFilter)q=q.eq('dept_id',deptFilter);
  var {data}=await q;
  var list=document.getElementById('msg-list');
  if(!data||!data.length){list.innerHTML='<div class=\"empty\" style=\"padding:20px\">暂无消息</div>';return}
  var h='';
  for(var i=0;i<data.length;i++){
    var m=data[i];
    var user=allUsers.find(function(u){return u.user_id===m.user_id});
    var dept=allDepartments.find(function(d){return d.id===m.dept_id});
    var userName=user?(user.display_name||user.email||''):'未知';
    h+='<div class=\"schedule-item\" style=\"border-left-color:#10B981\"><div class=\"sch-title\">'+h(userName)+(dept?' <span style=\"font-size:11px;color:var(--text3)\">@'+h(dept.name)+'</span>':'')+'</div><div style=\"font-size:14px;margin:4px 0\">'+h(m.content)+'</div>'+(m.attachments&&m.attachments.length?'<div style=\"font-size:11px;color:var(--primary)\">附件: '+m.attachments.length+'个</div>':'')+'<div class=\"sch-meta\">'+new Date(m.created_at).toLocaleString('zh-CN')+'</div></div>';
  }
  list.innerHTML=h;
}

function openMsgForm(){
  var h='<div class=\"modal-overlay\" id=\"msg-modal\"><div class=\"modal-sheet\"><h3>发送部门消息</h3>';
  h+='<div class=\"form-group\"><label>目标部门</label><select id=\"msg-dept\"><option value=\"\">全公司</option>';
  for(var i=0;i<allDepartments.length;i++)h+='<option value=\"'+allDepartments[i].id+'\">'+h(allDepartments[i].name)+'</option>';
  h+='</select></div>';
  h+='<div class=\"form-group\"><label>消息内容 *</label><textarea id=\"msg-content\" rows=\"3\" placeholder=\"输入消息...\"></textarea></div>';
  h+='<div class=\"modal-actions\"><button class=\"btn-cancel\" onclick=\"this.closest(\'.modal-overlay\').remove()\">取消</button><button class=\"btn-save\" onclick=\"sendMsg()\">发送</button></div></div></div>';
  document.body.insertAdjacentHTML('beforeend',h);
}

async function sendMsg(){
  var deptId=document.getElementById('msg-dept').value||null;
  var content=document.getElementById('msg-content').value.trim();
  if(!content){showToast('请输入消息内容');return}
  var {error}=await sb.from('dept_messages').insert({company_id:currentCompanyId,dept_id:deptId?parseInt(deptId):null,user_id:currentUser.id,content:content});
  document.getElementById('msg-modal').remove();
  if(error){showToast('发送失败: '+error.message);return}
  loadMessages();showToast('已发送');
}

// Update switchCollabTab to support new tabs
var _origSwitchCollabTab=switchCollabTab;
switchCollabTab=function(tab){
  _origSwitchCollabTab(tab);
  document.getElementById('collab-followup-panel').classList.toggle('hidden',tab!=='followup');
  document.getElementById('collab-msg-panel').classList.toggle('hidden',tab!=='msg');
  if(tab==='followup')loadFollowups();
  else if(tab==='msg')loadMessages();
};
'''

js_marker = '// ============== COLLAB OFFICE MODULE =============='
html = html.replace(js_marker, collab_js2 + '\n' + js_marker)

# Save
with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Verify
for fn in ['loadFollowups','openFollowupForm','saveFollowup','loadMessages','openMsgForm','sendMsg']:
    status = 'OK' if fn in html else 'MISS'
    print(status + ': ' + fn)
print('Lines: ' + str(len(html.splitlines())))
# Brace balance
import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
total = 0
for idx, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        print('Imbalance script ' + str(idx) + ': ' + str(d))
        total += d
print('Brace balance: ' + str(total))
