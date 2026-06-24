import re, sys
sys.stdout.reconfigure(encoding='utf-8')
path=r"D:\1kaifa\grsds\index.html"
with open(path,'r',encoding='utf-8') as f:
    h=f.read()

changes=0

# 1. Strip conclusion_notes from saveProject payload
old="    conclusion:document.getElementById('pf-conclusion').value,\n    conclusion_notes:document.getElementById('pf-conclusion-notes').value.trim(),"
new="    conclusion:document.getElementById('pf-conclusion').value,"
if old in h:
    h=h.replace(old,new)
    changes+=1
    print("OK 1: removed conclusion_notes from saveProject payload")

# 2. Fix openProjectFormFromLead - auto-fill client details from clientId
# Find the function
idx=h.find("function openProjectFormFromLead(leadId,projectName,companyName,clientId){")
if idx>0:
    # Find where it sets empty values then does lazy client fill
    # The current code sets empty, then has lazy client fill block
    # We need to make the lazy client fill synchronous and more complete
    
    # Find the block that sets empty values
    set_empty_start = h.find("document.getElementById('pf-company-name').value=companyName||'';", idx)
    
    # Find the "// If clientId provided" comment block
    comment_start = h.find("// If clientId provided and allClients loaded, auto-fill", idx)
    
    if comment_start > 0 and set_empty_start > 0:
        # Find the end of the auto-fill block (ends before "// Lazy load allClients" or the overlay show)
        lazy_start = h.find("// Lazy load allClients if needed", idx)
        overlay_show = h.find("document.getElementById('opp-form-modal').classList.remove('hidden');", idx)
        block_end = min(lazy_start, overlay_show) if lazy_start>0 else overlay_show
        
        # Find the full auto-fill block
        auto_fill_block = h[comment_start:block_end]
        
        # New auto-fill block: synchronous, complete, includes credit_code + contacts
        new_auto_fill = """// If clientId provided, load all clients and auto-fill
  (async function(){
    var client=null;
    // Try local cache first
    if(clientId&&allClients&&allClients.length){
      client=allClients.find(function(c){return c.id===clientId});
    }
    // Fallback: fetch from Supabase
    if(!client&&clientId){
      try{var {data}=await sb.from('clients').select('id,name,industry,address,type,credit_code').eq('id',clientId).maybeSingle();if(data)client=data}catch(e){}
    }
    if(client){
      document.getElementById('pf-company-name').value=client.name||companyName||'';
      if(client.industry)document.getElementById('pf-industry').value=client.industry;
      if(client.address)document.getElementById('pf-address').value=client.address;
      if(client.credit_code)document.getElementById('pf-credit-code').value=client.credit_code;
      if(client.type){try{var types=JSON.parse(client.type);if(Array.isArray(types)&&types.length)document.getElementById('pf-customer-type').value=types[0];}catch(e){}}
      // Load contacts from contacts table
      try{
        var {data:cts}=await sb.from('contacts').select('name,title,phone,email').eq('client_id',clientId);
        if(cts&&cts.length){
          var ct=cts[0];
          document.getElementById('pf-contact-name').value=ct.name||'';
          document.getElementById('pf-contact-title').value=ct.title||'';
          document.getElementById('pf-contact-phone').value=(function(v){if(!v)return'';if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return v}}if(Array.isArray(v))return v.filter(function(x){return x}).join('\\n');return String(v)})(ct.phone);
          document.getElementById('pf-contact-email').value=(function(v){if(!v)return'';if(typeof v==='string'){try{v=JSON.parse(v)}catch(e){return v}}if(Array.isArray(v))return v.filter(function(x){return x}).join('\\n');return String(v)})(ct.email);
        }
      }catch(e){}
    }
    // Populate template dropdown
    var templateSel=document.getElementById('pf-template-id');
    if(templateSel){
      templateSel.innerHTML='<option value=\"\">默认（46步标准流程）</option>';
      for(var i=0;i<allTemplates.length;i++){
        var t=allTemplates[i];
        templateSel.innerHTML+='<option value=\"'+t.id+'\">'+escHtml(t.name)+'</option>';
      }
    }
  })();
  """
        
        h = h[:comment_start] + new_auto_fill + h[block_end:]
        changes+=1
        print("OK 2: openProjectFormFromLead auto-fills client details completely")
    else:
        print("ERR 2: auto-fill block not found")
else:
    print("ERR 2: openProjectFormFromLead not found")

with open(path,'w',encoding='utf-8') as f:
    f.write(h)
print(f"\nChanges: {changes}, Size: {len(h)} bytes")
