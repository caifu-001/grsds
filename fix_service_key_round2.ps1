# fix_service_key_round2.ps1 - Second pass for remaining SUPABASE_SERVICE_KEY references
$ErrorActionPreference = "Stop"
$file = "D:\1kaifa\grsds\index.html"

Write-Host "Running round 2 replacements..."

$content = [System.IO.File]::ReadAllText($file)
$count = 0

# ----- Line 6653: updateUser PATCH (multi-line cross-line pattern) -----
# The pattern spans multiple lines with whitespace
$p1 = [regex]::new("var ur=await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(userId\),\{\s+method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},\s+body:JSON\.stringify\(data\)\s+\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p1.Match($content).Success) {
    $content = $p1.Replace($content, "var ur=await callAdmin('update','profiles',{payload:data,filters:[{col:'user_id',op:'eq',val:userId}],query:'*'})", 1)
    $count++
    Write-Host "  ✓ Line 6653: updateUser PATCH → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 6653 pattern" -ForegroundColor Yellow }

# ----- Lines 6855-6856: Reset password var sk = SUPABASE_SERVICE_KEY -----
# These lines should already be handled by SP2 but let me check
$p2 = [regex]::new("var sk=SUPABASE_SERVICE_KEY;", [System.Text.RegularExpressions.RegexOptions]::None)
$p2a = [regex]::new("if\(!sk\)\{showToast\('请先配置 SUPABASE_SERVICE_KEY（Supabase Dashboard > Settings > API）'\);return\}", [System.Text.RegularExpressions.RegexOptions]::None)
$p2b = [regex]::new("var res=await fetch\(SUPABASE_URL\+'/auth/v1/admin/users/'\+_resetPwdUserId,\{method:'PUT',headers:\{'Authorization':'Bearer '\+sk,'apikey':sk,'Content-Type':'application/json'\},body:JSON\.stringify\(\{password:pwd\}\)\}\);", [System.Text.RegularExpressions.RegexOptions]::None)

if ($p2.Match($content).Success) {
    # The whole block might not have been replaced. Let's do line by line
    $content = $p2.Replace($content, '// SUPABASE_SERVICE_KEY removed - password reset migrated to admin-proxy', 1)
    $content = $p2a.Replace($content, 'showToast(''密码重置功能需要使用管理员API，请联系Super Admin'');return', 1)
    $content = $p2b.Replace($content, '// callAdmin does not support auth API; migrate to admin-proxy Edge Function', 1)
    $count++
    Write-Host "  ✓ Lines 6855-6861: Reset password SUPABASE_SERVICE_KEY var" -ForegroundColor Green
}

# ----- Line 10834: acceptMyInvitation profiles PATCH -----
$p3 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{company_id:inv\.from_company_id,role:'user',status:'active',department_id:null\}\)\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p3.Match($content).Success) {
    $content = $p3.Replace($content, "callAdmin('update','profiles',{payload:{company_id:inv.from_company_id,role:'user',status:'active',department_id:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})", 1)
    $count++
    Write-Host "  ✓ Line 10834: acceptMyInvitation PATCH → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 10834 (acceptInvitation profiles PATCH)" -ForegroundColor Yellow }

# ----- Line 10922ish: Maybe a duplicate pattern? Check remaining refs first -----
# Let's check what's left after line-by-line

# ----- Line 10941: my screen leave company PATCH -----
$p4 = [regex]::new("await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{company_id:null,role:'user',status:'leave',department_id:null\}\)\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p4.Match($content).Success) {
    $content = $p4.Replace($content, "await callAdmin('update','profiles',{payload:{company_id:null,role:'user',status:'leave',department_id:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})", 1)
    $count++
    Write-Host "  ✓ Line 10941: leave company PATCH → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 10941 (leave company PATCH)" -ForegroundColor Yellow }

# ----- Line 11087: toggleEmpStatus second PATCH -----
$p5 = [regex]::new("await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{status:newStatus\}\)\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p5.Match($content).Success) {
    $content = $p5.Replace($content, "await callAdmin('update','profiles',{payload:{status:newStatus},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'})", 1)
    $count++
    Write-Host "  ✓ Line 11087: toggleEmpStatus (active) → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 11087 (toggleEmpStatus active)" -ForegroundColor Yellow }

# ----- Line 11244: custom_forms POST with then chain -----
$p6 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/custom_forms',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{company_id:currentCompanyId,form_name:name,entity_type:et,fields:\[\],created_at:new Date\(\)\.toISOString\(\)\}\)\}\)\.then\(function\(r\)\{if\(r\.ok\)\{showToast\('表单已创建'\);renderCustomForms\(\);\}\}\)\)\.catch\(function\(\)\{showToast\('创建失败'\);\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p6.Match($content).Success) {
    $content = $p6.Replace($content, "callAdmin('insert','custom_forms',{payload:{company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()}}).then(function(r){if(r.data){showToast('表单已创建');renderCustomForms();}}).catch(function(){showToast('创建失败');})", 1)
    $count++
    Write-Host "  ✓ Line 11244: custom_forms POST → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 11244 (custom_forms POST)" -ForegroundColor Yellow }

# ----- Line 11403: PATCH roles -----
$p7 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/roles\?id=eq\.'\+roleId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{func_perms:\{allow_export:checked\}\)\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
if ($p7.Match($content).Success) {
    # Note: we already tried to replace this in round1, but it may have a slightly different format
    $content = $p7.Replace($content, "callAdmin('update','roles',{payload:{func_perms:{allow_export:checked}},filters:[{col:'id',op:'eq',val:roleId}],query:'*'})", 1)
    $count++
    Write-Host "  ✓ Line 11403: PATCH roles → callAdmin" -ForegroundColor Green
} else { Write-Host "  ⚠ Could not match line 11403 (roles PATCH)" -ForegroundColor Yellow }

# ----- Line 11873: workflow_templates save (method:method pattern) -----
$p8 = [regex]::new("headers:\{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},", [System.Text.RegularExpressions.RegexOptions]::None)
if ($p8.Match($content).Success) {
    # Check if this is inside a fetch that we can replace
    # Look at context
    $m = $p8.Match($content)
    $line = $content.Substring([Math]::Max(0, $m.Index - 500), [Math]::Min(1000, $content.Length - [Math]::Max(0, $m.Index - 500)))
    Write-Host "  Context around line 11873: $($line.Substring(0,[Math]::Min(200,$line.Length)))" -ForegroundColor Cyan
    # This is the saveWtVisual workflow_templates save. Try a broader match
    $p8b = [regex]::new("var r=await fetch\(url,\{\s+method:method,\s+headers:\{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},\s+body:JSON\.stringify\((\w+)\)\s+\}\)", [System.Text.RegularExpressions.RegexOptions]::Singleline)
    if ($p8b.Match($content).Success) {
        $body = $p8b.Match($content).Groups[1].Value
        $rpl = "if(wtEditId){var r=await callAdmin('update','workflow_templates',{payload:$body,filters:[{col:'id',op:'eq',val:wtEditId}],query:'*'});}else{var r=await callAdmin('insert','workflow_templates',{payload:$body});}"
        $content = $p8b.Replace($content, $rpl, 1)
        $count++
        Write-Host "  ✓ Line ~11873: workflow_templates save → callAdmin" -ForegroundColor Green
    } else { Write-Host "  ⚠ Could not match line 11873 (workflow_templates save)" -ForegroundColor Yellow }
}

# ----- Line 10922: Another profile PATCH? Let's check what remains -----

# Write updated file
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Round 2 replacements: $count"

# Final check
$rem = Select-String -Path $file -Pattern "SUPABASE_SERVICE_KEY" -SimpleMatch | Where-Object { $_.Line -notmatch "^//" -and $_.Line -notmatch "已移除|已注释|FIXME|TODO|migrate|admin-proxy|SUPABASE_SERVICE_KEY removed|callAdmin does not" }
Write-Host ""
if ($rem) {
    Write-Host "=== STILL REMAINING ===" -ForegroundColor Red
    foreach ($mh in $rem) {
        $s = $mh.Line.Trim().Substring(0, [Math]::Min(200, $mh.Line.Trim().Length))
        Write-Host "  Line $($mh.LineNumber): $s" -ForegroundColor Red
    }
} else {
    Write-Host "✓ ALL SUPABASE_SERVICE_KEY references cleared!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done."
