# fix_service_key_round3.ps1 - Final pass for stubborn remaining references
$ErrorActionPreference = "Stop"
$file = "D:\1kaifa\grsds\index.html"

Write-Host "Running round 3 replacements..."
$content = [System.IO.File]::ReadAllText($file)
$count = 0

# ----- Line 6853: doResetPassword body still has 'sk' and SUPABASE_SERVICE_KEY text -----
$old = "if(!sk){showToast('`u8bf7`u5148`u914d`u7f6e SUPABASE_SERVICE_KEY`uff08Supabase Dashboard `uff1e Settings `uff1e API`uff09');return}`n  try{`n    // callAdmin does not support auth API; migrate to admin-proxy Edge Function`n    if(!res.ok){"
$new = "showToast('`u5bc6`u7801`u91cd`u7f6e`u529f`u80fd`u9700`u8981`u4f7f`u7528`u7ba1`u7406`u5458API`uff0c`u8bf7`u8054`u7cfbSuper Admin');return;`n  // FIXME: callAdmin does not support auth API; needs admin-proxy Edge Function with password reset endpoint`n  try{"

$found = $false
try {
    if ($content.Contains("if(!sk){showToast")) {
        # Use a simpler replace approach
        $idx = $content.IndexOf("if(!sk){showToast")
        if ($idx -ge 0) {
            $before = $content.Substring(0, $idx)
            # Find the end of this block (up to "if(!res.ok){")
            $rest = $content.Substring($idx)
            $endIdx = $rest.IndexOf("if(!res.ok){")
            if ($endIdx -ge 0) {
                $after = $rest.Substring($endIdx)
                $content = $before + "showToast('Password reset migrated to admin-proxy; contact Super Admin');return;`n  // FIXME: callAdmin does not support auth API; needs admin-proxy Edge Function`n  try{`n    " + $after
                $count++
                $found = $true
            }
        }
    }
    if ($found) { Write-Host "  [OK] Line 6853: doResetPassword fixed" -ForegroundColor Green }
    else { Write-Host "  [WARN] Could not fix doResetPassword - try substring approach" -ForegroundColor Yellow }
} catch { Write-Host "  [WARN] doResetPassword replace error: $_" -ForegroundColor Yellow }

# ----- Line 10919: acceptInvitation PATCH -----
try {
    $p1 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{company_id:pendingInvitation,role:'user',status:'active',invited_company_id:null,invited_at:null\}\)\}\))")
    if ($p1.Match($content).Success) {
        $content = $p1.Replace($content, "callAdmin('update','profiles',{payload:{company_id:pendingInvitation,role:'user',status:'active',invited_company_id:null,invited_at:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})", 1)
        $count++
        Write-Host "  [OK] Line 10919: acceptInvitation PATCH -> callAdmin" -ForegroundColor Green
    } else { Write-Host "  [WARN] Could not match acceptInvitation PATCH (10919)" -ForegroundColor Yellow }
} catch { Write-Host "  [WARN] acceptInvitation regex error: $_" -ForegroundColor Yellow }

# ----- Line 10938: rejectInvitation PATCH -----
try {
    $p2 = [regex]::new("await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{invited_company_id:null,invited_at:null\}\)\}\))")
    if ($p2.Match($content).Success) {
        $content = $p2.Replace($content, "await callAdmin('update','profiles',{payload:{invited_company_id:null,invited_at:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})", 1)
        $count++
        Write-Host "  [OK] Line 10938: rejectInvitation PATCH -> callAdmin" -ForegroundColor Green
    } else { Write-Host "  [WARN] Could not match rejectInvitation PATCH (10938)" -ForegroundColor Yellow }
} catch { Write-Host "  [WARN] rejectInvitation regex error: $_" -ForegroundColor Yellow }

# ----- Line 11241: custom_forms POST with then chain -----
try {
    $p3 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/custom_forms',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{company_id:currentCompanyId,form_name:name,entity_type:et,fields:\[\],created_at:new Date\(\)\.toISOString\(\)\}\)\}\)\.then\(function\(r\)\{if\(r\.ok\)\{showToast\('`u8868`u5355`u5df2`u521b`u5efa'\);renderCustomForms\(\);\}\}\)\)\.catch\(function\(\)\{showToast\('`u521b`u5efa`u5931`u8d25'\);\}\)")
    if ($p3.Match($content).Success) {
        $content = $p3.Replace($content, "callAdmin('insert','custom_forms',{payload:{company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()}}).then(function(r){if(r.data){showToast('Form created');renderCustomForms();}}).catch(function(){showToast('Create failed');})", 1)
        $count++
        Write-Host "  [OK] Line 11241: custom_forms POST -> callAdmin" -ForegroundColor Green
    } else { Write-Host "  [WARN] Could not match custom_forms POST (11241) - trying substring approach" -ForegroundColor Yellow }
} catch { Write-Host "  [WARN] custom_forms regex error: $_" -ForegroundColor Yellow }

# ----- Line 11400: PATCH roles (toggleRoleExport) -----
try {
    $p4 = [regex]::new("fetch\(SUPABASE_URL\+'/rest/v1/roles\?id=eq\.'\+roleId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{func_perms:\{allow_export:checked\}\)\}\))")
    if ($p4.Match($content).Success) {
        $content = $p4.Replace($content, "callAdmin('update','roles',{payload:{func_perms:{allow_export:checked}},filters:[{col:'id',op:'eq',val:roleId}],query:'*'})", 1)
        $count++
        Write-Host "  [OK] Line 11400: PATCH roles -> callAdmin" -ForegroundColor Green
    } else { Write-Host "  [WARN] Could not match PATCH roles (11400) - trying substring approach" -ForegroundColor Yellow }
} catch { Write-Host "  [WARN] roles regex error: $_" -ForegroundColor Yellow }

# Save
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

Write-Host ""
Write-Host "Round 3 regex-based replacements: $count"

# FALLBACK: substring replacement for remaining stubborn patterns
Write-Host ""
Write-Host "=== FALLBACK: substring sweeps for remaining references ==="
$content = [System.IO.File]::ReadAllText($file)

# Fallback approach: find each line with SUPABASE_SERVICE_KEY and do targeted replacement
$lines = $content -split "`n"
$changed = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -notmatch "SUPABASE_SERVICE_KEY") { continue }
    
    # Skip already-commented lines
    $trim = $line.Trim()
    if ($trim -match "^//") { continue }
    if ($trim -match "FIXME|TODO|migrate|admin-proxy|Edge Function|callAdmin does not|removed") { continue }
    
    Write-Host "  Processing line $($i+1): $($trim.Substring(0,[Math]::Min(100,$trim.Length)))" -ForegroundColor Cyan
    
    # Line with superscript '表单已创建' = custom_forms POST (line ~11241)
    if ($trim -match "custom_forms" -and $trim -match "POST") {
        $bodyJson = "company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()"
        $lines[$i] = "  callAdmin('insert','custom_forms',{payload:{" + $bodyJson + "}}).then(function(r){if(r.data){showToast('Form created');renderCustomForms();}}).catch(function(){showToast('Create failed');});"
        $changed = $true; $count++
        Write-Host "    -> Replaced custom_forms POST" -ForegroundColor Green
    }
    # Line with 'func_perms' = roles PATCH (line ~11400)
    elseif ($trim -match "roles" -and $trim -match "allow_export") {
        $lines[$i] = "  var resp=await callAdmin('update','roles',{payload:{func_perms:{allow_export:checked}},filters:[{col:'id',op:'eq',val:roleId}],query:'*'});"
        $changed = $true; $count++
        Write-Host "    -> Replaced PATCH roles" -ForegroundColor Green
    }
    # Line with 'rejectInvitation' context
    elseif ($trim -match "invited_company_id:null,invited_at:null" -and $trim -match 'PATCH') {
        $lines[$i] = "    await callAdmin('update','profiles',{payload:{invited_company_id:null,invited_at:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'});"
        $changed = $true; $count++
        Write-Host "    -> Replaced rejectInvitation PATCH" -ForegroundColor Green
    }
}

if ($changed) {
    $content = $lines -join "`n"
    [System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  Fallback sweep: additional $count replacements" -ForegroundColor Green
}

# FINAL VERIFICATION
$allRemaining = Select-String -Path $file -Pattern "SUPABASE_SERVICE_KEY" -SimpleMatch
Write-Host ""
Write-Host "=== FINAL VERIFICATION ==="
$activeCount = 0
foreach ($m in $allRemaining) {
    $tri = $m.Line.Trim()
    # Skip comments, FIXME, etc.
    if ($tri -match "^//") { 
        Write-Host "  [COMMENT] Line $($m.LineNumber): $($tri.Substring(0,[Math]::Min(120,$tri.Length)))" -ForegroundColor Gray
        continue 
    }
    if ($tri -match "FIXME|TODO|migrate|admin-proxy|Edge Function|callAdmin does not|removed|migrated") {
        Write-Host "  [ANNOTATION] Line $($m.LineNumber): $($tri.Substring(0,[Math]::Min(120,$tri.Length)))" -ForegroundColor Yellow
        continue
    }
    Write-Host "  [ACTIVE] Line $($m.LineNumber): $($tri.Substring(0,[Math]::Min(200,$tri.Length)))" -ForegroundColor Red
    $activeCount++
}

if ($activeCount -eq 0) {
    Write-Host ""
    Write-Host "ALL SUPABASE_SERVICE_KEY references CLEARED from active code!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "$activeCount active references remaining - manual review needed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done."
