$ErrorActionPreference = "Stop"

# Read original index.html
$lines = Get-Content "D:\1kaifa\grsds\index.html" -Encoding UTF8

# Find js/app.js to check its line count
$jsLines = Get-Content "D:\1kaifa\grsds\js\app.js" -Encoding UTF8
Write-Output "app.js has $($jsLines.Count) lines"

# Check the garbled header
Write-Output "First 5 lines:"
for($i=0; $i -lt [Math]::Min(5, $jsLines.Count); $i++) {
    $codePoints = ""
    foreach($ch in $jsLines[$i].ToCharArray()) {
        $cp = [int]$ch
        if($cp -gt 127) { $codePoints += "U+$($cp.ToString('X4')) " }
    }
    Write-Output "  line $($i+1): $($jsLines[$i].Substring(0, [Math]::Min(60, $jsLines[$i].Length)))"
    if($codePoints) { Write-Output "    non-ASCII: $codePoints" }
}

# Check from the original source - what lines 3239-3245 (config) look like
Write-Output ""
Write-Output "Config lines in rebuilt index.html:"
for($i=2076; $i -lt 2088; $i++) {
    Write-Output "  line $($i+1): $($lines[$i])"
}

# Check if the bulk of app.js (after header) is correct
Write-Output ""
Write-Output "app.js lines 4-8 (first JS code):"
for($i=3; $i -lt [Math]::Min(8, $jsLines.Count); $i++) {
    $line = $jsLines[$i]
    if($line.Length -gt 0) {
        Write-Output "  line $($i+1): $($line.Substring(0, [Math]::Min(80, $line.Length)))"
    }
}
