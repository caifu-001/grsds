import sys,io
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
html=open(r'D:\1kaifa\grsds\index.html','rb').read().decode('utf-8')
lines=html.splitlines()

# Find insertion points
for i,l in enumerate(lines):
    # Topbar tabs ending 
    if 'id="tab-reports"' in l:
        print(f'TOP TAB: L{i+1}: {l.strip()[:160]}')
        print(f'  NEXT: L{i+2}: {lines[i+1].strip()[:160]}')
    # leads-view end
    if 'id="leads-view"' in l and 'hidden' in l:
        print(f'LEADS VIEW: L{i+1}: {l.strip()[:160]}')
        # Show next few lines
        for j in range(i+1, min(i+5, len(lines))):
            print(f'  L{j+1}: {lines[j].strip()[:160]}')
    # switchTab function end (before other functions)
    if 'function loadDashboard' in l or 'function loadClients' in l:
        print(f'AFTER switchTab: L{i+1}: {l.strip()[:160]}')
        break
