import re, sys
sys.stdout.reconfigure(encoding='utf-8')
h=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()
for m in re.finditer(r'getTemplateSteps\(', h):
    start=max(0,m.start()-40)
    end=min(len(h),m.end()+60)
    ctx=h[start:end].replace('\n',' ').replace('\r','')
    print(f'{m.start()}: ...{ctx}...')
