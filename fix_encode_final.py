"""Convert index.html from UTF-16LE to UTF-8, then apply home-view fix."""
path = r'D:\1kaifa\grsds\index.html'

with open(path, 'rb') as f:
    data = f.read()

# Detect encoding
if data[:2] == b'\xff\xfe':
    enc = 'utf-16-le'
elif data[:2] == b'\xfe\xff':
    enc = 'utf-16-be'
else:
    enc = 'utf-8'

print(f'Detected encoding: {enc}')
print(f'Size: {len(data)} bytes')

# Decode
text = data.decode(enc)
print(f'Characters: {len(text)}')

# Apply home-view fix (393ee6c → cda78cb)
old = "document.getElementById('home-view').classList.add('hidden');"
new = "var hv=document.getElementById('home-view');if(hv)hv.classList.add('hidden');"
if old in text:
    text = text.replace(old, new)
    print('Applied home-view fix')
elif new in text:
    print('home-view fix already applied')
else:
    print('WARNING: home-view fix target NOT FOUND')

# Write as UTF-8 (no BOM)
out = text.encode('utf-8')
print(f'UTF-8 output size: {len(out)} bytes')

with open(path, 'wb') as f:
    f.write(out)

print('Done. Verifying...')
with open(path, 'rb') as f:
    v = f.read()
print(f'Verification: {len(v)} bytes, first 4: {v[:4].hex()}')
print(f'homm-view fix present: {"var hv=document.getElementById" in v.decode("utf-8")}')
corrupt = b'\xef\xbf\xbd\x3f'
print(f'No corruption: {v.count(corrupt) == 0}')
