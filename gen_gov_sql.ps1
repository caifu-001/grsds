# 读取 chongqing_gov_orgs.json，生成 Supabase SQL INSERT 语句
$jsonPath = "D:\1kaifa\grsds\chongqing_gov_orgs.json"
$sqlPath  = "D:\1kaifa\grsds\import_gov_orgs.sql"

$data = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

$now = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
$orgs  = $data | Where-Object { $_.category -notlike "*政策法规*" }
$count = ($orgs | Measure-Object).Count

$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- 导入重庆信息化相关政府/国企机构到 companies 表")
[void]$sb.AppendLine("-- 在 Supabase SQL Editor 中一次性执行")
[void]$sb.AppendLine("-- 数量: $count 条")
[void]$sb.AppendLine("-- 生成: $now`n")
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- 1. 补充列（幂等，已存在则跳过）")
[void]$sb.AppendLine("ALTER TABLE companies ADD COLUMN IF NOT EXISTS contact TEXT;")
[void]$sb.AppendLine("ALTER TABLE companies ADD COLUMN IF NOT EXISTS city TEXT;")
[void]$sb.AppendLine("ALTER TABLE companies ADD COLUMN IF NOT EXISTS province TEXT;")
[void]$sb.AppendLine("ALTER TABLE companies ADD COLUMN IF NOT EXISTS business_scope TEXT;")
[void]$sb.AppendLine("ALTER TABLE companies ADD COLUMN IF NOT EXISTS established DATE;")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- 2. 逐条 INSERT（用 ON CONFLICT 做幂等，按 name 去重）")
[void]$sb.AppendLine("-- 策略: ON CONFLICT (name) DO UPDATE 覆盖更新，确保数据最新")
[void]$sb.AppendLine("")

# 先确保 name 有唯一约束（幂等）
[void]$sb.AppendLine("-- 确保 name 列有唯一约束（幂等）")
[void]$sb.AppendLine("DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='companies_name_key') THEN ALTER TABLE companies ADD CONSTRAINT companies_name_key UNIQUE (name); END IF; END `$`$;")
[void]$sb.AppendLine("")

$esc = { param($s) if ($null -eq $s -or $s -eq '') { return 'NULL' }; return "'" + $s.Replace("'", "''").Replace("\", "\\") + "'" }

foreach ($org in $orgs) {
    $name   = &$esc $org.name
    $phone  = &$esc $org.phone
    $city   = &$esc "重庆"
    $prov   = &$esc "重庆"
    $est    = if ($org.established) { "'" + $org.established + "'" } else { 'NULL' }
    $nature = if ($org.nature) { $org.nature } else { '' }

    # 拼接 business_scope: 类别 | 性质 | 地址 | 网站 | 备注
    $parts = @()
    if ($org.category) { $parts += "[$($org.category)]" }
    if ($nature)        { $parts += $nature }
    if ($org.address)   { $parts += "地址:$($org.address)" }
    if ($org.website)   { $parts += "网站:$($org.website)" }
    if ($org.note)      { $parts += $org.note }
    if ($org.officeHours) { $parts += "办公时间:$($org.officeHours)" }
    if ($org.fax)       { $parts += "传真:$($org.fax)" }
    if ($org.email)     { $parts += "邮箱:$($org.email)" }
    $scope = &$esc ($parts -join "；")

    $sql = "INSERT INTO companies (name, contact, city, province, business_scope, established, status) VALUES ($name, $phone, $city, $prov, $scope, $est, 'approved') ON CONFLICT (name) DO UPDATE SET contact=EXCLUDED.contact, business_scope=EXCLUDED.business_scope, established=EXCLUDED.established, updated_at=NOW();"
    [void]$sb.AppendLine($sql)
}

[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- 验证导入")
[void]$sb.AppendLine("SELECT count(*) AS imported_count FROM companies WHERE province='重庆' AND city='重庆';")

$content = $sb.ToString()
$content | Out-File -FilePath $sqlPath -Encoding UTF8 -NoNewline
Write-Host "✅ 已生成: $sqlPath"
Write-Host "   共 $count 条 INSERT 语句（不含政策法规类）"
