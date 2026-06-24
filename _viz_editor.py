import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# 1. Add CSS styles for the visual editor
# Find a good CSS insertion point
css_insert = h.find('.admin-subtab.active{')
css_block = """
/* Workflow Visual Editor */
.wf-editor{display:flex;height:70vh;gap:0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--card)}
.wf-sidebar{width:180px;background:var(--bg);border-right:1px solid var(--border);padding:12px;overflow-y:auto;flex-shrink:0}
.wf-sidebar h4{font-size:13px;margin:0 0 10px;color:var(--text2)}
.wf-step-tpl{padding:8px 10px;margin-bottom:6px;border-radius:8px;cursor:grab;font-size:12px;font-weight:500;border:1px dashed var(--border);transition:all .15s;user-select:none}
.wf-step-tpl:hover{border-color:var(--primary);background:var(--primary-soft)}
.wf-step-tpl.standard{background:#e3f2fd;color:#1565c0}
.wf-step-tpl.decision{background:#fff3e0;color:#e65100}
.wf-step-tpl.endnode{background:#fce4ec;color:#c62828}
.wf-canvas-wrap{flex:1;overflow:auto;position:relative;background:repeating-linear-gradient(0deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,var(--border) 39px,var(--border) 40px)}
.wf-canvas{position:relative;min-height:2000px;min-width:800px;padding:40px}
.wf-node{position:absolute;width:180px;border-radius:10px;padding:10px 12px;cursor:pointer;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.12);transition:box-shadow .15s;z-index:10;user-select:none}
.wf-node:hover{box-shadow:0 4px 16px rgba(0,0,0,.2)}
.wf-node.selected{box-shadow:0 0 0 3px var(--primary);z-index:20}
.wf-node.standard{background:#e3f2fd;border:1px solid #90caf9}
.wf-node.decision{background:#fff3e0;border:1px solid #ffcc80}
.wf-node.endnode{background:#fce4ec;border:1px solid #f48fb1}
.wf-node .wf-node-seq{position:absolute;top:-10px;left:-10px;width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center}
.wf-node .wf-node-phase{font-size:10px;color:var(--text2);margin-bottom:2px}
.wf-node .wf-node-name{font-weight:600;margin-bottom:2px}
.wf-node .wf-node-icon{font-size:16px}
.wf-node .wf-node-key{font-size:10px;color:var(--text2);margin-top:2px}
.wf-node .wf-node-delete{position:absolute;top:4px;right:6px;width:18px;height:18px;border-radius:50%;background:#f44336;color:#fff;border:none;font-size:10px;cursor:pointer;display:none;line-height:1;padding:0}
.wf-node:hover .wf-node-delete{display:flex;align-items:center;justify-content:center}
.wf-props-panel{width:260px;background:var(--bg);border-left:1px solid var(--border);padding:14px;overflow-y:auto;flex-shrink:0;font-size:13px}
.wf-props-panel h4{font-size:14px;margin:0 0 12px}
.wf-props-panel label{display:block;font-size:12px;color:var(--text2);margin-bottom:4px;margin-top:10px}
.wf-props-panel input,.wf-props-panel select,.wf-props-panel textarea{width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--card);color:var(--text)}
.wf-editor-svg{position:absolute;top:0;left:0;pointer-events:none;z-index:1}
.wf-editor-svg line{stroke:#90caf9;stroke-width:2;marker-end:url(#arrowhead)}
.wf-editor-svg line.decision-line{stroke:#ff9800;stroke-dasharray:5,3}
.wf-toolbar{display:flex;gap:8px;align-items:center;padding:8px 0}
.wf-toolbar button{padding:6px 14px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--border);background:var(--card);color:var(--text)}
.wf-toolbar button.primary{background:var(--primary);color:#fff;border-color:var(--primary)}
"""
h = h[:css_insert] + css_block + h[css_insert:]

# 2. Replace showWtModal - completely new visual editor
old_showWt = h[h.find('function showWtModal'):h.find('function showWtModal')+2000]
# Find exact end
i = h.find('function showWtModal')
j = i
d = 0
s = False
while j < len(h):
    if h[j] == '{': d += 1; s = True
    elif h[j] == '}': d -= 1
    if s and d == 0: break
    j += 1
old_showWt_body = h[i:j+1]

new_showWt = """function showWtModal(title,stepsJson){
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
    '<button onclick="document.getElementById(\\'wt-modal-overlay\\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer">&times;</button>'+
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
    '<div class="wf-step-tpl standard" draggable="true" ondragstart="wfDragStart(event,\\'standard\\')">📌 标准步骤</div>'+
    '<div class="wf-step-tpl decision" draggable="true" ondragstart="wfDragStart(event,\\'decision\\')">🚦 判断节点</div>'+
    '<div class="wf-step-tpl endnode" draggable="true" ondragstart="wfDragStart(event,\\'endnode\\')">⏹️ 结束节点</div>'+
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
    '<button onclick="document.getElementById(\\'wt-modal-overlay\\').remove()">取消</button>'+
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
  if(idx<0||idx>=wfEditorSteps.length){
    panel.innerHTML='<h4>节点属性</h4><p style="font-size:12px;color:var(--text2)">点击画布中的节点进行编辑</p>';
    return;
  }
  var s=wfEditorSteps[idx];
  var h='<h4>节点 #'+s.seq+' 属性</h4>';
  h+='<label>序号</label><input type="number" value="'+s.seq+'" onchange="wfSetProp('+idx+',\\'seq\\',parseInt(this.value))">';
  h+='<label>阶段</label><input value="'+escHtml(s.phase||'')+'" onchange="wfSetProp('+idx+',\\'phase\\',this.value)" placeholder="如：线索、商机">';
  h+='<label>Key（唯一标识）</label><input value="'+escHtml(s.key||'')+'" onchange="wfSetProp('+idx+',\\'key\\',this.value)" placeholder="如：gather">';
  h+='<label>名称</label><input value="'+escHtml(s.name||'')+'" onchange="wfSetProp('+idx+',\\'name\\',this.value)">';
  h+='<label>图标</label><input value="'+escHtml(s.icon||'')+'" onchange="wfSetProp('+idx+',\\'icon\\',this.value)" placeholder="emoji 如 🔍">';
  h+='<label>面板类型</label><select onchange="wfSetProp('+idx+',\\'panel\\',this.value)"><option value="">无</option>'+
    ['','competitor','training','communication','bidding','contract','delivery','payment'].map(function(v){
      return '<option value="'+v+'"'+(s.panel===v?' selected':'')+'>'+v+'</option>'
    }).join('')+'</select>';
  if(s.decision){
    h+='<div style="margin-top:8px;padding:8px;background:#fff3e0;border-radius:6px">';
    h+='<label>判断问题</label><input value="'+escHtml(s.decisionAsk||'')+'" onchange="wfSetProp('+idx+',\\'decisionAsk\\',this.value)">';
    h+='<label>✓ 是 → 跳转到步骤</label><input type="number" value="'+escHtml(s.decisionYes||'')+'" onchange="wfSetProp('+idx+',\\'decisionYes\\',String(this.value))">';
    h+='<label>✗ 否 → 跳转到步骤</label><input type="number" value="'+escHtml(s.decisionNo||'')+'" onchange="wfSetProp('+idx+',\\'decisionNo\\',String(this.value))">';
    h+='</div>';
  }
  h+='<div style="margin-top:10px"><label>提示文字</label><input value="'+escHtml(s.tip||'')+'" onchange="wfSetProp('+idx+',\\'tip\\',this.value)"></div>';
  panel.innerHTML=h;
}
function wfSetProp(idx,key,value){
  if(idx<0||idx>=wfEditorSteps.length)return;
  wfEditorSteps[idx][key]=value;
  wfRenderAll();
}
function wfDeleteStep(idx){
  if(idx<0||idx>=wfEditorSteps.length)return;
  if(!confirm('删除步骤 #'+wfEditorSteps[idx].seq+' '+wfEditorSteps[idx].name+'？'))return;
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
"""

h = h[:i] + new_showWt + '\n' + h[j+1:]

# 3. Replace saveWt - calls new function
i2 = h.find('function saveWt(')
j2 = i2
d = 0; s = False
while j2 < len(h):
    if h[j2] == '{': d += 1; s = True
    elif h[j2] == '}': d -= 1
    if s and d == 0: break
    j2 += 1

new_saveWt = """function saveWtVisual(){
  var name=document.getElementById('wt-name').value.trim();
  var desc=document.getElementById('wt-desc').value.trim();
  if(!name){alert('请输入模板名称');return}
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
    var r=await fetch(url,{
      method:method,
      headers:{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
      body:JSON.stringify(body)
    });
    if(!r.ok){var t=await r.text();alert('保存失败: '+t);btn.disabled=false;btn.textContent='保存';return}
    document.getElementById('wt-modal-overlay').remove();
    await renderWorkflowTemplates();
    showToast(wtEditId?'模板已更新':'模板已创建');
  }catch(e){alert('保存异常: '+e.message);btn.disabled=false;btn.textContent='保存'}
}
function saveWt(){saveWtVisual()}
"""

h = h[:i2] + new_saveWt + h[j2+1:]

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as f:
    f.write(h)

print("Done - visual editor injected")
print(f"File size: {len(h)} chars")
