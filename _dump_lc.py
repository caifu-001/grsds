import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

idx = h.find('async function loadClients')
with open(r'D:\1kaifa\grsds\_lc.txt','w',encoding='utf-8') as f:
    for i, line in enumerate(h[idx:idx+2000].split('\n')[:35]):
        f.write(f'{i}: {line.strip()[:180]}\n')
print("Done")
