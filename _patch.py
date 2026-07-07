import re

with open(r"D:\1kaifa\grsds\index.html", "r", encoding="utf-8") as f:
    c = f.read()

# 1. supplier modal HTML: add compliance textarea after notes input
# The HTML is stored as a JS string with \uXXXX escapes
old1 = 'id="sup-notes" placeholder="\\u53ef\\u9009"></div></div><div class="modal-actions">'
new1 = 'id="sup-notes" placeholder="\\u53ef\\u9009"></div><div class="form-group"><label>\\u5408\\u89c4\\u8981\\u6c42</label><textarea id="sup-compliance" rows="2" placeholder="\\u8d44\\u8d28\\u8bc1\\u4e66\\u3001\\u73af\\u4fdd\\u6807\\u51c6\\u3001ISO\\u8ba4\\u8bc1\\u7b49..."></textarea></div></div><div class="modal-actions">'

if old1 in c:
    c = c.replace(old1, new1)
    print("replacement 1 OK")
else:
    # Try with only single backslash (the literal in the file)
    old1b = 'id="sup-notes" placeholder="\u53ef\u9009"></div></div><div class="modal-actions">'
    new1b = 'id="sup-notes" placeholder="\u53ef\u9009"></div><div class="form-group"><label>\u5408\u89c4\u8981\u6c42</label><textarea id="sup-compliance" rows="2" placeholder="\u8d44\u8d28\u8bc1\u4e66\u3001\u73af\u4fdd\u6807\u51c6\u3001ISO\u8ba4\u8bc1\u7b49..."></textarea></div></div><div class="modal-actions">'
    if old1b in c:
        c = c.replace(old1b, new1b)
        print("replacement 1 OK (alt)")
    else:
        print("replacement 1 FAILED - neither pattern found")

# 2. saveSupplier obj: add compliance_requirements
old2 = "notes:document.getElementById('sup-notes').value.trim()||null,"
new2 = "notes:document.getElementById('sup-notes').value.trim()||null,\n    compliance_requirements:document.getElementById('sup-compliance').value.trim()||null,"
c = c.replace(old2, new2)
print("replacement 2 OK")

# 3. openSupplierForm: backfill compliance
old3 = "document.getElementById('sup-notes').value=sp?(sp.notes||''):'';"
new3 = "document.getElementById('sup-notes').value=sp?(sp.notes||''):'';\n  document.getElementById('sup-compliance').value=sp?(sp.compliance_requirements||''):'';"
c = c.replace(old3, new3)
print("replacement 3 OK")

# 4. product modal: insert commission_rate row between selling_price row and specs
old4 = """  <div class="form-row">
   <div class="form-group"><label>成本价(元)</label><input id="pfm-cost" type="number" step="0.01" placeholder="0"></div>
   <div class="form-group"><label>销售价(元)</label><input id="pfm-price" type="number" step="0.01" placeholder="0"></div>
  </div>
  <div class="form-group"><label>规格参数</label>"""
new4 = """  <div class="form-row">
   <div class="form-group"><label>成本价(元)</label><input id="pfm-cost" type="number" step="0.01" placeholder="0"></div>
   <div class="form-group"><label>销售价(元)</label><input id="pfm-price" type="number" step="0.01" placeholder="0"></div>
  </div>
  <div class="form-row">
   <div class="form-group"><label>佣金比例(%)</label><input id="pfm-commission-rate" type="number" step="0.01" min="0" max="100" placeholder="0"></div>
  </div>
  <div class="form-group"><label>规格参数</label>"""
c = c.replace(old4, new4)
print("replacement 4 OK")

with open(r"D:\1kaifa\grsds\index.html", "w", encoding="utf-8") as f:
    f.write(c)

print("all done")
