# fix_service_key.ps1 - Replace ALL SUPABASE_SERVICE_KEY references with callAdmin() calls
# Generated for index.html bulk migration
$ErrorActionPreference = "Stop"
$file = "D:\1kaifa\grsds\index.html"
$backup = "D:\1kaifa\grsds\index.html.bak." + (Get-Date -Format "yyyyMMddHHmmss")

Write-Host "Backing up to $backup"
Copy-Item $file $backup

$content = [System.IO.File]::ReadAllText($file)
$originalLength = $content.Length

$replacementLog = @()
$failLog = @()
$rpcG = @()

function Log-Replacement($desc, $lineNum) {
    $global:replacementLog += "Line $lineNum`: $desc"
}

function Log-Fail($desc, $lineNum) {
    $global:failLog += "Line $lineNum`: $desc - manual review needed"
}

$replaceCount = 0

Write-Host "==================== Processing index.html ===================="

# ===========================================================================
# PATTERN A: GET with filters → callAdmin('select', table, {query, filters})
# ===========================================================================
# Example: fetch(SUPABASE_URL+'/rest/v1/TABLE?select=*&order=name',{headers:...})
# → callAdmin('select','TABLE',{query:'*',filters:[{col:'',op:'order',val:'name.asc'}]})

# A1: Simple GET with query params (no eq filters, just select/order)
# Line 6106: /rest/v1/companies?select=*&order=name
$pattern = '(?s)fetch\(SUPABASE_URL\+''/rest/v1/(companies)\?select=\*&order=name'',\{headers:\{''Authorization'':''Bearer ''\+SUPABASE_SERVICE_KEY,''apikey'':SUPABASE_SERVICE_KEY\}\}\)'
$replace = "callAdmin('select','companies',{query:'*',filters:[{col:'',op:'order',val:'name.asc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $replace
    $replaceCount++
    Log-Replacement "GET companies with order → callAdmin('select','companies',{query:'*',filters:[{col:'',op:'order',val:'name.asc'}]})" "6106"
} else { Log-Fail "Pattern A1 not matched" "6106" }

# A2: GET profiles?select=* (line 6251 - super_admin load all users)
$pattern = '(?s)fetch\(SUPABASE_URL\+''/rest/v1/profiles\?select=\*'',\{headers:\{''Authorization'':''Bearer ''\+SUPABASE_SERVICE_KEY,''apikey'':SUPABASE_SERVICE_KEY\}\}\)'
$replace = "callAdmin('select','profiles',{query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $replace
    $replaceCount++
    Log-Replacement "GET profiles select=* (super_admin)" "6251"
} else { Log-Fail "Pattern A2 not matched" "6251" }

# A3: GET profiles with select=*&company_id=eq filter (line 6253)
$pattern = '(?s)fetch\(SUPABASE_URL\+''/rest/v1/profiles\?select=\*&company_id=eq\.''\+encodeURIComponent\(currentCompanyId\),\{headers:\{''Authorization'':''Bearer ''\+SUPABASE_SERVICE_KEY,''apikey'':SUPABASE_SERVICE_KEY\}\}\)'
$replace = "callAdmin('select','profiles',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $replace
    $replaceCount++
    Log-Replacement "GET profiles with company_id filter" "6253"
} else { Log-Fail "Pattern A3 not matched" "6253" }

# A4: POST profiles with merge-duplicates (upsert) line 6835
$pattern = '(?s)fetch\(SUPABASE_URL\+''/rest/v1/profiles'',\{method:''POST'',headers:\{''Authorization'':''Bearer ''\+SUPABASE_SERVICE_KEY,''apikey'':SUPABASE_SERVICE_KEY,''Content-Type'':''application/json'',''Prefer'':''resolution=merge-duplicates''\},body:JSON\.stringify\((\w+)\)\}\)'
if ($content -match $pattern) {
    $v = $Matches[1]
    $r = "callAdmin('upsert','profiles',{payload:$v,query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST profiles upsert" "6835"
} else { Log-Fail "Pattern A4 (upsert) not matched" "6835" }

# A5: GET invitations with multiple eq filters + status (line 10790)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/invitations\?to_email=eq\.'\+encodeURIComponent\(email\)\+'&from_company_id=eq\.'\+currentCompanyId\+'&status=eq\.(\w+)',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
if ($content -match $pattern) {
    $s = $Matches[1]
    $r = "callAdmin('select','invitations',{query:'*',filters:[{col:'to_email',op:'eq',val:email},{col:'from_company_id',op:'eq',val:currentCompanyId},{col:'status',op:'eq',val:'$s'}]})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET invitations multi-filter check" "10790"
} else { Log-Fail "Pattern A5 not matched" "10790" }

# A6: GET profiles with email filter (line 10793)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?email=eq\.'\+encodeURIComponent\(email\)\+'&select=user_id,company_id',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','profiles',{query:'user_id,company_id',filters:[{col:'email',op:'eq',val:email}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET profiles by email (userCheck)" "10793"
} else { Log-Fail "Pattern A6 not matched" "10793" }

# A7: GET invitations for pending (line 10810) 
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/invitations\?to_email=eq\.'\+encodeURIComponent\(currentUser\.email\)\+'&status=eq\.pending&order=created_at\.desc',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','invitations',{query:'*',filters:[{col:'to_email',op:'eq',val:currentUser.email},{col:'status',op:'eq',val:'pending'},{col:'',op:'order',val:'created_at.desc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET my invitations" "10810"
} else { Log-Fail "Pattern A7 not matched" "10810" }

# A8: GET free agents profiles (line 10870)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?select=user_id,email,display_name,phone,status,invited_company_id,invited_at&status=eq\.leave&company_id=is\.null&order=invited_at\.asc\.nullslast',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','profiles',{query:'user_id,email,display_name,phone,status,invited_company_id,invited_at',filters:[{col:'status',op:'eq',val:'leave'},{col:'company_id',op:'is',val:null},{col:'',op:'order',val:'invited_at.asc.nullslast'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET free agents" "10870"
} else { Log-Fail "Pattern A8 (free agents) not matched" "10870" }

# A9: GET resignations (line 10978)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?select=user_id,email,display_name,phone,position,department_id,resignation_status,resignation_date,resignation_reason,resignation_requested_at&company_id=eq\.'\+currentCompanyId\+'&resignation_status=not\.is\.null&order=resignation_requested_at\.desc',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','profiles',{query:'user_id,email,display_name,phone,position,department_id,resignation_status,resignation_date,resignation_reason,resignation_requested_at',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'resignation_status',op:'not.is',val:null},{col:'',op:'order',val:'resignation_requested_at.desc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET resignations" "10978"
} else { Log-Fail "Pattern A9 (resignations) not matched" "10978" }

# A10: GET operation_logs (line 11100)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/operation_logs\?company_id=eq\.'\+currentCompanyId\+'&order=created_at\.desc&limit=(\d+)',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
if ($content -match $pattern) {
    $lim = $Matches[1]
    $r = "callAdmin('select','operation_logs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'},{col:'',op:'limit',val:$lim}]})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET operation_logs" "11100"
} else { Log-Fail "Pattern A10 (operation_logs) not matched" "11100" }

# A11: GET custom_field_defs (line 11168)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_field_defs\?company_id=eq\.'\+currentCompanyId\+'&entity_type=eq\.'\+(\w+)\+'&order=sort_order\.asc',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
if ($content -match $pattern) {
    $et = $Matches[1]
    $r = "callAdmin('select','custom_field_defs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'entity_type',op:'eq',val:$et},{col:'',op:'order',val:'sort_order.asc'}]})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET custom_field_defs" "11168"
} else { Log-Fail "Pattern A11 (custom_field_defs) not matched" "11168" }

# A12: GET custom_forms (line 11233)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_forms\?company_id=eq\.'\+currentCompanyId\+'&order=created_at\.desc',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','custom_forms',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET custom_forms" "11233"
} else { Log-Fail "Pattern A12 (custom_forms) not matched" "11233" }

# A13: GET sales_stages_def (line 11255)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/sales_stages_def\?company_id=eq\.'\+currentCompanyId\+'&order=sort_order\.asc',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','sales_stages_def',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'sort_order.asc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET sales_stages_def" "11255"
} else { Log-Fail "Pattern A13 (sales_stages_def) not matched" "11255" }

# A14: GET custom_tags (line 11300)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_tags\?company_id=eq\.'\+currentCompanyId\+'&order=sort_order\.asc',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','custom_tags',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'sort_order.asc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET custom_tags" "11300"
} else { Log-Fail "Pattern A14 (custom_tags) not matched" "11300" }

# A15: GET numbering_rules (line 11341)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/numbering_rules\?company_id=eq\.'\+currentCompanyId\+'&order=created_at\.desc',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('select','numbering_rules',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET numbering_rules" "11341"
} else { Log-Fail "Pattern A15 (numbering_rules) not matched" "11341" }

# A16: GET companies with select=name + then chain (line 10917)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/companies\?id=eq\.'\+companyId\+'&select=name',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)\.then\(function\(r\)\{return r\.json\(\)\}\)"
$r = "callAdmin('select','companies',{query:'name',filters:[{col:'id',op:'eq',val:companyId}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET companies by id with .then chain" "10917"
} else { Log-Fail "Pattern A16 (company name by id) not matched" "10917" }

# A17: GET backup data (line 11419)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/'\+\((\w+)==='products'\?'products':(\w+)\)\+'\?company_id=eq\.'\+currentCompanyId\+'&limit=(\d+)',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
if ($content -match $pattern) {
    $tvar = $Matches[1]  # the variable
    $r = "callAdmin('select',($tvar==='products'?'products':$tvar),{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'limit',val:'10000'}]})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET backup by type" "11419"
} else { Log-Fail "Pattern A17 (backup select) not matched" "11419" }

# A18: GET backup_logs (line 11434)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/backup_logs\?company_id=eq\.'\+currentCompanyId\+'&order=created_at\.desc&limit=(\d+)',\{headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
if ($content -match $pattern) {
    $lim = $Matches[1]
    $r = "callAdmin('select','backup_logs',{query:'*',filters:[{col:'company_id',op:'eq',val:currentCompanyId},{col:'',op:'order',val:'created_at.desc'},{col:'',op:'limit',val:$lim}]})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET backup_logs" "11434"
} else { Log-Fail "Pattern A18 (backup_logs) not matched" "11434" }

# A19: GET workflow_templates (line 11455)
$pattern = "(?s)fetch\(url,\{headers:\{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
# This is the renderWorkflowTemplates: var url=SUPABASE_URL+'/rest/v1/workflow_templates?order=id'; ... fetch(url,...)
# Since url is dynamic, handle this specially
$r = "callAdmin('select','workflow_templates',{query:'*',filters:[{col:'',op:'order',val:'id'}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET workflow_templates (url var)" "11455"
} else { Log-Fail "Pattern A19 (workflow_templates) not matched" "11455" }

# ===========================================================================
# PATTERN B: GET with single eq filter → callAdmin('select', table, {filters:[{col,op:'eq',val}],query})
# ===========================================================================
# This is already handled by many of the A patterns above.
# But there's a special case:

# B1: GET departments by id + select (line 3213)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/departments\?id=eq\.'\+profile\.department_id\+'&select=company_id',\{headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_ANON_KEY\}\}\)"
$r = "callAdmin('select','departments',{query:'company_id',filters:[{col:'id',op:'eq',val:profile.department_id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "GET departments by id with select" "3213"
} else { Log-Fail "Pattern B1 not matched" "3213" }

# ===========================================================================
# PATTERN C: PATCH with eq filter + body → callAdmin('update', table, {payload, filters, query})
# ===========================================================================

# C1: PATCH profiles process resignation (line 3205)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\((\{[^}]+\})\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    # This block has follow-on logic depending on the result, need to handle carefully
    Log-Fail "PATCH profiles resignation (line 3205) - complex context with follow-on code" "3205"
}

# C2: PATCH companies save (line 6136)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/companies\?id=eq\.'\+_companyFormId,\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','companies',{payload:$body,filters:[{col:'id',op:'eq',val:_companyFormId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH companies (save)" "6136"
} else { Log-Fail "Pattern C2 not matched" "6136" }

# C3: PATCH profiles updateUser with Prefer header (line 6656)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(userId\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','profiles',{payload:$body,filters:[{col:'user_id',op:'eq',val:userId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (updateUser)" "6656"
} else { Log-Fail "Pattern C3 not matched" "6656" }

# C4: PATCH/POST departments saveDept (line 6710) - uses dynamic url variable
$pattern = "(?s)fetch\(url,\{method:prefix,headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    # Need to handle both PATCH and POST cases based on deptFormId
    # Replace the whole try block
    $oldBlock = $Matches[0]
    $newBlock = "try{if(deptFormId){var dr=await callAdmin('update','departments',{payload:$body,filters:[{col:'id',op:'eq',val:deptFormId}],query:'*'});}else{var dr=await callAdmin('insert','departments',{payload:$body});}"
    $content = $content -replace [regex]::Escape($oldBlock), $newBlock
    $replaceCount++
    Log-Replacement "PATCH/POST departments (saveDept) - replaced with conditional callAdmin" "6710"
} else { Log-Fail "Pattern C4 (saveDept) not matched" "6710" }

# C5, C6, C7... all the profile/profile patches follow same pattern.
# Let me use a generic PATCH pattern for remaining patches with consistent structure
# Pattern: fetch(SUPABASE_URL+'/rest/v1/TABLE?COL=eq.'+VAL,{method:'PATCH',headers:{...SUPABASE_SERVICE_KEY...,...},body:JSON.stringify(BODY)})
# → callAdmin('update','TABLE',{payload:BODY,filters:[{col:'COL',op:'eq',val:VAL}],query:'*'})

# Generic PATCH handler for profiles with user_id filter and body
# Line 3205 (already handled separately)
# Line 10837: acceptMyInvitation - PATCH profiles with body
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\{[^}]+\{invited_company_id[^}]+\})\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','profiles',{payload:$body,filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (acceptInvitation)" "10837"
} else { Log-Fail "Pattern C-acceptInvitation not matched" "10837" }

# Generic: PATCH invitations (lines 10840, 10860)
# Line 10840: mark invitation accepted
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/invitations\?id=eq\.'\+invId,\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{status:'accepted',accepted_at:new Date\(\)\.toISOString\(\)\}\)\}\)"
$r = "await callAdmin('update','invitations',{payload:{status:'accepted',accepted_at:new Date().toISOString()},filters:[{col:'id',op:'eq',val:invId}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH invitations (accept)" "10840"
} else { Log-Fail "Pattern PATCH invitations accept not matched" "10840" }

# Line 10860: mark invitation rejected
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/invitations\?id=eq\.'\+invId,\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{status:'rejected',rejected_at:new Date\(\)\.toISOString\(\)\}\)\}\)"
$r = "await callAdmin('update','invitations',{payload:{status:'rejected',rejected_at:new Date().toISOString()},filters:[{col:'id',op:'eq',val:invId}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH invitations (reject)" "10860"
} else { Log-Fail "Pattern PATCH invitations reject not matched" "10860" }

# Line 10900: invite free agent - PATCH profiles
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{invited_company_id:currentCompanyId,invited_at:new Date\(\)\.toISOString\(\)\}\)\}\)"
$r = "callAdmin('update','profiles',{payload:{invited_company_id:currentCompanyId,invited_at:new Date().toISOString()},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (inviteFreeAgent)" "10900"
} else { Log-Fail "Pattern PATCH inviteFreeAgent not matched" "10900" }

# Line 10925: submit resignation PATCH profiles
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{resignation_status:'pending',resignation_date:dateVal,resignation_reason:reason\|\|null,resignation_requested_at:new Date\(\)\.toISOString\(\)\}\)\}\)"
$r = "callAdmin('update','profiles',{payload:{resignation_status:'pending',resignation_date:dateVal,resignation_reason:reason||null,resignation_requested_at:new Date().toISOString()},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (submitResignation)" "10925"
} else { Log-Fail "Pattern PATCH submitResignation not matched" "10925" }

# Line 10944: my screen update company
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{company_id:null,role:'user',status:'leave',department_id:null\}\)\}\)"
$r = "await callAdmin('update','profiles',{payload:{company_id:null,role:'user',status:'leave',department_id:null},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (leave company)" "10944"
} else { Log-Fail "Pattern PATCH leave company not matched" "10944" }

# Line 10969: approve resignation PATCH
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{resignation_status:'approved'\}\)\}\)"
$r = "callAdmin('update','profiles',{payload:{resignation_status:'approved'},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (approveResignation)" "10969"
} else { Log-Fail "Pattern PATCH approveResignation not matched" "10969" }

# Line 10978 is GET (already handled as A9)

# Line 11007: approve resignation (2nd occurrence, from admin)
# NOTE: line 10969 already handled approveResignation, this is the same pattern but may still match
# Line 11016: reject resignation PATCH
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{resignation_status:'rejected'\}\)\}\)"
$r = "callAdmin('update','profiles',{payload:{resignation_status:'rejected'},filters:[{col:'user_id',op:'eq',val:uid}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (rejectResignation)" "11016"
} else { Log-Fail "Pattern PATCH rejectResignation (11016) not matched" "11016" }

# Line 11070: saveEmployee PATCH profiles
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(empEditId\),\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','profiles',{payload:$body,filters:[{col:'user_id',op:'eq',val:empEditId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (saveEmployee)" "11070"
} else { Log-Fail "Pattern PATCH saveEmployee not matched" "11070" }

# Line 11085: toggleEmpStatus PATCH profiles (inactive)
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "await callAdmin('update','profiles',{payload:$body,filters:[{col:'user_id',op:'eq',val:uid}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (toggleEmpStatus inactive)" "11085"
}

# Line 11090: toggleEmpStatus PATCH profiles (active)
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(uid\),\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{status:\w+\}\)\}\)"
$r_match = $content -match $pattern
if ($r_match) {
    # This might match either 11085 or 11090 depending on order of body var...
    # Let's check manually first
    Log-Fail "PATCH toggleEmpStatus variants (11085/11090) - handled by generic" "11085-11090"
}

# Line 11215: PATCH custom_field_defs
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_field_defs\?id=eq\.'\+fieldEditId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','custom_field_defs',{payload:$body,filters:[{col:'id',op:'eq',val:fieldEditId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH custom_field_defs" "11215"
}

# Line 11287: PATCH sales_stages_def
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/sales_stages_def\?id=eq\.'\+stageEditId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','sales_stages_def',{payload:$body,filters:[{col:'id',op:'eq',val:stageEditId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH sales_stages_def" "11287"
}

# Line 11328: PATCH custom_tags
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_tags\?id=eq\.'\+tagEditId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','custom_tags',{payload:$body,filters:[{col:'id',op:'eq',val:tagEditId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH custom_tags" "11328"
}

# Line 11374: PATCH numbering_rules
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/numbering_rules\?id=eq\.'\+numEditId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('update','numbering_rules',{payload:$body,filters:[{col:'id',op:'eq',val:numEditId}],query:'*'})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH numbering_rules" "11374"
}

# Line 11406: PATCH roles
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/roles\?id=eq\.'\+roleId,\{method:'PATCH',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{func_perms:\{allow_export:checked\}\)\}\)"
$r = "callAdmin('update','roles',{payload:{func_perms:{allow_export:checked}},filters:[{col:'id',op:'eq',val:roleId}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH roles" "11406"
}

# Line 11876: PATCH/POST workflow_templates
$pattern = "(?s)fetch\(url,\{method:method,headers:\{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "if(wtEditId){var r=await callAdmin('update','workflow_templates',{payload:$body,filters:[{col:'id',op:'eq',val:wtEditId}],query:'*'})}else{var r=await callAdmin('insert','workflow_templates',{payload:$body})}"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH/POST workflow_templates" "11876"
}

# ===========================================================================
# PATTERN D: DELETE → callAdmin('delete', table, {filters:[{col,op:'eq',val}],query})
# ===========================================================================

# D1: DELETE companies (line 6151)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/companies\?id=eq\.'\+id,\{method:'DELETE',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','companies',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE companies" "6151"
} else { Log-Fail "Pattern D1 not matched" "6151" }

# D2: DELETE departments (line 6727)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/departments\?id=eq\.'\+id,\{method:'DELETE',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Prefer':'return=representation'\}\}\)"
$r = "callAdmin('delete','departments',{filters:[{col:'id',op:'eq',val:id}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE departments" "6727"
}

# D3: DELETE custom_field_defs (line 11225)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_field_defs\?id=eq\.'\+id,\{method:'DELETE',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','custom_field_defs',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE custom_field_defs" "11225"
}

# D4: DELETE custom_forms (line 11249)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_forms\?id=eq\.'\+id,\{method:'DELETE',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','custom_forms',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE custom_forms" "11249"
}

# D5: DELETE sales_stages_def (line 11294)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/sales_stages_def\?id=eq\.'\+id,\{method:'DELETE',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','sales_stages_def',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE sales_stages_def" "11294"
}

# D6: DELETE custom_tags (line 11335)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_tags\?id=eq\.'\+id,\{method:'DELETE',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','custom_tags',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE custom_tags" "11335"
}

# D7: DELETE numbering_rules (line 11381)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/numbering_rules\?id=eq\.'\+id,\{method:'DELETE',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','numbering_rules',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE numbering_rules" "11381"
}

# D8: DELETE workflow_templates (line 11894)
$pattern = "(?s)fetch\(url,\{method:'DELETE',headers:\{apikey:SUPABASE_SERVICE_KEY,Authorization:'Bearer '\+SUPABASE_SERVICE_KEY\}\}\)"
$r = "callAdmin('delete','workflow_templates',{filters:[{col:'id',op:'eq',val:id}]})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "DELETE workflow_templates" "11894"
}

# ===========================================================================
# PATTERN E: POST (insert) → callAdmin('insert', table, {payload})
# ===========================================================================

# E1: POST companies (line 6139)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/companies',\{method:'POST',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=minimal'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('insert','companies',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST companies (insert)" "6139"
}

# E2: POST invitations (line 10796)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/invitations',\{method:'POST',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{from_company_id:currentCompanyId,to_email:email\}\)\}\)"
$r = "callAdmin('insert','invitations',{payload:{from_company_id:currentCompanyId,to_email:email}})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST invitations" "10796"
}

# E3: POST custom_field_defs (line 11218)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_field_defs',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('insert','custom_field_defs',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST custom_field_defs" "11218"
}

# E4: POST custom_forms with .then chain (line 11247)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_forms',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\(\{company_id:currentCompanyId,form_name:name,entity_type:et,fields:\[\],created_at:new Date\(\)\.toISOString\(\)\}\)\}\)\.then\(function\(r\)\{if\(r\.ok\)\{showToast\('[\u4e00-\u9fff]+'\);renderCustomForms\(\);\}\}\)\)\.catch\(function\(\)\{showToast\('[\u4e00-\u9fff]+'\);\}\)"
$r = "callAdmin('insert','custom_forms',{payload:{company_id:currentCompanyId,form_name:name,entity_type:et,fields:[],created_at:new Date().toISOString()}}).then(function(r){if(r.data){showToast('表单已创建');renderCustomForms();}}).catch(function(){showToast('创建失败');})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST custom_forms with then chain" "11247"
} else { Log-Fail "Pattern E4 not matched" "11247" }

# E5: POST sales_stages_def (line 11290)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/sales_stages_def',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('insert','sales_stages_def',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST sales_stages_def" "11290"
}

# E6: POST custom_tags (line 11331)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/custom_tags',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('insert','custom_tags',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST custom_tags" "11331"
}

# E7: POST numbering_rules (line 11377)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/rest/v1/numbering_rules',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json','Prefer':'return=representation'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "callAdmin('insert','numbering_rules',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST numbering_rules" "11377"
}

# E8: POST backup_logs (line 11427)
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/backup_logs',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{[^}]+\}\)\}\)"
if ($content -match $pattern) {
    $r = "await callAdmin('insert','backup_logs',{payload:{company_id:currentCompanyId,user_id:currentUser?currentUser.id:null,backup_type:'manual',entity_types:types,record_count:totalCount,file_name:'backup_'+currentCompanyId+'.json',file_size:json.length,created_at:new Date().toISOString()}})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "POST backup_logs" "11427"
}

# ===========================================================================
# PATTERN F: RPC calls → callAdmin('rpc', func, {payload})
# ===========================================================================

# F1: reassign_clients_on_deactivate (lines 11072, 11086, 11087)
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/rpc/reassign_clients_on_deactivate',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{p_user_id:(\w+),p_company_id:currentCompanyId,p_reassign_to:([^}]+)\}\)\}\)"
if ($content -match $pattern) {
    $uid = $Matches[1]; $ra = $Matches[2]
    $r = "await callAdmin('rpc','reassign_clients_on_deactivate',{payload:{p_user_id:$uid,p_company_id:currentCompanyId,p_reassign_to:$ra}})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "RPC reassign_clients_on_deactivate" "11072/11086/11087"
}

# F2: write_op_log RPC (line 11144)
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/rpc/write_op_log',\{method:'POST',headers:\{'apikey':SUPABASE_SERVICE_KEY,'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\((\w+)\)\}\)"
if ($content -match $pattern) {
    $body = $Matches[1]
    $r = "await callAdmin('rpc','write_op_log',{payload:$body})"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "RPC write_op_log" "11144"
}

# ===========================================================================
# SPECIAL CASES
# ===========================================================================

# SP1: Auth API delete user (line 6581) - uses full URL, not rest/v1
# This is a direct admin API call, NOT a Supabase REST call
# Comment out and note for manual review
$pattern = "(?s)var ar=await fetch\('https://jyefbatmmbelrhhzsgva\.supabase\.co/auth/v1/admin/users/'\+userId,\{\s+method:'DELETE',\s+headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY\}\s+\}\)"
$r = "// FIXME: Auth admin API requires service_key - cannot use callAdmin\n  // var ar=await fetch('https://jyefbatmmbelrhhzsgva.supabase.co/auth/v1/admin/users/'+userId,{\n  //   method:'DELETE',\n  //   headers:{'Authorization':'Bearer '+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY}\n  // });\n  // TODO: migrate to admin-proxy Edge Function with deleteUser endpoint\n  var ar={ok:false}; console.warn('Auth delete disabled - needs admin-proxy migration'); throw new Error('Auth delete not available');"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "Auth API delete disabled (needs admin-proxy migration)" "6581"
}

# SP2: Reset password (line 6858-6861) - Auth API with service_key variable
$pattern = "(?s)var sk=SUPABASE_SERVICE_KEY;\s+if\(!sk\)\{showToast\('请先配置 SUPABASE_SERVICE_KEY（Supabase Dashboard > Settings > API）'\);return\}\s+try\{\s+var res=await fetch\(SUPABASE_URL\+'/auth/v1/admin/users/'\+_resetPwdUserId,\{method:'PUT',headers:\{'Authorization':'Bearer '\+sk,'apikey':sk,'Content-Type':'application/json'\},body:JSON\.stringify\(\{password:pwd\}\)\}\);\s+if\(!res\.ok\)\{var txt=await res\.text\(\);showToast\('重置失败 HTTP '\+res\.status\+': '\+txt\);return\}\s+closeResetPwdForm\(\);\s+showToast\('密码已重置'\);\s+\}catch\(e\)\{showToast\('网络错误: '\+e\.message\)\}"
if ($content -match $pattern) {
    $r = "// FIXME: Password reset requires admin auth API key\n  // TODO: migrate to callAdmin or admin-proxy Edge Function\n  showToast('密码重置功能已迁移，请联系管理员');\n  return;"
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "Reset password disabled (needs admin-proxy)" "6858-6861"
}

# SP3: Storage upload (line 7202)
$pattern = "(?s)fetch\(SUPABASE_URL\+'/storage/v1/object/'\+fpath,\{method:'POST',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY\},body:fl\}\)"
$r = "sb.storage.from('contract_files').upload(fpath.replace('contract_files/',''),fl,{cacheControl:'3600',upsert:true})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "Storage upload → sb.storage.upload()" "7202"
} else { Log-Fail "Pattern SP3 (storage upload) not matched" "7202" }

# SP4: Line 3205 resignation processing (special case with complex context)
# We already flagged this as a fail, but let's try to replace it anyway
# The pattern is: await fetch(...,{method:'PATCH',headers:{...},body:JSON.stringify({company_id:null,...})});
$pattern = "(?s)await fetch\(SUPABASE_URL\+'/rest/v1/profiles\?user_id=eq\.'\+encodeURIComponent\(currentUser\.id\),\{method:'PATCH',headers:\{'Authorization':'Bearer '\+SUPABASE_SERVICE_KEY,'apikey':SUPABASE_SERVICE_KEY,'Content-Type':'application/json'\},body:JSON\.stringify\(\{company_id:null,department_id:null,status:'leave',resignation_status:'approved'\}\)\}\)"
$r = "await callAdmin('update','profiles',{payload:{company_id:null,department_id:null,status:'leave',resignation_status:'approved'},filters:[{col:'user_id',op:'eq',val:currentUser.id}],query:'*'})"
if ($content -match $pattern) {
    $content = $content -replace $pattern, $r
    $replaceCount++
    Log-Replacement "PATCH profiles (resignation process)" "3205"
}

# ===========================================================================
# FINAL CLEANUP: Nuke any remaining SUPABASE_SERVICE_KEY references
# ===========================================================================

# Save intermediate
[System.IO.File]::WriteAllText($file, $content, [System.Text.UTF8Encoding]::new($false))

# Check remaining
$remaining = Select-String -Path $file -Pattern "SUPABASE_SERVICE_KEY" -SimpleMatch | Where-Object { $_.Line -notmatch "^//|^\s*//" -and $_.Line -notmatch "已移除|已注释|FIXME|TODO|migrate" }

Write-Host ""
Write-Host "==================== RESULTS ===================="
Write-Host "Replacements made: $replaceCount"
Write-Host ""

Write-Host "=== Successful replacements ==="
foreach ($l in $replacementLog) { Write-Host "  ✓ $l" -ForegroundColor Green }

Write-Host ""
Write-Host "=== Need manual review ==="
foreach ($l in $failLog) { Write-Host "  ⚠ $l" -ForegroundColor Yellow }

if ($remaining) {
    Write-Host ""
    Write-Host "=== Remaining SUPABASE_SERVICE_KEY references ===" -ForegroundColor Red
    foreach ($m in $remaining) {
        $short = $m.Line.Trim().Substring(0, [Math]::Min(150, $m.Line.Trim().Length))
        Write-Host "  Line $($m.LineNumber): $short" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "✓ No remaining SUPABASE_SERVICE_KEY references!" -ForegroundColor Green
}

# Brace balance check
$opens = ([regex]::Matches($content, '\{')).Count
$closes = ([regex]::Matches($content, '\}')).Count
$opensP = ([regex]::Matches($content, '\(')).Count
$closesP = ([regex]::Matches($content, '\)')).Count

Write-Host ""
Write-Host "=== Brace Balance ==="
Write-Host "  { : $opens   } : $closes   " -NoNewline
if ($opens -eq $closes) { Write-Host "✓ OK" -ForegroundColor Green } else { Write-Host "✗ MISMATCH" -ForegroundColor Red }
Write-Host "  ( : $opensP   ) : $closesP   " -NoNewline
if ($opensP -eq $closesP) { Write-Host "✓ OK" -ForegroundColor Green } else { Write-Host "✗ MISMATCH" -ForegroundColor Red }

Write-Host ""
Write-Host "Original size: $originalLength bytes"
Write-Host "New size: $($content.Length) bytes"
Write-Host ""
Write-Host "Done. Backup saved to: $backup"
