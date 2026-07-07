# Split index.html into modular structure
$ErrorActionPreference = "Stop"
$dir = "D:\1kaifa\grsds"

# Read all lines
$lines = Get-Content "$dir\index.html" -Encoding UTF8
$total = $lines.Length
Write-Output "Total lines: $total"

# Create subdirs
New-Item -ItemType Directory -Force -Path "$dir\css" | Out-Null
New-Item -ItemType Directory -Force -Path "$dir\js" | Out-Null

# === 1. Extract CSS ===
# First CSS block: lines 13-1176 (0-indexed: 12-1175)
# <style> is on line 13 (index 12), </style> is on line 1176 (index 1175)
# CSS content is everything between them: lines 13-1176, but strip the <style> and </style> tags
$css1 = @()
# line 13 (idx 12) = "<style>"
# lines 14-1175 (idx 13-1174) = CSS content
# line 1176 (idx 1175) = "</style>"
for($i=13; $i -lt 1175; $i++) {
    $css1 += $lines[$i]
}

# Second CSS block: lines 18013-18047 (0-indexed: 18012-18046)
# <style> on 18013, </style> on 18047, content is lines 18014-18046
$css2 = @()
for($i=18013; $i -lt 18046; $i++) {
    $css2 += $lines[$i]
}

# Combine CSS - skip any empty leading lines from css1
$cssCombined = @()
if($css1[0] -match '^\s*$') { 
    # remove leading blank lines
    $startIdx = 0
    while($startIdx -lt $css1.Count -and $css1[$startIdx] -match '^\s*$') { $startIdx++ }
    for($i=$startIdx; $i -lt $css1.Count; $i++) { $cssCombined += $css1[$i] }
} else {
    $cssCombined += $css1
}
$cssCombined += ""
$cssCombined += "/* ==== 追加样式 ==== */"
$cssCombined += $css2

# Write CSS file with BOM
$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines("$dir\css\app.css", $cssCombined, $utf8Bom)
Write-Output "Created css/app.css ($($cssCombined.Count) lines)"

# === 2. Extract JS ===
# JS content: lines 3240-17365 (0-indexed: 3239-17364)
# <script> starts on line 3239 (idx 3238, embedded with div), actually the <script> tag is part of line 3239
# JS content starts at line 3240 (idx 3239)
# </script> is on line 17366 (idx 17365)
# JS content is lines 3240-17365

# Config variables: lines 3240-3246 (idx 3239-3245)
# These are:
#   // Supabase
#   const SUPABASE_URL=...;
#   const SUPABASE_ANON_KEY=...;
#   // SUPABASE_SERVICE_KEY...
#   // 部署 admin-proxy...
#    const SUPAFUNC_BASE=...;
#   const sb=supabase.createClient(...);

$configLines = @()
for($i=3239; $i -le 3245; $i++) {
    $configLines += $lines[$i]
}
Write-Output "Config lines (3240-3246): $($configLines.Count)"

# JS body: lines 3247-17365 (idx 3246-17364)
$jsLines = @()
$jsHeader = @(
    "// === app.js — 模块化 JS, 从 index.html 提取 ===",
    "// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明",
    ""
)
$jsLines += $jsHeader
for($i=3246; $i -le 17364; $i++) {
    $jsLines += $lines[$i]
}

# Write JS file with BOM
[System.IO.File]::WriteAllLines("$dir\js\app.js", $jsLines, $utf8Bom)
Write-Output "Created js/app.js ($($jsLines.Count) lines)"

# === 3. Rebuild index.html ===
# Parts:
# 1. Lines 1-12 (head meta, CDN) — keep
# 2. Replace lines 13-1176 (first <style>...</style>) with <link rel="stylesheet" href="css/app.css">
# 3. Lines 1177-1180 (blank + baidu map + </head>) — keep
# 4. Lines 1181-3238 (body start through HTML views) — keep
# 5. Line 3239: strip <script> suffix, keep just the div
# 6. Add: config <script> block
# 7. Add: <script src="js/app.js"></script>
# 8. Lines 17367-18012 (modal HTML, after </script>) — keep
# 9. Delete lines 18013-18047 (second <style> block)
# 10. Lines 18048+ (</body>, </html>, etc.) — keep but fix the broken </html>

$newHtml = @()

# Part 1: lines 1-12
for($i=0; $i -lt 12; $i++) {
    $newHtml += $lines[$i]
}

# Part 2: replace CSS with link
$newHtml += '<link rel="stylesheet" href="css/app.css">'

# Part 3: lines 1177-1180 (blank lines + baidu map + </head>)
for($i=1176; $i -lt 1180; $i++) {
    $newHtml += $lines[$i]
}

# Part 4: lines 1181-3238
for($i=1180; $i -lt 3238; $i++) {
    $newHtml += $lines[$i]
}

# Part 5: line 3239 (script-loaded-check div + <script>) — strip the <script> part
$line3239 = $lines[3238]
$line3239_clean = $line3239 -replace '<script>$', ''
$newHtml += $line3239_clean

# Part 6: Config script block
$newHtml += "<script>"
$newHtml += $configLines
$newHtml += "</script>"

# Part 7: JS src reference
$newHtml += '<script src="js/app.js"></script>'

# Part 8: lines 17367-18012 (modal HTML after </script>)
for($i=17366; $i -lt 18012; $i++) {
    $newHtml += $lines[$i]
}

# Part 9: skip lines 18013-18047 (second <style>), continue from 18048
# Line 18048 (idx 18047) = "</body>"
# Line 18049 (idx 18048) = "</html" (broken, fix it)
for($i=18047; $i -lt $total; $i++) {
    $newHtml += $lines[$i]
}

# Fix the broken </html by replacing it
$lastIdx = $newHtml.Count - 1
# Check if the last meaningful line is malformed </html
for($i=$lastIdx; $i -ge 0; $i--) {
    if($newHtml[$i] -eq '</html' -or $newHtml[$i] -match '^</html$') {
        $newHtml[$i] = '</html>'
        break
    }
}

# Write rebuilt index.html with BOM
[System.IO.File]::WriteAllLines("$dir\index.html", $newHtml, $utf8Bom)
Write-Output "Rebuilt index.html ($($newHtml.Count) lines)"

Write-Output "=== DONE ==="
