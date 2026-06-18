import sys,io; sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

# Find the exact problematic line
idx = f.find("tags:'{'")
if idx > 0:
    # Extract the full line
    end_idx = f.find('\n', idx)
    line = f[idx:end_idx]
    print('Line:', line)
    
    # Replace with JSON.stringify
    # The line is: tags:'{'+tags.map(function(t){return'"'+t.replace(/"/g,'\\"')+'"'}).join(',')+'}',
    # We need: tags:JSON.stringify(tags),
    f = f.replace(line, '    tags:JSON.stringify(tags),')
    print('Replaced')

    # Check if there's another occurrence
    after = f.find("tags:'{'") 
    if after >= 0:
        print('SECOND occurrence found, replacing again')
        end_idx2 = f.find('\n', after)
        line2 = f[after:end_idx2]
        f = f.replace(line2, '    tags:JSON.stringify(tags),')
else:
    print('Not found with single quotes, trying double quotes')
    idx2 = f.find('tags:\'{\'+')
    if idx2 > 0:
        print('Found at', idx2)
        # Use a regex approach 
        import re
        f = re.sub(r"tags:\s*'\{'\+tags\.map\(function\(t\)\{return'\"'\+t\.replace\(/\"/g,'\\\\\"'\)\+'\"'\}\)\.join\(','\)\+'\}'", 'tags:JSON.stringify(tags)', f)
        print('Regex replaced')

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as fh:
    fh.write(f)

# Verify
import re as re_m
scripts = re_m.findall(r'<script[^>]*>(.*?)</script>', f, re_m.DOTALL)
total = 0
for idx_s, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        print(f'Script {idx_s}: diff={d}')
        total += d
print(f'Brace diff: {total}')
