import sys
path = 'D:/1kaifa/grsds/index.html'
d = open(path, 'rb').read()
idx = d.find(b'BUILTIN_TYPES=[')
end = d.find(b'];', idx)
seg = d[idx:end+2]
print('Bytes at BUILTIN_TYPES:', seg[:80])
print('Hex of first 30:', seg[:30].hex())
# expected: 甲 = e7 94 b2
print('Byte 17-19 (first CJK after quote):', seg[17:20].hex())
# count corruption
print('EF BF BD 3F count:', d.count(b'\xef\xbf\xbd\x3f'))
print('EF BF BD count:', d.count(b'\xef\xbf\xbd'))
# search for 集成商 in UTF-8
target = '集成商'.encode('utf-8')
print('集成商 in file:', d.find(target))
# search for 甲
target = '甲方'.encode('utf-8')
idx2 = d.find(target)
print('甲方 at:', idx2)
if idx2 >= 0:
    print('Context:', d[idx2-10:idx2+30].hex())
