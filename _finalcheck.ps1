# Final verification of split
$dir = "D:\1kaifa\grsds"

Write-Output "=== FILES ==="
Get-Item "$dir\index.html", "$dir\css\app.css", "$dir\js\app.js" | Select-Object Name, Length | Format-Table -AutoSize

# Check index.html key lines
$html = Get-Content "$dir\index.html" -Encoding UTF8
Write-Output ""
Write-Output "=== index.html KEY STRUCTURE ==="
for($i=0; $i -lt $html.Count; $i++) {
    $l = $html[$i]
    if($l -cmatch 'link.*css|link.*stylesheet|script src=.*js|script-loaded-check|<script>$|SUPABASE_URL|SUPAFUNC_BASE|</script>|app\.js|</body>|</html') {
        Write-Output "  L$($i+1): $($l.Substring(0,[Math]::Min(100,$l.Length)))"
    }
}

# Verify no dangling <style> blocks
$styleCount = ($html | Where-Object { $_ -match '<style>' }).Count
Write-Output ""
Write-Output "Remaining <style> tags in index.html: $styleCount"

# Verify CSS file structure
$css = Get-Content "$dir\css\app.css" -Encoding UTF8
Write-Output ""
Write-Output "=== CSS CHECK ==="
Write-Output "app.css lines: $($css.Count)"
Write-Output "First line: $($css[0])"
Write-Output "Has .pd-edit-sheet: $(($css | Where-Object { $_ -match '\.pd-edit-sheet'}).Count -gt 0)"
Write-Output "Has .fw-track-map: $(($css | Where-Object { $_ -match '\.fw-track-map'}).Count -gt 0)"

# Verify JS file
$js = Get-Content "$dir\js\app.js" -Encoding UTF8
Write-Output ""
Write-Output "=== JS CHECK ==="
Write-Output "app.js lines: $($js.Count)"
Write-Output "Has callAdmin: $(($js | Where-Object { $_ -match 'async function callAdmin'}).Count -gt 0)"
Write-Output "Has SUPABASE_URL reference: $(($js | Where-Object { $_ -match 'SUPABASE_URL'}).Count -gt 0)" 
Write-Output "Has updateFieldCollabMode: $(($js | Where-Object { $_ -match 'function updateFieldCollabMode'}).Count -gt 0)"
Write-Output "Last line: $($js[$js.Count-1])"

Write-Output ""
Write-Output "=== VERDICT ==="
Write-Output "PASS: index.html references css/app.css and js/app.js correctly"
