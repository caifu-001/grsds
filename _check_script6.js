
// === Client Name Autocomplete ===
var nameSuggIdx=-1,nameSuggList=[];

function onClientNameInput(){
  var inp=document.getElementById('f-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');nameSuggList=[];nameSuggIdx=-1;return}
  // Search allCompanies table (company directory)
  var matches=[];
  var seen={};
  var exactMatch=null;
  // Check existing clients
  for(var i=0;i<allClients.length;i++){
    var c=allClients[i];
    var cn=(c.name||'').toLowerCase();
    if(!cn||cn===val)exactMatch=c;
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){
      seen[cn]=1;
      matches.push({name:c.name,source:'已存客户',exists:true,id:c.id});
    }
  }
  // Check company directory
  for(var j=0;j<allCompanies.length;j++){
    var co=allCompanies[j];
    var con=(co.name||'').toLowerCase();
    if(con===val)exactMatch=exactMatch||co;
    if(con&&con.indexOf(val)>=0&&!seen[con]){
      seen[con]=1;
      var detail=(co.legal_person||'')+(co.reg_capital?' · 注册资本'+co.reg_capital:'');
      matches.push({name:co.name,source:'企业名录',exists:false,detail:detail,comp:co});
    }
  }
  // Sort: exact match first, then shortest name first
  matches.sort(function(a,b){
    if(a.exists&&!b.exists)return -1;
    if(!a.exists&&b.exists)return 1;
    return (a.name||'').length-(b.name||'').length;
  });
  // Limit to 20
  matches=matches.slice(0,20);
  if(!matches.length){dd.classList.add('hidden');nameSuggList=[];nameSuggIdx=-1;return}
  nameSuggList=matches;
  nameSuggIdx=-1;
  var h='';
  var lastSource='';
  for(var k=0;k<matches.length;k++){
    var m=matches[k];
    if(m.source!==lastSource){
      h+='<div class="ns-group-label">'+(m.source==='已存客户'?'📋 '+m.source:'📂 '+m.source)+'</div>';
      lastSource=m.source;
    }
    h+='<div class="name-suggestion" data-idx="'+k+'" onmousedown="selectNameSuggestion('+k+')"><div><div class="ns-name">'+escHtml(m.name)+'</div>'+(m.detail?'<div class="ns-detail">'+escHtml(m.detail)+'</div>':'')+'</div>'+(m.exists?'<span class="ns-exists">⚠ 已存在</span>':'<span class="ns-source">点击填充</span>')+'</div>';
  }
  dd.innerHTML=h;
  dd.classList.remove('hidden');
}

function onNameKeydown(e){
  var dd=document.getElementById('name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();nameSuggIdx=Math.min(nameSuggIdx+1,nameSuggList.length-1);updateNameActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();nameSuggIdx=Math.max(nameSuggIdx-1,0);updateNameActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(nameSuggIdx>=0&&nameSuggIdx<nameSuggList.length)selectNameSuggestion(nameSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');nameSuggIdx=-1}
}

function updateNameActive(){
  var items=document.querySelectorAll('#name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++){items[i].classList.toggle('active',i===nameSuggIdx)}
  if(nameSuggIdx>=0){items[nameSuggIdx].scrollIntoView({block:'nearest'})}
}

function selectNameSuggestion(idx){
  var m=nameSuggList[idx];
  if(!m)return;
  document.getElementById('f-name').value=m.name;
  document.getElementById('name-suggestions').classList.add('hidden');
  nameSuggList=[];nameSuggIdx=-1;
  // If selected from directory, auto-fill company info
  if(m.comp){
    var inp=document.getElementById('f-name');
    var key=m.name.toLowerCase();
    if(allCompaniesMap[key])fillCompanyInfo(allCompaniesMap[key]);
    else fillCompanyInfo(m.comp);
  }
  // If it's an existing client, show warning
  if(m.exists){
    showToast('客户 "'+m.name+'" 已存在');
  }
}
