$lines = Get-Content 'D:\1kaifa\grsds\index.html'
$total = $lines.Length
Write-Output "Total lines: $total"

# Find </script> between 3230 and 17370
$firstEndScript = -1
for($i=3230; $i -lt 17370; $i++) {
    if($lines[$i] -match '</script>') {
        Write-Output "First main </script> at line $($i+1): $($lines[$i])"
        $firstEndScript = $i+1
        break
    }
}

# Find <script> near 3230-3250
for($i=3230; $i -lt 3250; $i++) {
    if($lines[$i] -match '<script>') {
        Write-Output "Main <script> at line $($i+1): $($lines[$i])"
        break
    }
}

# Find second <style> block
$secondStyleStart = -1
for($i=17360; $i -lt $total; $i++) {
    if($lines[$i] -match '<style>') {
        Write-Output "Second <style> at line $($i+1): $($lines[$i])"
        $secondStyleStart = $i+1
        break
    }
}
for($i=$secondStyleStart; $i -lt $total; $i++) {
    if($lines[$i] -match '</style>') {
        Write-Output "Second </style> at line $($i+1): $($lines[$i])"
        break
    }
}

# Show lines 1175-1182
Write-Output "=== Lines 1175-1182 ==="
for($i=1174; $i -lt 1182; $i++) {
    Write-Output "$($i+1): $($lines[$i])"
}
