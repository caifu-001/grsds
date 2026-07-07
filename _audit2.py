import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read().replace("\r\n", "\n")

# Print the full refreshScoutingCompare function to understand current state
idx = c.find("function refreshScoutingCompare")
end = c.find("\nfunction ", idx + 30)
print(c[idx:end])
