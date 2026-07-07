$bytes = [System.IO.File]::ReadAllBytes('D:\1kaifa\grsds\js\app.js')
Write-Output ("First 4 bytes: " + [System.BitConverter]::ToString($bytes[0..3]))
$text = [System.Text.Encoding]::UTF8.GetString($bytes)
$lines = $text -split "`n"
Write-Output "Line 1: $($lines[0])"
Write-Output "Line 2: $($lines[1])"
Write-Output "Line 3: $($lines[2])"
