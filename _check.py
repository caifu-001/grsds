import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

c = open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8-sig").read()

print("h(m) refs:", c.count("+h(m)+"))
print("h(u) refs:", c.count("+h(u"))
print("JS braces:", c[c.find("<script>"):c.rfind("</script>")].count("{"), "==", c[c.find("<script>"):c.rfind("</script>")].count("}"))
