# XSS audit: find innerHTML lines that may have unescaped user data
$c = Get-Content "D:\1kaifa\grsds\index.html" -Raw
$lines = $c -split "`n"

$risky = @()
$safe = @()

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    if ($line -notmatch '\.innerHTML\s*=') { continue }
    $ln = $i + 1
    $trimmed = $line.Trim()
    
    # Already using h() or escHtml() or is textContent?
    if ($trimmed -match '\bh\(|escHtml\(|textContent') {
        $safe += "[SAFE-escaping] Ln$ln"
        continue
    }
    
    # Check if this line has variable interpolation via + or ${}
    $hasConcat = $trimmed -match '\+[^=+]'
    $hasTplLit = $trimmed -match '\$\{'
    
    if (-not $hasConcat -and -not $hasTplLit) {
        $safe += "[SAFE-static] Ln$ln"
        continue
    }
    
    # Check if concatenated vars are numeric-only
    # If line adds .length, .count, parseFloat, format vars - likely safe numbers
    if ($trimmed -match '\.length\b|\.count\b|parseFloat|parseInt|fmtNum|toFixed|\.size\b') {
        $safe += "[SAFE-numeric] Ln$ln"
        continue
    }
    
    # Check for JSON.stringify or String() wrapping
    if ($trimmed -match '\bJSON\.stringify\(|\bString\(') {
        $safe += "[SAFE-stringify] Ln$ln"
        continue
    }
    
    $risky += "Line $ln`: $($trimmed.Substring(0,[Math]::Min(200,$trimmed.Length)))"
}

Write-Output "=== SAFE: $($safe.Count) ==="
$safe | ForEach-Object { Write-Output $_ }
Write-Output ""
Write-Output "=== RISKY: $($risky.Count) ==="
$risky | ForEach-Object { Write-Output $_ }
