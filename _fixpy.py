import sys

# Read current app.js
with open(r"D:\1kaifa\grsds\js\app.js", "rb") as f:
    data = f.read()

# Skip BOM and find the actual JS code start (line 5 = "// === 安全管理...")
# The first 4 lines after BOM are garbled header
# Let's find "// === 安全管理" which is the first correct line
idx = data.find(b"// === \xe5\xae\x89\xe5\x85\xa8")  # "安全管理" in UTF-8
if idx < 0:
    # Try wider search
    idx = data.find(b"// === ", 50)
    print(f"Found at byte offset {idx}: {data[idx:idx+60]}")
else:
    print(f"Found at byte offset {idx}: {data[idx:idx+60]}")
