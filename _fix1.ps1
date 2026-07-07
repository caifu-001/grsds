$c = Get-Content "D:\1kaifa\grsds\index.html" -Raw -Encoding UTF8

# Fix: remove BOM if present
if ($c[0] -eq [char]0xFEFF) { $c = $c.Substring(1) }

$count = 0

# -- 4a. renderScouting: add fct var --
$o4a = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];"
$n4a = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];"
if ($c.Contains($o4a)) { $c = $c.Replace($o4a, $n4a); $count++; "OK: 4a renderScouting fct var" } else { "FAIL: 4a" }

# -- 4b. renderScouting: add fct filter condition --
$o4b = "    if(fst&&s.status!==fst)continue;
    filtered.push(s);"
$n4b = "    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);"
if ($c.Contains($o4b)) { $c = $c.Replace($o4b, $n4b); $count++; "OK: 4b renderScouting fct condition" } else { "FAIL: 4b" }

# -- 4c. renderScouting: build category filter dropdown --
$o4c = "  // Update channel filter dropdown
  var chSel=document.getElementById('sc-filter-channel');"
$n4c = "  // Update category filter dropdown
  var ctSel=document.getElementById('sc-filter-category');
  if(ctSel){
    var cts={},ctprev=ctSel.value;
    for(var cti=0;cti<allScouting.length;cti++){var ct2=allScouting[cti].product_category;if(ct2&&!cts[ct2])cts[ct2]=1;}
    var ctOpt='<option value=\"\">全部分类</option>';
    var ctKeys=Object.keys(cts).sort();
    for(var ctk=0;ctk<ctKeys.length;ctk++)ctOpt+='<option value=\"'+escHtml(ctKeys[ctk])+'\">'+escHtml(ctKeys[ctk])+'</option>';
    ctSel.innerHTML=ctOpt;ctSel.value=ctprev;
  }
  // Update channel filter dropdown
  var chSel=document.getElementById('sc-filter-channel');"
if ($c.Contains($o4c)) { $c = $c.Replace($o4c, $n4c); $count++; "OK: 4c category filter dropdown" } else { "FAIL: 4c" }

# -- 5. refreshScoutingCompare: add fct var + filter --
$o5 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    filtered.push(s);
  }
  // ====== Summary Cards ======"
$n5 = "  var fst=(document.getElementById('sc-filter-status')||{}).value||'';
  var fct=(document.getElementById('sc-filter-category')||{}).value||'';
  fp=fp.trim().toLowerCase();fs=fs.trim().toLowerCase();
  var filtered=[];
  for(var i=0;i<allScouting.length;i++){
    var s=allScouting[i];
    if(fp&&(s.product_name||'').toLowerCase().indexOf(fp)<0)continue;
    if(fs&&(s.supplier_name||'').toLowerCase().indexOf(fs)<0)continue;
    if(fc&&s.channel!==fc)continue;
    if(fst&&s.status!==fst)continue;
    if(fct&&s.product_category!==fct)continue;
    filtered.push(s);
  }
  // ====== Summary Cards ======"
if ($c.Contains($o5)) { $c = $c.Replace($o5, $n5); $count++; "OK: 5 refreshScoutingCompare category filter" } else { "FAIL: 5" }

Set-Content "D:\1kaifa\grsds\index.html" -Value $c -Encoding UTF8 -NoNewline
"=== Done: $count changes ==="
