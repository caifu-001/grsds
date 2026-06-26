import subprocess, re

# Get the HTML from the commit where fieldwork still exists
result = subprocess.run(
    ["git", "show", "0aec142:index.html"],
    capture_output=True, cwd=r"D:\1kaifa\grsds"
)
html = result.stdout.decode("utf-8", errors="replace")

# Extract fieldwork block
start_marker = "<!-- ========================================== 外勤管理"
idx = html.find(start_marker)
if idx == -1:
    start_marker = "<!-- 外勤管理"
    idx = html.find(start_marker)
if idx == -1:
    # brute force: find fieldwork-view and go back
    fwv = html.find('id="fieldwork-view"')
    # go back to comment start
    search_start = max(0, fwv - 200)
    idx = html.find("<!--", search_start)

print(f"Block starts at {idx}")
print(f"Context: {html[idx:idx+150]}")

# Track <div> depth to find closing </div> for fieldwork-view
depth = 0
i = idx
while i < len(html):
    if html[i:i+4] == '<div':
        depth += 1
        i += 4
    elif html[i:i+6] == '</div>':
        depth -= 1
        if depth == 0:
            break
        i += 6
    else:
        i += 1

block = html[idx:i]
print(f"Block ends at {i}, length {len(block)}")
print(f"Last 100: {block[-100:]}")

# Save for use
with open(r"D:\1kaifa\grsds\_fw_block.txt", "w", encoding="utf-8") as f:
    f.write(block)
print("Saved _fw_block.txt")
