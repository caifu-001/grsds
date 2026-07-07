import subprocess

result = subprocess.run(
    ['d:/Program Files/Git/cmd/git.exe', '-C', 'D:/1kaifa/grsds', 'cat-file', 'blob', '896f7bd:index.html'],
    capture_output=True
)
data = result.stdout
corruptions = data.count(b'\xef\xbf\xbd\x3f')
text = data.decode('utf-8')
print('896f7bd: {} bytes, corruptions={}'.format(len(data), corruptions))
print('集成商 in text: {}'.format('集成商' in text))
print('home-view in text: {}'.format('home-view' in text))
old = "document.getElementById('home-view').classList.add('hidden');"
print('home-view fix needed: {}'.format(old in text))

# Apply fix
if old in text:
    new = "var hv=document.getElementById('home-view');if(hv)hv.classList.add('hidden');"
    text = text.replace(old, new)
    print('Applied home-view fix')

out = text.encode('utf-8')
with open('D:/1kaifa/grsds/index.html', 'wb') as f:
    f.write(out)
print('Written {} bytes'.format(len(out)))

# verify
v = open('D:/1kaifa/grsds/index.html', 'rb').read()
corr = b'\xef\xbf\xbd\x3f'
print('Verify corruptions: {}, size: {}'.format(v.count(corr), len(v)))
print('集成商 present: {}'.format('集成商'.encode('utf-8') in v))
