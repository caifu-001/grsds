$lines = Get-Content 'D:\1kaifa\grsds\index.html'
for($i=0;$i -lt $lines.Count;$i++) {
    $l = $lines[$i]
    if($l -match 'css/app.css|js/app.js|script-loaded-check|SUPABASE_URL|SUPAFUNC_BASE|config variables|\</body\>|\</html') {
        Write-Output "$($i+1): $l"
    }
}
# Also check the config script block area
Write-Output "=== Lines 1310-1330 ==="
for($i=1309;$i -lt 1330;$i++) {
    Write-Output "$($i+1): $($lines[$i])"
}
