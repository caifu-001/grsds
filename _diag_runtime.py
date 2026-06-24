import sys
sys.stdout.reconfigure(encoding='utf-8')

with open(r'D:\1kaifa\grsds\_online_raw.html','r',encoding='utf-8') as f:
    h = f.read()

# === CHECK: Does openMy/closeMy manipulate main-screen? ===
# Find openMy
omy = h.find('function openMy')
if omy > 0:
    d = 0; s = False
    for i in range(omy, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: omy_end = i + 1; break
    fn_omy = h[omy:omy_end]
    print(f"=== openMy ({len(fn_omy)} bytes) ===")
    for line in fn_omy.split('\n'):
        s_line = line.strip()
        if s_line and len(s_line) < 200:
            print(f"  {s_line}")

# Find closeMy
cmy = h.find('function closeMy')
if cmy > 0:
    d = 0; s = False
    for i in range(cmy, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: cmy_end = i + 1; break
    fn_cmy = h[cmy:cmy_end]
    print(f"\n=== closeMy ({len(fn_cmy)} bytes) ===")
    for line in fn_cmy.split('\n'):
        s_line = line.strip()
        if s_line and len(s_line) < 200:
            print(f"  {s_line}")

# Find openSettings
os = h.find('function openSettings')
if os > 0:
    d = 0; s = False
    for i in range(os, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: os_end = i + 1; break
    fn_os = h[os:os_end]
    print(f"\n=== openSettings ({len(fn_os)} bytes) ===")
    for line in fn_os.split('\n'):
        s_line = line.strip()
        if s_line and len(s_line) < 200:
            print(f"  {s_line}")

# Find closeSettings
cs = h.find('function closeSettings')
if cs > 0:
    d = 0; s = False
    for i in range(cs, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: cs_end = i + 1; break
    fn_cs = h[cs:cs_end]
    print(f"\n=== closeSettings ({len(fn_cs)} bytes) ===")
    for line in fn_cs.split('\n'):
        s_line = line.strip()
        if s_line and len(s_line) < 200:
            print(f"  {s_line}")

# === CHECK: switchAdminTab implementation ===
sat = h.find('function switchAdminTab')
if sat > 0:
    d = 0; s = False
    for i in range(sat, len(h)):
        if h[i] == '{': d += 1; s = True
        elif h[i] == '}': d -= 1
        if s and d == 0: sat_end = i + 1; break
    fn_sat = h[sat:sat_end]
    print(f"\n=== switchAdminTab ({len(fn_sat)} bytes) ===")
    for line in fn_sat.split('\n'):
        s_line = line.strip()
        if s_line and len(s_line) < 200:
            print(f"  {s_line}")
