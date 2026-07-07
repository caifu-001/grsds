$f = "D:\1kaifa\grsds\index.html"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)

# 1. supplier modal HTML: add compliance textarea after notes
$old1 = "notes</label><input id=`"sup-notes`" placeholder=`"可选`"></div></div><div class=`"modal-actions`">"
$new1 = "notes</label><input id=`"sup-notes`" placeholder=`"可选`"></div><div class=`"form-group`"><label>合规要求</label><textarea id=`"sup-compliance`" rows=`"2`" placeholder=`"资质证书、环保标准、ISO认证等...`"></textarea></div></div><div class=`"modal-actions`">"
$c = $c.Replace($old1, $new1)

# 2. saveSupplier: add compliance_requirements to obj
$old2 = "notes:document.getElementById('sup-notes').value.trim()||null,"
$new2 = "notes:document.getElementById('sup-notes').value.trim()||null,`r`n    compliance_requirements:document.getElementById('sup-compliance').value.trim()||null,"
$c = $c.Replace($old2, $new2)

# 3. openSupplierForm: backfill compliance
$old3 = "document.getElementById('sup-notes').value=sp?(sp.notes||''):'';"
$new3 = "document.getElementById('sup-notes').value=sp?(sp.notes||''):'';`r`n  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';"
$c = $c.Replace($old3, $new3)

# 4. product modal HTML: add commission_rate after selling_price row
$old4 = "<div class=`"form-row`">`r`n   <div class=`"form-group`"><label>成本价(元)</label><input id=`"pfm-cost`" type=`"number`" step=`"0.01`" placeholder=`"0`"></div>`r`n   <div class=`"form-group`"><label>销售价(元)</label><input id=`"pfm-price`" type=`"number`" step=`"0.01`" placeholder=`"0`"></div>`r`n  </div>"
$new4 = "<div class=`"form-row`">`r`n   <div class=`"form-group`"><label>成本价(元)</label><input id=`"pfm-cost`" type=`"number`" step=`"0.01`" placeholder=`"0`"></div>`r`n   <div class=`"form-group`"><label>销售价(元)</label><input id=`"pfm-price`" type=`"number`" step=`"0.01`" placeholder=`"0`"></div>`r`n  </div>`r`n  <div class=`"form-row`">`r`n   <div class=`"form-group`"><label>佣金比例(%)</label><input id=`"pfm-commission-rate`" type=`"number`" step=`"0.01`" min=`"0`" max=`"100`" placeholder=`"0`"></div>`r`n  </div>"
$c = $c.Replace($old4, $new4)

# 5. saveProduct: add commission_rate to data obj
$old5 = "selling_price:parseFloat(document.getElementById('pfm-price').value)||0,"
$new5 = "selling_price:parseFloat(document.getElementById('pfm-price').value)||0,`r`n    commission_rate:parseFloat(document.getElementById('pfm-commission-rate').value)||0,"
$c = $c.Replace($old5, $new5)

# 6. openProductForm / editProduct: backfill commission_rate
$old6 = "document.getElementById('pfm-price').value=p.selling_price||'';"
$new6 = "document.getElementById('pfm-price').value=p.selling_price||'';`r`n  document.getElementById('pfm-commission-rate').value=p.commission_rate||'';"
$c = $c.Replace($old6, $new6)

$old6b = "document.getElementById('pfm-price').value='';"
$new6b = "document.getElementById('pfm-price').value='';`r`n  document.getElementById('pfm-commission-rate').value='';"
$c = $c.Replace($old6b, $new6b)

[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
Write-Host "Patch complete"
