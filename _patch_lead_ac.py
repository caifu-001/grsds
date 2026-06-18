fpath = r'D:\1kaifa\grsds\index.html'
with open(fpath, 'r', encoding='utf-8') as f:
    html = f.read()

# The actual marker is just the function declaration
marker = '\n\nfunction openLeadForm(id){'

autocomplete_js = '''
// === Lead Company Name Autocomplete ===
var leadCompSuggIdx=-1,leadCompSuggList=[];
function onLeadCompanyInput(){
  var inp=document.getElementById('lf-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-name-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  var matches=[],seen={};
  for(var i=0;i<allCompanies.length;i++){
    var c=allCompanies[i];var cn=(c.name||'').toLowerCase();
    if(cn&&cn.indexOf(val)>=0&&!seen[cn]){seen[cn]=1;matches.push(c)}
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadCompSuggList=[];leadCompSuggIdx=-1;return}
  leadCompSuggList=matches;leadCompSuggIdx=-1;
  dd.innerHTML=matches.map(function(c,i){return '<div class="name-suggestion'+(i===leadCompSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadCompany('+i+')"><div class="ns-name">'+escHtml(c.name)+'</div><div class="ns-detail">'+escHtml(c.base||c.legal_person||'')+'</div></div>'}).join('');
  dd.classList.remove('hidden');
}
function onLeadCompanyKey(e){
  var dd=document.getElementById('lead-name-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadCompSuggIdx=Math.min(leadCompSuggIdx+1,leadCompSuggList.length-1);updateLeadCompActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadCompSuggIdx=Math.max(leadCompSuggIdx-1,0);updateLeadCompActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadCompSuggIdx>=0)selectLeadCompany(leadCompSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadCompSuggIdx=-1}
}
function updateLeadCompActive(){
  var items=document.querySelectorAll('#lead-name-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadCompSuggIdx);
  if(leadCompSuggIdx>=0&&items[leadCompSuggIdx])items[leadCompSuggIdx].scrollIntoView({block:'nearest'});
}
function selectLeadCompany(idx){
  var c=leadCompSuggList[idx];if(!c)return;
  document.getElementById('lf-name').value=c.name;
  document.getElementById('lead-name-suggestions').classList.add('hidden');
  leadCompSuggList=[];leadCompSuggIdx=-1;
  if(c.industry)document.getElementById('lf-industry').value=c.industry;
  if(c.scale)document.getElementById('lf-scale').value=c.scale;
}

// === Lead Contact Autocomplete (from existing clients) ===
var leadContactSuggIdx=-1,leadContactSuggList=[];
function onLeadContactInput(){
  var inp=document.getElementById('lf-contact-name');
  var val=(inp.value||'').trim().toLowerCase();
  var dd=document.getElementById('lead-contact-suggestions');
  if(!val||val.length<1){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  var matches=[],seen={};
  for(var i=0;i<allContacts.length;i++){
    var co=allContacts[i];var cn=(co.name||'').toLowerCase();
    var key=cn+'|'+co.client_id;
    if(cn&&cn.indexOf(val)>=0&&!seen[key]){
      seen[key]=1;
      var cl=allClients.find(function(x){return x.id===co.client_id});
      var phones='';
      try{var ph=JSON.parse(co.phone||'[]');if(ph.length)phones=ph[0]}catch(e){phones=co.phone||''}
      var emails='';
      try{var em=JSON.parse(co.email||'[]');if(em.length)emails=em[0]}catch(e){emails=co.email||''}
      matches.push({name:co.name,phone:phones,email:emails,clientName:cl?cl.name:'',dept:co.dept||'',position:co.position||''});
    }
  }
  matches.sort(function(a,b){return (a.name||'').length-(b.name||'').length});
  matches=matches.slice(0,12);
  if(!matches.length){dd.classList.add('hidden');leadContactSuggList=[];leadContactSuggIdx=-1;return}
  leadContactSuggList=matches;leadContactSuggIdx=-1;
  dd.innerHTML=matches.map(function(m,i){return '<div class="name-suggestion'+(i===leadContactSuggIdx?' active':'')+'" data-idx="'+i+'" onmousedown="selectLeadContact('+i+')"><div><div class="ns-name">'+escHtml(m.name)+'</div><div class="ns-detail">'+escHtml(m.clientName)+(m.position?' · '+escHtml(m.position):'')+(m.phone?' · '+escHtml(m.phone):'')+'</div></div></div>'}).join('');
  dd.classList.remove('hidden');
}
function onLeadContactKey(e){
  var dd=document.getElementById('lead-contact-suggestions');
  if(dd.classList.contains('hidden'))return;
  if(e.key==='ArrowDown'){e.preventDefault();leadContactSuggIdx=Math.min(leadContactSuggIdx+1,leadContactSuggList.length-1);updateLeadContactActive()}
  else if(e.key==='ArrowUp'){e.preventDefault();leadContactSuggIdx=Math.max(leadContactSuggIdx-1,0);updateLeadContactActive()}
  else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();if(leadContactSuggIdx>=0)selectLeadContact(leadContactSuggIdx)}
  else if(e.key==='Escape'){dd.classList.add('hidden');leadContactSuggIdx=-1}
}
function updateLeadContactActive(){
  var items=document.querySelectorAll('#lead-contact-suggestions .name-suggestion');
  for(var i=0;i<items.length;i++)items[i].classList.toggle('active',i===leadContactSuggIdx);
  if(leadContactSuggIdx>=0&&items[leadContactSuggIdx])items[leadContactSuggIdx].scrollIntoView({block:'nearest'});
}
function selectLeadContact(idx){
  var m=leadContactSuggList[idx];if(!m)return;
  document.getElementById('lf-contact-name').value=m.name;
  if(m.phone)document.getElementById('lf-contact-phone').value=m.phone;
  if(m.email)document.getElementById('lf-contact-email').value=m.email;
  document.getElementById('lead-contact-suggestions').classList.add('hidden');
  leadContactSuggList=[];leadContactSuggIdx=-1;
}

'''

if marker in html:
    new_html = html.replace(marker, '\n'+autocomplete_js + '\nfunction openLeadForm(id){')
    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(new_html)
    print(f'OK: inserted {len(autocomplete_js)} chars')
else:
    print('MARKER NOT FOUND')
    idx = html.find('function openLeadForm')
    if idx > 0:
        print(repr(html[idx-60:idx+60]))
