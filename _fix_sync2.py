import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Extract the actual text around the prodObj line by position
idx = c.find("var prodObj={company_id")
if idx < 0:
    print("NOT FOUND")
    sys.exit(1)

# Find the full block: from "var prodExists" to "}else{showToast"
start = c.find("  var prodExists=null;", idx - 100)
end = c.find("\n  }else{showToast('\u2705 \u4ea7\u54c1\u5df2\u5b58\u5728", start + 20)
if end < 0:
    end = c.find("\n  }else{showToast(", start + 20)

print(f"start={start} end={end}")
old_block = c[start:end]
print("OLD BLOCK:")
print(repr(old_block[:300]))
print("---")

# Build new block
new_block = """  var prodExists=null;
  for(var j=0;j<allProducts.length;j++){if((allProducts[j].name||'').trim().toLowerCase()===s.product_name.trim().toLowerCase()){prodExists=allProducts[j];break;}}
  if(!prodExists){
    var catId=null;if(s.product_category){for(var ci=0;ci<allCategories.length;ci++){if(allCategories[ci].name===s.product_category){catId=allCategories[ci].id;break;}}}
    var specs={};if(s.product_params)try{specs=typeof s.product_params==='string'?JSON.parse(s.product_params):(s.product_params||{})}catch(e){specs={};var pp=s.product_params||'';var pl=pp.split('\\n');for(var pi=0;pi<pl.length;pi++){var pc=pl[pi].split(':');if(pc.length>=2){specs[pc[0].trim()]=pc.slice(1).join(':').trim()}}}
    if(s.moq!=null){specs['MOQ']=s.moq}
    if(s.has_sample!=null){specs['有无样品']=s.has_sample?'有':'无'}
    if(s.compliance_requirements){specs['合规要求']=s.compliance_requirements}
    if(s.product_category){specs['产品分类']=s.product_category}
    var desc='';if(s.supplier_name)desc+='供应商:'+s.supplier_name+' | ';if(s.moq!=null)desc+='MOQ:'+s.moq+' | ';if(s.channel)desc+='渠道:'+s.channel;if(s.notes){if(desc)desc+=' | ';desc+='备注:'+s.notes}
    var prodObj={company_id:currentCompanyId,name:s.product_name||'',code:null,category_id:catId,cost_price:parseFloat(s.purchase_price)||0,selling_price:parseFloat(s.selling_price)||0,description:desc,specs:JSON.stringify(specs),images:'[]',commission_rate:parseFloat(s.influencer_commission)||0,updated_at:new Date().toISOString()};
    var pr=await sb.from('products').insert([prodObj]);
    if(pr.error){showToast('添加产品失败:'+pr.error.message);hasError=true;}else{showToast('✅ 产品已入库: '+s.product_name);}
  }else{showToast('✅ 产品已存在: '+s.product_name);}"""

if old_block in c:
    c = c.replace(old_block, new_block)
    print("OK: replaced")
else:
    print("FAIL: old block not matched")
    # Check if it's unicode encoding issue
    # Compare first 100 chars
    print("\nOld first 100:", repr(old_block[:100]))
    print("New first 100:", repr(new_block[:100]))

# Also need to remove `unit:'\u4e2a'` from saved product. Let me check if unit is in the old block
# The old block includes unit in prodObj. The new block doesn't have unit. Let me add it.
if "unit" not in new_block:
    print("WARNING: unit field missing in new block!")
    # Actually the old block had unit:'\u4e2a' - let me verify the full old prodObj
    full_old = c[start:end]
    if "unit" in full_old:
        print("  Old block has unit, need to add it to new block")

out = c.replace("\n", "\r\n")
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(out)
