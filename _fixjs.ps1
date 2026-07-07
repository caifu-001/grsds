$ErrorActionPreference = "Stop"

# Read the original index.html (which is still intact, we rebuilt it already)
$origPath = "D:\1kaifa\grsds\index.html"
$origLines = [System.IO.File]::ReadAllLines($origPath, [System.Text.UTF8Encoding]::new($true))

Write-Output "Rebuilt index.html: $($origLines.Length) lines"

# The original raw file still needed for JS extraction.
# Actually we already rebuilt index.html, so the original JS is gone from index.html.
# Let me read the original JS from the current app.js (minus the garbled header)
# The JS body (lines 4-14121) is correct since it was a direct copy.

# Better approach: rewrite app.js entirely
# Read current app.js, skip the garbled first 4 lines (header+blank), keep the rest
$appjsLines = [System.IO.File]::ReadAllLines("D:\1kaifa\grsds\js\app.js", [System.Text.UTF8Encoding]::new($true))
Write-Output "app.js current: $($appjsLines.Length) lines"

# Build new content
$newJS = New-Object System.Collections.ArrayList
[void]$newJS.Add("// === app.js — 模块化 JS，从 index.html 提取 ===")
[void]$newJS.Add("// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明")
[void]$newJS.Add("")

# Skip first 4 lines of current app.js (BOM line + garbled header line1 + garbled header line2 + blank line3)
# Line 0 = BOM line: "// === app.js ..." (garbled)
# Line 1 = "// ..." (garbled)  
# Line 2 = ""
# Line 3 = ""
# Line 4 = "// === 安全管理 ..." (correct)
for($i=4; $i -lt $appjsLines.Length; $i++) {
    [void]$newJS.Add($appjsLines[$i])
}

$utf8Bom = New-Object System.Text.UTF8Encoding $true
[System.IO.File]::WriteAllLines("D:\1kaifa\grsds\js\app.js", $newJS, $utf8Bom)
Write-Output "Rewrote app.js: $($newJS.Count) lines"

# Verify header
$bytes = [System.IO.File]::ReadAllBytes("D:\1kaifa\grsds\js\app.js")
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text -split "\r?\n"
for($i=0; $i -lt [Math]::Min(5, $lines.Count); $i++) {
    Write-Output "  line $($i+1): $($lines[$i])"
}
