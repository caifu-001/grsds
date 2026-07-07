import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# ============================================================
# approveScouting 入库逻辑：补齐缺失字段
# ============================================================

old = """  var prodExists=null;
  for(var j=0;j<allProducts.length;j++){if((allProducts[j].name||'').trim().toLowerCase()===s.product_name.trim().toLowerCase()){prodExists=allProducts[j];break;}}
  if(!prodExists){
    var prodObj={company_id:currentCompanyId,name:s.product_name||'',code:null,category_id:null,unit:'\u4e2a',cost_price:parseFloat(s.purchase_price)||0,selling_price:parseFloat(s.selling_price)||0,description:'\u4f9b\u5e94\u5546:'+(s.supplier_name||'')+' | MOQ:'+(s.moq||'-')+' | \u6e20\u9053:'+(s.channel||''),specs:s.product_params||'{}',images:'[]',commission_rate:parseFloat(s.influencer_commission)||0,updated_at:new Date().toISOString()};
    var pr=await sb.from('products').insert([prodObj]);
    if(pr.error){showToast('\u6dfb\u52a0\u4ea7\u54c1\u5931\u8d25:'+pr.error.message);hasError=true;}else{showToast('\u2705 \u4ea7\u54c1\u5df2\u5165\u5e93: '+s.product_name);}
  }else{showToast('\u2705 \u4ea7\u54c1\u5df2\u5b58\u5728: '+s.product_name);}"""

new = """  var prodExists=null;
  for(var j=0;j<allProducts.length;j++){if((allProducts[j].name||'').trim().toLowerCase()===s.product_name.trim().toLowerCase()){prodExists=allProducts[j];break;}}
  if(!prodExists){
    var catId=null;if(s.product_category){for(var ci=0;ci<allCategories.length;ci++){if(allCategories[ci].name===s.product_category){catId=allCategories[ci].id;break;}}}
    var specs={};if(s.product_params)try{specs=typeof s.product_params==='string'?JSON.parse(s.product_params):(s.product_params||{})}catch(e){specs={};var pp=s.product_params||'';var pl=pp.split('\\n');for(var pi=0;pi<pl.length;pi++){var pc=pl[pi].split(':');if(pc.length>=2){specs[pc[0].trim()]=pc.slice(1).join(':').trim()}}}
    if(s.moq!=null){specs['MOQ']=s.moq}
    if(s.has_sample!=null){specs['\u6709\u65e0\u6837\u54c1']=s.has_sample?'\u6709':'\u65e0'}
    if(s.compliance_requirements){specs['\u5408\u89c4\u8981\u6c42']=s.compliance_requirements}
    if(s.product_category){specs['\u4ea7\u54c1\u5206\u7c7b']=s.product_category}
    var desc='';if(s.supplier_name)desc+='\u4f9b\u5e94\u5546:'+s.supplier_name+' | ';if(s.moq!=null)desc+='MOQ:'+s.moq+' | ';if(s.channel)desc+='\u6e20\u9053:'+s.channel;if(s.notes){if(desc)desc+=' | ';desc+='\u5907\u6ce8:'+s.notes}
    var prodObj={company_id:currentCompanyId,name:s.product_name||'',code:null,category_id:catId,unit:'\u4e2a',cost_price:parseFloat(s.purchase_price)||0,selling_price:parseFloat(s.selling_price)||0,description:desc,specs:JSON.stringify(specs),images:'[]',commission_rate:parseFloat(s.influencer_commission)||0,updated_at:new Date().toISOString()};
    var pr=await sb.from('products').insert([prodObj]);
    if(pr.error){showToast('\u6dfb\u52a0\u4ea7\u54c1\u5931\u8d25:'+pr.error.message);hasError=true;}else{showToast('\u2705 \u4ea7\u54c1\u5df2\u5165\u5e93: '+s.product_name);}
  }else{showToast('\u2705 \u4ea7\u54c1\u5df2\u5b58\u5728: '+s.product_name);}"""

if old in c:
    c = c.replace(old, new)
    print("OK: approveScouting product insert enhanced")
else:
    print("FAIL: old pattern not found")
    # Try to locate
    idx = c.find("var prodObj={company_id")
    if idx > 0:
        print("Found prodObj at", idx)
        print(repr(c[idx:idx+300]))
    else:
        print("prodObj not found at all")

# ============================================================
# Also fix the \u0027 in HTML (2nd occurrence at line 7866)
# ============================================================
# That's in the scouting modal, also has \u0027Enter\u0027
c = c.replace("\\u0027Enter\\u0027", "&#39;Enter&#39;")
remaining = c.count("\\u0027")
print(f"\\u0027 remaining: {remaining}")

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
print("Done")
