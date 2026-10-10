// ==========================================================================
// grsds · 15-workflow.js  —  工作流模板设计器 · 权限矩阵扩展
// 源: js/app_v2.js 第 10403-10875 行（机械切片，未改一行代码）
// ==========================================================================
/* ===== WORKFLOW TEMPLATES ===== */
var wtEditId=null;

async function renderWorkflowTemplates(){
  dbg('renderWorkflowTemplates: start');
  var list=document.getElementById('workflow-template-list');
  if(!list){dbg('renderWorkflowTemplates: list element not found');return}
  try{
    var url=SUPABASE_URL+'/rest/v1/workflow_templates?order=id';
    dbg('renderWorkflowTemplates: fetching',url);
    var r=await callAdmin('select','workflow_templates',{query:'*',filters:[{col:'',op:'order',val:'id'}]});
    if(r&&r.error){dbg('renderWorkflowTemplates: fetch failed',r.error);list.innerHTML='<p style="color:var(--text2)">加载失败: '+escHtml(r.error.message||'未知错误')+'</p>';return}
    var data=r.data;dbg('renderWorkflowTemplates: got',data.length,'templates');
    allTemplates=data;
    var h='';
    if(!data||!data.length){h='<p style="color:var(--text2);text-align:center;padding:20px">暂无模板，点击上方按钮新建</p>'}
    else{
      for(var i=0;i<data.length;i++){
        var t=data[i];
        var stepCount=0;
        try{var s=typeof t.steps==='string'?JSON.parse(t.steps):t.steps;stepCount=Array.isArray(s)?s.length:0}catch(e){}
        var isGlobal=t.company_id===null?'全局':'公司';
        h+='<div class="card" style="padding:12px 16px;display:flex;justify-content:space-between;align-items:center">'+
          '<div><strong>'+escHtml(t.name)+'</strong> <span style="font-size:11px;color:var(--text2);margin-left:8px">'+isGlobal+' · '+stepCount+'步</span>'+
          (t.description?'<br><span style="font-size:12px;color:var(--text2)">'+escHtml(t.description)+'</span>':'')+
          '</div>'+
          '<div style="display:flex;gap:6px">'+
          '<button class="btn-sm" onclick="openWtEdit('+t.id+')">编辑</button>'+
          '<button class="btn-sm" style="background:#f44336;color:#fff" onclick="deleteWt('+t.id+')">删除</button>'+
          '</div></div>';
      }
    }
    list.innerHTML=h;
  }catch(e){console.error('renderWorkflowTemplates: exception',e);list.innerHTML='<p style="color:var(--text2)">加载异常: '+escHtml(e.message)+'</p>'}
}

function openWorkflowTemplateForm(){
  wtEditId=null;
  showWtModal('新建流程模板','');
}
function openWtEdit(id){
  var t=allTemplates.find(function(x){return x.id===id});
  if(!t)return;
  wtEditId=id;
  var steps=t.steps;
  if(typeof steps!=='string')steps=JSON.stringify(steps);
  showWtModal('编辑流程模板',steps);
}
function showWtModal(title,stepsJson){
  var overlay=document.getElementById('wt-modal-overlay');
  if(!overlay){
    overlay=document.createElement('div');overlay.id='wt-modal-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100vh;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center';
    document.body.appendChild(overlay);
  }
  // Parse existing steps
  var steps=[];
  try{if(stepsJson){steps=typeof stepsJson==='string'?JSON.parse(stepsJson):stepsJson;if(!Array.isArray(steps))steps=[]}}catch(e){steps=[]}
  wfEditorSteps=JSON.parse(JSON.stringify(steps)); // deep copy
  wfSelectedIdx=-1;
  overlay.innerHTML='<div style="background:var(--bg);border-radius:16px;padding:20px;width:1100px;max-width:98vw;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 8px 40px rgba(0,0,0,.3)">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
    '<h3 style="margin:0;font-size:16px">'+escHtml(title)+'</h3>'+
    '<button onclick="document.getElementById(\'wt-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer">&times;</button>'+
    '</div>'+
    '<div style="display:flex;gap:10px;margin-bottom:10px;align-items:center">'+
    '<label style="font-size:12px;color:var(--text2);white-space:nowrap">名称</label>'+
    '<input id="wt-name" class="input" placeholder="模板名称" value="'+(wtEditId?(allTemplates.find(function(x){return x.id===wtEditId})||{}).name||'':'')+'" style="width:200px;padding:5px 8px;font-size:12px">'+
    '<label style="font-size:12px;color:var(--text2);white-space:nowrap;margin-left:12px">描述</label>'+
    '<input id="wt-desc" class="input" placeholder="模板描述" value="'+(wtEditId?(allTemplates.find(function(x){return x.id===wtEditId})||{}).description||'':'')+'" style="flex:1;padding:5px 8px;font-size:12px">'+
    '<span style="font-size:11px;color:var(--text2);white-space:nowrap;margin-left:8px" id="wf-step-count">'+wfEditorSteps.length+'步</span>'+
    '</div>'+
    '<div class="wf-editor">'+
    '<div class="wf-sidebar">'+
    '<h4>拖放添加节点</h4>'+
    '<div class="wf-step-tpl standard" draggable="true" ondragstart="wfDragStart(event,\'standard\')">📌 标准步骤</div>'+
    '<div class="wf-step-tpl decision" draggable="true" ondragstart="wfDragStart(event,\'decision\')">🚦 判断节点</div>'+
    '<div class="wf-step-tpl endnode" draggable="true" ondragstart="wfDragStart(event,\'endnode\')">⏹️ 结束节点</div>'+
    '<div style="margin-top:16px;font-size:11px;color:var(--text2)">💡 点击节点选中编辑<br>拖拽节点调整位置<br>拖放侧边栏添加<br>选中后右侧编辑属性</div>'+
    '</div>'+
    '<div class="wf-canvas-wrap" id="wf-canvas-wrap" ondragover="event.preventDefault()" ondrop="wfDrop(event)" onclick="wfCanvasClick(event)">'+
    '<div class="wf-canvas" id="wf-canvas">'+
    '<svg class="wf-editor-svg" id="wf-svg" width="100%" height="100%"><defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#90caf9"/></marker></defs></svg>'+
    '</div>'+
    '</div>'+
    '<div class="wf-props-panel" id="wf-props-panel">'+
    '<h4>节点属性</h4>'+
    '<p style="font-size:12px;color:var(--text2)">点击左侧画布中的节点进行编辑</p>'+
    '</div>'+
    '</div>'+
    '<div class="wf-toolbar" style="justify-content:flex-end;margin-top:10px">'+
    '<button onclick="wfAutoLayout()">📐 自动排列</button>'+
    '<button onclick="document.getElementById(\'wt-modal-overlay\').remove()">取消</button>'+
    '<button class="primary" id="wt-save-btn" onclick="saveWtVisual()">保存模板</button>'+
    '</div>'+
    '</div>';
  overlay.style.display='flex';
  // Render all existing steps
  wfRenderAll();
}

var wfEditorSteps=[],wfSelectedIdx=-1;

function wfDragStart(e,type){e.dataTransfer.setData('text/plain',type)}
function wfDrop(e){
  e.preventDefault();
  var type=e.dataTransfer.getData('text/plain');
  var wrap=document.getElementById('wf-canvas-wrap');
  var canvas=document.getElementById('wf-canvas');
  var rect=canvas.getBoundingClientRect();
  var scrollX=wrap.scrollLeft;
  var scrollY=wrap.scrollTop;
  var x=e.clientX-rect.left+scrollX;
  var y=e.clientY-rect.top+scrollY;
  var maxSeq=0;
  for(var i=0;i<wfEditorSteps.length;i++){if(wfEditorSteps[i].seq>maxSeq)maxSeq=wfEditorSteps[i].seq}
  var seq=maxSeq+1;
  var node;
  if(type==='decision'){
    node={seq:seq,phase:'',key:'step_'+seq,name:'新判断',icon:'🚦',decision:true,decisionAsk:'是否继续？',decisionYes:'',decisionNo:''};
  }else if(type==='endnode'){
    node={seq:seq,phase:'结束',key:'end',name:'结束',icon:'⏹️',end:true};
  }else{
    node={seq:seq,phase:'',key:'step_'+seq,name:'新步骤',icon:'📌'};
  }
  node._x=x;node._y=y;
  wfEditorSteps.push(node);
  wfRenderAll();
  wfSelectStep(wfEditorSteps.length-1);
}
function wfRenderAll(){
  var canvas=document.getElementById('wf-canvas');
  var svg=document.getElementById('wf-svg');
  if(!canvas||!svg)return;
  // Render nodes
  var h='';
  for(var i=0;i<wfEditorSteps.length;i++){
    var s=wfEditorSteps[i];
    var x=s._x||(40+(i%4)*220);
    var y=s._y||(20+Math.floor(i/4)*110);
    var cls=s.end?'endnode':(s.decision?'decision':'standard');
    var sel=wfSelectedIdx===i?' selected':'';
    h+='<div class="wf-node '+cls+sel+'" id="wf-node-'+i+'" style="left:'+x+'px;top:'+y+'px" onclick="event.stopPropagation();wfSelectStep('+i+')" onmousedown="wfNodeDragStart(event,'+i+')">'+
      '<div class="wf-node-seq">'+s.seq+'</div>'+
      '<button class="wf-node-delete" onclick="event.stopPropagation();wfDeleteStep('+i+')">&times;</button>'+
      '<div class="wf-node-phase">'+escHtml(s.phase||'')+'</div>'+
      '<div class="wf-node-icon">'+escHtml(s.icon||'')+'</div>'+
      '<div class="wf-node-name">'+escHtml(s.name)+'</div>'+
      '<div class="wf-node-key">'+escHtml(s.key)+'</div>'+
      (s.decision?'<div style="font-size:10px;color:#e65100;margin-top:4px">✓ '+escHtml(s.decisionAsk||'')+'</div>':'')+
      '</div>';
  }
  canvas.innerHTML='<svg class="wf-editor-svg" id="wf-svg" width="100%" height="100%"><defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#90caf9"/></marker></defs></svg>'+h;
  // Render connections
  wfRenderConnections();
  // Update count
  var cnt=document.getElementById('wf-step-count');
  if(cnt)cnt.textContent=wfEditorSteps.length+'步';
}
function wfRenderConnections(){
  var svg=document.getElementById('wf-svg');
  if(!svg||wfEditorSteps.length<2)return;
  var links='';
  for(var i=0;i<wfEditorSteps.length;i++){
    var s=wfEditorSteps[i];
    if(s.end)continue;
    // Find next sequential step
    var next=null;
    if(s.decision){
      // Draw yes/no lines
      if(s.decisionYes){
        var yesIdx=wfEditorSteps.findIndex(function(x){return String(x.seq)===String(s.decisionYes)});
        if(yesIdx>=0)links+=wfDrawLink(i,yesIdx,'#4caf50','✓ '+escHtml(s.decisionYes||''));
      }
      if(s.decisionNo){
        var noIdx=wfEditorSteps.findIndex(function(x){return String(x.seq)===String(s.decisionNo)});
        if(noIdx>=0)links+=wfDrawLink(i,noIdx,'#f44336','✗ '+escHtml(s.decisionNo||''));
      }
    }
    // Always draw default next link
    for(var j=0;j<wfEditorSteps.length;j++){
      if(wfEditorSteps[j].seq===s.seq+1){next=j;break}
    }
    if(next!==null&&!s.decision){
      links+=wfDrawLink(i,next,'#90caf9','');
    }
  }
  svg.innerHTML='<defs><marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#90caf9"/></marker></defs>'+links;
}
function wfDrawLink(fromIdx,toIdx,color,label){
  var fn=document.getElementById('wf-node-'+fromIdx);
  var tn=document.getElementById('wf-node-'+toIdx);
  if(!fn||!tn)return '';
  var fRect=fn.getBoundingClientRect();
  var tRect=tn.getBoundingClientRect();
  var wrap=document.getElementById('wf-canvas-wrap');
  var wRect=wrap.getBoundingClientRect();
  var sx=wrap.scrollLeft, sy=wrap.scrollTop;
  var x1=fRect.left-wRect.left+sx+fRect.width;
  var y1=fRect.top-wRect.top+sy+fRect.height/2;
  var x2=tRect.left-wRect.left+sx;
  var y2=tRect.top-wRect.top+sy+tRect.height/2;
  var mx=(x1+x2)/2;
  return '<path d="M'+x1+','+y1+' C'+mx+','+y1+' '+mx+','+y2+' '+x2+','+y2+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrowhead)"/>'+
  (label?'<text x="'+(mx+4)+'" y="'+((y1+y2)/2-6)+'" font-size="10" fill="'+color+'">'+escHtml(label)+'</text>':'');
}
function wfSelectStep(idx){
  wfSelectedIdx=idx;
  wfRenderAll();
  wfShowProps(idx);
}

function wfShowProps(idx){
  var panel=document.getElementById('wf-props-panel');
  if(!panel)return;
  // 后台加载部门/角色（fire-and-forget），加载完自动重渲染
  if(!allDepartments||!allDepartments.length){
    sb.from('departments').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error){allDepartments=d.data||[];setTimeout(function(){wfShowProps(idx)},0);}});
  }
  if(!allRoles||!allRoles.length){
    sb.from('roles').select('*').eq('company_id',currentCompanyId).order('name').then(function(d){if(!d.error){allRoles=d.data||[];setTimeout(function(){wfShowProps(idx)},0);}});
  }

  if(idx<0||idx>=wfEditorSteps.length){
    panel.innerHTML='<h4>节点属性</h4><p style="font-size:12px;color:var(--text2)">点击画布中的节点进行编辑</p>';
    return;
  }
  var s=wfEditorSteps[idx];
  var h='<h4>节点 #'+s.seq+' 属性</h4>';
  h+='<label>序号</label><input type="number" value="'+s.seq+'" onchange="wfSetProp('+idx+',\'seq\',parseInt(this.value))">';
  h+='<label>阶段</label><input value="'+escHtml(s.phase||'')+'" onchange="wfSetProp('+idx+',\'phase\',this.value)" placeholder="如：线索、商机">';
  h+='<label>Key（唯一标识）</label><input value="'+escHtml(s.key||'')+'" onchange="wfSetProp('+idx+',\'key\',this.value)" placeholder="如：gather">';
  h+='<label>名称</label><input value="'+escHtml(s.name||'')+'" onchange="wfSetProp('+idx+',\'name\',this.value)">';
  h+='<label>图标</label><input value="'+escHtml(s.icon||'')+'" onchange="wfSetProp('+idx+',\'icon\',this.value)" placeholder="emoji 如 🔍">';
  h+='<label>面板类型</label><select onchange="wfSetProp('+idx+',\'panel\',this.value)"><option value="">无</option>'+
    ['','competitor','training','communication','bidding','contract','delivery','payment'].map(function(v){
      return '<option value="'+v+'"'+(s.panel===v?' selected':'')+'>'+v+'</option>'
    }).join('')+'</select>';
  if(s.decision){
    h+='<div style="margin-top:8px;padding:8px;background:#fff3e0;border-radius:6px">';
    h+='<label>判断问题</label><input value="'+escHtml(s.decisionAsk||'')+'" onchange="wfSetProp('+idx+',\'decisionAsk\',this.value)">';
    h+='<label>✓ 是 → 跳转到步骤</label><input type="number" value="'+escHtml(s.decisionYes||'')+'" onchange="wfSetProp('+idx+',\'decisionYes\',String(this.value))">';
    h+='<label>✗ 否 → 跳转到步骤</label><input type="number" value="'+escHtml(s.decisionNo||'')+'" onchange="wfSetProp('+idx+',\'decisionNo\',String(this.value))">';
    h+='</div>';
  }
  h+='<div style="margin-top:10px"><label>提示文字</label><input value="'+escHtml(s.tip||'')+'" onchange="wfSetProp('+idx+',\'tip\',this.value)"></div>';
  // Custom params
  var params=s.params||[];
  h+='<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px"><label style="font-weight:600;margin-bottom:6px">⚙️ 自定义参数</label>';
  h+='<div id="wf-params-'+idx+'">';
  for(var pi=0;pi<params.length;pi++){h+=wfBuildParamRow(idx,pi,params[pi]);}
  h+='</div>';
  h+='<button onclick="wfAddParam('+idx+')" style="margin-top:6px;font-size:11px;padding:4px 10px;background:var(--accent);color:#fff;border:none;border-radius:4px;cursor:pointer">+ 添加参数</button></div>';
  // ── 记录当前的展开状态，方便重建后恢复 ──
  var expanded=window.__wfExpanded||{};

  // ── 审批设置 ──
  var appr=s.approval||{enabled:false,approverRole:'',onReject:'stay'};
  if(window.__wfDiag)dbg('[wfShowProps] idx='+idx,'approval=',JSON.stringify(appr),'s.key='+s.key);
  h+='<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:8px">';
  var apprOpen=expanded['appr_'+idx]?'block':'none';
  h+='<div onclick="var n=this.nextElementSibling;var d=n.style.display===\'none\'?\'block\':\'none\';n.style.display=d;window.__wfExpanded=window.__wfExpanded||{};window.__wfExpanded[\'appr_'+idx+'\']=d===\'block\'" style="cursor:pointer;font-weight:600;font-size:12px;padding:4px 0;display:flex;align-items:center;gap:4px">🔒 审批设置 <span style="font-size:10px;color:var(--text3)">'+(appr.enabled?'已启用':'未启用')+'</span></div>';
  h+='<div style="padding:6px 0;display:'+apprOpen+'">';
  h+='<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" '+(appr.enabled?'checked':'')+' onchange="wfSetApproval('+idx+',\'enabled\',this.checked)"> 启用审批</label>';
  h+='<label>审批人角色</label><select onchange="wfSetApproval('+idx+',\'approverRole\',this.value)"><option value="">无</option>';
  for(var ri=0;ri<(allRoles||[]).length;ri++){h+='<option value="'+escHtml(allRoles[ri].name)+'"'+(appr.approverRole===allRoles[ri].name?' selected':'')+'>'+escHtml(allRoles[ri].name)+'</option>';}
  h+='</select>';
  h+='<label>驳回行为</label><select onchange="wfSetApproval('+idx+',\'onReject\',this.value)"><option value="stay"'+(appr.onReject==='stay'?' selected':'')+'>停留在当前步骤</option></select>';
  h+='</div></div>';
  // ── 负责人设置 ──
  var asg=s.assignee||{enabled:false,type:'dept',value:''};
  h+='<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">';
  var asgOpen=expanded['asg_'+idx]?'block':'none';
  h+='<div onclick="var n=this.nextElementSibling;var d=n.style.display===\'none\'?\'block\':\'none\';n.style.display=d;window.__wfExpanded=window.__wfExpanded||{};window.__wfExpanded[\'asg_'+idx+'\']=d===\'block\'" style="cursor:pointer;font-weight:600;font-size:12px;padding:4px 0;display:flex;align-items:center;gap:4px">👤 负责人设置 <span style="font-size:10px;color:var(--text3)">'+(asg.enabled?'已启用':'未启用')+'</span></div>';
  h+='<div style="padding:6px 0;display:'+asgOpen+'">';
  h+='<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" '+(asg.enabled?'checked':'')+' onchange="wfSetAssignee('+idx+',\'enabled\',this.checked)"> 指定负责人</label>';
  h+='<label>授权部门</label><select onchange="wfSetAssignee('+idx+',\'value\',this.value)"><option value="">无</option>';
  for(var di=0;di<(allDepartments||[]).length;di++){h+='<option value="'+escHtml(allDepartments[di].id)+'"'+(String(asg.value||'')===String(allDepartments[di].id||'')?' selected':'')+'>'+escHtml(allDepartments[di].name)+'</option>';}
  h+='</select>';
  h+='<label>鎸囧畾鍛樺伐</label><select id="wf-staff-dd-'+idx+'" onchange="wfSetAssignee('+idx+',\'staffId\',this.value)"><option value="">--</option>';
  var selDept=asg.value||'';var selStaff=asg.staffId||'';
  if(selDept&&allUsers){for(var ui=0;ui<allUsers.length;ui++){if(String(allUsers[ui].department_id)===String(selDept)){h+='<option value="'+escHtml(allUsers[ui].user_id)+''+(selStaff===allUsers[ui].user_id?' selected':'')+'>'+escHtml(allUsers[ui].display_name||allUsers[ui].email)+'</option>';}}}
  h+='</select>';
  h+='</div></div>';
  // 编辑权限设置 ──
  var perm=s.permissions||{editFields:[],editableBy:['admin']};
  var permOpen=expanded['perm_'+idx]?'block':'none';
  h+='<div style="margin-top:8px;border-top:1px solid var(--border);padding-top:8px">';
  h+='<div onclick="var n=this.nextElementSibling;var d=n.style.display===\'none\'?\'block\':\'none\';n.style.display=d;window.__wfExpanded=window.__wfExpanded||{};window.__wfExpanded[\'perm_'+idx+'\']=d===\'block\'" style="cursor:pointer;font-weight:600;font-size:12px;padding:4px 0">✏️ 编辑权限</div>';
  h+='<div style="padding:6px 0;display:'+permOpen+'">';
  h+='<label>可编辑字段（逗号分隔）</label><input value="'+escHtml((perm.editFields||[]).join(','))+'" onchange="wfSetPermField('+idx+',\'editFields\',this.value)" placeholder="空=全部可编辑">';
  var ebRoles=['assignee','approver','admin'];
  h+='<label>谁可编辑</label><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
  for(var ebi=0;ebi<ebRoles.length;ebi++){
    var er=ebRoles[ebi];var checked=(perm.editableBy||[]).indexOf(er)>=0;
    h+='<label style="font-size:11px;display:flex;align-items:center;gap:3px;padding:2px 6px;background:var(--bg);border-radius:4px;cursor:pointer"><input type="checkbox" '+(checked?'checked':'')+' onchange="wfToggleEditableBy('+idx+',\''+er+'\',this.checked)"> '+er+'</label>';
  }
  h+='</div></div></div>';
  panel.innerHTML=h;
}
function wfSetApproval(idx,key,val){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    if(!wfEditorSteps[idx].approval)wfEditorSteps[idx].approval={enabled:false,approverRole:'',onReject:'stay'};
    wfEditorSteps[idx].approval[key]=val;
    setTimeout(function(){wfShowProps(idx)},0);
  }catch(e){console.error('[wfSetApproval]',e)}
}
function wfSetAssignee(idx,key,val){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    if(!wfEditorSteps[idx].assignee)wfEditorSteps[idx].assignee={enabled:false,type:'dept',value:''};
    wfEditorSteps[idx].assignee[key]=val;
    setTimeout(function(){wfShowProps(idx)},0);
  }catch(e){console.error('[wfSetAssignee]',e)}
}
function wfSetPermField(idx,key,val){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!wfEditorSteps[idx].permissions)wfEditorSteps[idx].permissions={editFields:[],editableBy:['admin']};
  wfEditorSteps[idx].permissions.editFields=(val||'').split(',').map(function(x){return x.trim()}).filter(function(x){return x});
  setTimeout(function(){wfShowProps(idx)},0);
}
function wfToggleEditableBy(idx,role,checked){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!wfEditorSteps[idx].permissions)wfEditorSteps[idx].permissions={editFields:[],editableBy:['admin']};
  var arr=wfEditorSteps[idx].permissions.editableBy||[];
  if(checked){if(arr.indexOf(role)<0)arr.push(role)}
  else{var pos=arr.indexOf(role);if(pos>=0)arr.splice(pos,1)}
  wfEditorSteps[idx].permissions.editableBy=arr;
  setTimeout(function(){wfShowProps(idx)},0);
}
function wfSetProp(idx,key,value){
  try{
    if(!wfEditorSteps||idx<0||idx>=wfEditorSteps.length)return;
    wfEditorSteps[idx][key]=value;
    wfRenderAll();
    setTimeout(function(){wfShowProps(idx)},0);
  }catch(e){console.error('[wfSetProp]',e)}
}
async function wfDeleteStep(idx){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!await uiConfirm('删除步骤 #'+wfEditorSteps[idx].seq+' '+wfEditorSteps[idx].name+'？'))return;
  wfEditorSteps.splice(idx,1);
  wfSelectedIdx=-1;
  wfRenderAll();
  wfShowProps(-1);
}
function wfCanvasClick(e){
  if(e.target.id==='wf-canvas'||e.target.id==='wf-canvas-wrap'){
    wfSelectedIdx=-1;
    wfRenderAll();
    wfShowProps(-1);
  }
}

// Custom params for workflow node
function wfBuildParamRow(nodeIdx,paramIdx,p){
  var k=escHtml(p.key||''),v=escHtml(p.value||'');
  return '<div style="display:flex;gap:4px;align-items:center;margin-top:4px">'+
    '<input value="'+k+'" placeholder="参数名" onchange="wfSetParam('+nodeIdx+','+paramIdx+',\'key\',this.value)" style="flex:1;padding:4px 6px;font-size:11px">'+
    '<input value="'+v+'" placeholder="参数值" onchange="wfSetParam('+nodeIdx+','+paramIdx+',\'value\',this.value)" style="flex:2;padding:4px 6px;font-size:11px">'+
    '<button onclick="wfRemoveParam('+nodeIdx+','+paramIdx+')" style="background:none;border:none;color:#f44336;font-size:14px;cursor:pointer;padding:0 4px">&times;</button>'+
    '</div>';
}
function wfAddParam(nodeIdx){
  if(!wfEditorSteps[nodeIdx].params)wfEditorSteps[nodeIdx].params=[];
  wfEditorSteps[nodeIdx].params.push({key:'',value:''});
  wfShowProps(nodeIdx);
}
function wfSetParam(nodeIdx,paramIdx,field,value){
  if(!wfEditorSteps[nodeIdx].params)return;
  wfEditorSteps[nodeIdx].params[paramIdx][field]=value;
}
function wfRemoveParam(nodeIdx,paramIdx){
  wfEditorSteps[nodeIdx].params.splice(paramIdx,1);
  wfShowProps(nodeIdx);
}

// Drag nodes on canvas
var wfDragNode=null,wfDragOffX=0,wfDragOffY=0;
function wfNodeDragStart(e,idx){
  e.stopPropagation();
  wfDragNode=idx;
  var node=document.getElementById('wf-node-'+idx);
  if(!node)return;
  var rect=node.getBoundingClientRect();
  wfDragOffX=e.clientX-rect.left;
  wfDragOffY=e.clientY-rect.top;
  document.addEventListener('mousemove',wfNodeDragMove);
  document.addEventListener('mouseup',wfNodeDragEnd);
}
function wfNodeDragMove(e){
  if(wfDragNode===null)return;
  var wrap=document.getElementById('wf-canvas-wrap');
  var rect=wrap.getBoundingClientRect();
  var x=e.clientX-rect.left+wrap.scrollLeft-wfDragOffX;
  var y=e.clientY-rect.top+wrap.scrollTop-wfDragOffY;
  wfEditorSteps[wfDragNode]._x=Math.max(0,x);
  wfEditorSteps[wfDragNode]._y=Math.max(0,y);
  var node=document.getElementById('wf-node-'+wfDragNode);
  if(node){node.style.left=x+'px';node.style.top=y+'px'}
  wfRenderConnections();
}
function wfNodeDragEnd(){
  wfDragNode=null;
  document.removeEventListener('mousemove',wfNodeDragMove);
  document.removeEventListener('mouseup',wfNodeDragEnd);
}
function wfAutoLayout(){
  var cols=5;
  var spacingX=220,spacingY=100;
  for(var i=0;i<wfEditorSteps.length;i++){
    wfEditorSteps[i]._x=40+(i%cols)*spacingX;
    wfEditorSteps[i]._y=20+Math.floor(i/cols)*spacingY;
  }
  wfRenderAll();
}



async function saveWtVisual(){
  var name=document.getElementById('wt-name').value.trim();
  var desc=document.getElementById('wt-desc').value.trim();
  if(!name){showToast('请输入模板名称','warning');return}
  // Clean up internal _x _y fields before saving
  var steps=[];
  for(var i=0;i<wfEditorSteps.length;i++){
    var s=Object.assign({},wfEditorSteps[i]);
    delete s._x;delete s._y;
    steps.push(s);
  }
  var btn=document.getElementById('wt-save-btn');
  btn.disabled=true;btn.textContent='保存中...';
  try{
    var body={name:name,description:desc,steps:steps,updated_at:new Date().toISOString()};
    if(!wtEditId){
      body.created_at=new Date().toISOString();
      body.company_id=null;
    }
    var url=SUPABASE_URL+'/rest/v1/workflow_templates'+(wtEditId?'?id=eq.'+wtEditId:'');
    var method=wtEditId?'PATCH':'POST';
    if(wtEditId){var r=await callAdmin('update','workflow_templates',{payload:body,filters:[{col:'id',op:'eq',val:wtEditId}],query:'*'});}else{var r=await callAdmin('insert','workflow_templates',{payload:body});};
    if(r&&r.error){var t=await r.text();showToast('保存失败: '+t,'error');btn.disabled=false;btn.textContent='保存';return}
    document.getElementById('wt-modal-overlay').remove();
    await renderWorkflowTemplates();
    showToast(wtEditId?'模板已更新':'模板已创建');
  }catch(e){showToast('保存异常: '+e.message,'error');btn.disabled=false;btn.textContent='保存'}
}


async function deleteWt(id){
  var t=allTemplates.find(function(x){return x.id===id});
  if(!t)return;
  if(!await uiConfirm('确定删除模板 "'+t.name+'"？'))return;
  try{
    var url=SUPABASE_URL+'/rest/v1/workflow_templates?id=eq.'+id;
    var r=await callAdmin('delete','workflow_templates',{filters:[{col:'id',op:'eq',val:id}]});
    if(r&&r.error){var e=await r.text();showToast('删除失败: '+e,'error');return}
    await renderWorkflowTemplates();
    showToast('模板已删除');
  }catch(e){showToast('删除异常: '+e.message,'error')}
}

/* ===== EXTEND PERMISSION MATRIX ===== */
/* ADD data scope / func perms / field perms to renderAdminPerms */
/* Override: extend renderAdminPerms to include advanced permissions */
var _origRenderAdminPerms=null;

// Stub for defunct freeze buttons (always hidden, prevent ReferenceError)
function toggleLeadFrozen(){showToast('冻结功能暂未开放')}
function editForm(id){showToast('表单编辑功能暂未开放')}


