import sys
f=open(r'D:\1kaifa\grsds\_check_all.js','r',encoding='utf-8').read()
lines=f.splitlines()
l=lines[6920]
print('Length:', len(l))

# Let me find ALL unescaped single quotes in this line
# An unescaped quote is one not preceded by backslash
escaped=0
for i,ch in enumerate(l):
    if ch == '\'':
        prev = l[i-1] if i>0 else ''
        if prev == '\\':
            escaped += 1
        else:
            ctx_s = max(0,i-20)
            ctx_e = min(len(l),i+20)
            ctx = l[ctx_s:ctx_e]
            print('Unescaped quote at {}: {}'.format(i, ctx))
print('Total quotes: {}, escaped: {}, unescaped: {}'.format(
    l.count("'"), escaped, l.count("'")-escaped))
