"""Fix corrupted CJK characters in BUILTIN_TYPES const."""
path = r'D:\1kaifa\grsds\index.html'

with open(path, 'rb') as f:
    data = f.read()

# Corrupted pattern: valid 2-CJK + EF BF BD 3F (�?) instead of the 3rd CJK char
# Each corruption is 10 bytes replacing what should be 9 bytes (3 CJK chars × 3 bytes)
# Actually looking at it: 2 valid chars (6 bytes) + EF BF BD 3F (4 bytes) replaces 3 chars (9 bytes)
# That's 10 bytes vs 9 bytes - byte length changes!

# The corruptions in BUILTIN_TYPES:
# '集成商' corrupted: E9 9B 86 E6 88 90 EF BF BD 3F -> should be E9 9B 86 E6 88 90 E5 95 86
# '设计院' corrupted: E8 AE BE E8 AE A1 EF BF BD 3F -> should be E8 AE BE E8 AE A1 E9 99 A2  
# '运营商' corrupted: E8 BF 90 E8 90 A5 EF BF BD 3F -> should be E8 BF 90 E8 90 A5 E5 95 86
# '国央企' corrupted: E5 9B BD E5 A4 AE EF BF BD 3F -> should be E5 9B BD E5 A4 AE E4 BC 81
# '供应商' corrupted: E4 BE 9B E5 BA 94 EF BF BD 3F -> should be E4 BE 9B E5 BA 94 E5 95 86

# The problem: these are different byte lengths (10 vs 9), so we can't just replace in-place
# without shifting offsets. Need a smarter approach.
# 
# Wait - let me check what's ACTUALLY at these positions by looking for the whole line.

# Find the BUILTIN_TYPES line
idx = data.find(b"BUILTIN_TYPES=[")
if idx < 0:
    print("BUILTIN_TYPES not found!")
    exit(1)

# Find the complete line (ends with ];
line_end = data.find(b"];", idx)
if line_end < 0:
    print("Could not find end of BUILTIN_TYPES")
    exit(1)

# Extract the line
line = data[idx:line_end+2]
print(f"Found BUILTIN_TYPES at offset {idx}, ends at {line_end+2}")
print(f"Line bytes: {line}")

# The correct value
correct =  "const BUILTIN_TYPES=['甲方','集成商','设计院','运营商','国央企','党政','厂家','制造业','军队','司法','教育','医疗','供应商'];"
correct_bytes = correct.encode('utf-8')

print(f"Correct: {correct_bytes}")

# Replace in the file
data = data[:idx] + correct_bytes + data[line_end+2:]

with open(path, 'wb') as f:
    f.write(data)

print("Fixed BUILTIN_TYPES line. Verifying...")

# Verify
with open(path, 'rb') as f:
    data2 = f.read()
v_idx = data2.find(b"BUILTIN_TYPES=[")
v_end = data2.find(b"];", v_idx)
print(f"Verification: {data2[v_idx:v_end+2]}")
