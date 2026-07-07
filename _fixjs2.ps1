# Fix app.js header by replacing garbled bytes with correct UTF-8
Add-Type -AssemblyName System.Text
$path = "D:\1kaifa\grsds\js\app.js"

# Read all bytes
$allBytes = [System.IO.File]::ReadAllBytes($path)

# Find where the real JS starts: locate "// === 安全管理" (correct part)
# Search for the UTF-8 sequence of "// === "
$searchStart = [System.Text.Encoding]::UTF8.GetBytes("// === ")
$startIdx = -1
for($i=0; $i -lt $allBytes.Length - $searchStart.Length; $i++) {
    $match = $true
    for($j=0; $j -lt $searchStart.Length; $j++) {
        if($allBytes[$i+$j] -ne $searchStart[$j]) { $match = $false; break }
    }
    if($match) {
        # Check if the next bytes are "安全管理" to confirm it's the JS body start
        $next = [System.Text.Encoding]::UTF8.GetString($allBytes[$i..[Math]::Min($i+20, $allBytes.Length-1)])
        if($next -match "// === .*API") {
            $startIdx = $i
            break
        }
    }
}

Write-Output "JS body starts at byte: $startIdx"
Write-Output "Bytes at that position: $([System.BitConverter]::ToString($allBytes[$startIdx..[Math]::Min($startIdx+40, $allBytes.Length-1)]))"

# Build correct header
$headerBOM = [byte[]](0xEF, 0xBB, 0xBF)
$headerText = "// === app.js — 模块化 JS，从 index.html 提取 ===" + "`r`n" + "// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明" + "`r`n" + "`r`n"
$headerBytes = [System.Text.Encoding]::UTF8.GetBytes($headerText)

# Combine: BOM + header + rest of file from startIdx
$jsBodyBytes = $allBytes[$startIdx..($allBytes.Length-1)]
$output = New-Object System.Collections.ArrayList
foreach($b in $headerBOM) { [void]$output.Add($b) }
foreach($b in $headerBytes) { [void]$output.Add($b) }
foreach($b in $jsBodyBytes) { [void]$output.Add($b) }

[System.IO.File]::WriteAllBytes($path, $output.ToArray())
Write-Output "Written $($output.Count) bytes"

# Verify
$verify = [System.IO.File]::ReadAllBytes($path)
$txt = [System.Text.Encoding]::UTF8.GetString($verify)
$vlines = $txt -split "`r?`n"
for($i=0; $i -lt [Math]::Min(6, $vlines.Count); $i++) {
    Write-Output "Line $($i+1): $($vlines[$i])"
}
