import re, sys

path = r"D:\1kaifa\grsds\index.html"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ── 1. Fix handleAttachFile: replace placeholder with Supabase Storage upload ──
old1 = '''function handleAttachFile(input){
  var files=input.files;
  if(!files||!files.length)return;
  for(var i=0;i<files.length;i++){
    var f=files[i];
    // Placeholder URL - real upload would use supabase storage
    clientAttachments.push({name:f.name,size:f.size,type:f.type,url:'#placeholder-'+Date.now()+'-'+i});
  }
  renderClientAttachments();
  input.value='';
}'''

new1 = '''async function handleAttachFile(input){
  var files=input.files;
  if(!files||!files.length)return;
  var bucket='client-attachments';
  for(var i=0;i<files.length;i++){
    var f=files[i];
    var safeName=f.name.replace(/[^a-zA-Z0-9._\\u4e00-\\u9fff-]/g,'_');
    var filePath=currentCompanyId+'/'+Date.now()+'_'+safeName;
    try{
      var {data,error}=await sb.storage.from(bucket).upload(filePath,f,{cacheControl:'3600',upsert:false});
      if(error){showToast('\\u4e0a\\u4f20\\u5931\\u8d25: '+error.message);continue}
      var {data:urlData}=sb.storage.from(bucket).getPublicUrl(filePath);
      clientAttachments.push({name:f.name,size:f.size,type:f.type,url:urlData.publicUrl,path:filePath});
    }catch(e){showToast('\\u4e0a\\u4f20\\u5f02\\u5e38: '+e.message)}
  }
  renderClientAttachments();
  input.value='';
}'''

if old1 in content:
    content = content.replace(old1, new1)
    changes += 1
    print("OK: handleAttachFile replaced")
else:
    print("MISS: handleAttachFile not found")

# ── 2. Fix removeAttachment: add storage cleanup ──
old2 = '''function removeAttachment(idx){clientAttachments.splice(idx,1);renderClientAttachments()}'''

new2 = '''async function removeAttachment(idx){
  var a=clientAttachments[idx];
  if(a&&a.path){try{await sb.storage.from('client-attachments').remove([a.path])}catch(e){}}
  clientAttachments.splice(idx,1);renderClientAttachments();
}'''

if old2 in content:
    content = content.replace(old2, new2)
    changes += 1
    print("OK: removeAttachment replaced")
else:
    print("MISS: removeAttachment not found")

# ── 3. Remove the hint about creating the bucket ──
old3 = '''    <div style="font-size:10px;color:var(--warning);margin-top:4px">提示：如需完整上传，请先在 Supabase 创建 "client-attachments" Storage bucket</div>
'''
if old3 in content:
    content = content.replace(old3, '')
    changes += 1
    print("OK: bucket hint removed")
else:
    print("MISS: bucket hint not found")

# ── 4. Update the upload label ──
old4 = '''<span style="font-size:11px;color:var(--text3)">选文件即可（占位存储）</span>'''
new4 = '''<span style="font-size:11px;color:var(--text3)">选文件即可上传</span>'''
if old4 in content:
    content = content.replace(old4, new4)
    changes += 1
    print("OK: upload label updated")
else:
    print("MISS: upload label not found")

if changes == 0:
    print("ERROR: No changes applied!")
    sys.exit(1)

with open(path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)

print(f"Total changes: {changes}")
