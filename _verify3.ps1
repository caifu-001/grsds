$bytes = [System.IO.File]::ReadAllBytes('D:\1kaifa\grsds\js\app.js')
# Skip BOM and read first 300 bytes, output as hex and string
$content = $bytes[3..300]
$hex = ($content | ForEach-Object { $_.ToString("X2") }) -join " "
Write-Output "Hex: $hex"
$str = [System.Text.Encoding]::UTF8.GetString($content)
# Output codepoints
for($i=0; $i -lt [Math]::Min(80, $str.Length); $i++) {
    $cp = [int][char]$str[$i]
    if($cp -gt 127) {
        Write-Output "  char $i : U+$($cp.ToString('X4'))"
    }
}
Write-Output "Full string: $str"
