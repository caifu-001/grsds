path = r'D:\1kaifa\grsds\index.html'
with open(path, 'r', encoding='latin1') as f:
    content = f.read()

# Fix 1: remove broken wb-custom-params (leave nothing)
content = content.replace(
    '             <div id="wb-custom-params" class="hidden"></div>\r\n        <!--\r\nStep 6: Training -->',
    '        <!-- Step 6: Training -->'
)

# Fix 2: insert wb-custom-params in correct place - inside wb-panel-editor, before its closing </div>
# The structure is: ...id="wb-save-status"></span>\r\n     </div>\r\n    </div>\r\n\r\n        <!-- Step 6: Training -->
# The first </div> closes action-buttons div, the second </div> closes wb-panel-editor
old2 = '      <span style="font-size:11px;color:var(--text3)" id="wb-save-status"></span>\r\n     </div>\r\n    </div>\r\n\r\n        <!-- Step 6: Training -->'
new2 = '      <span style="font-size:11px;color:var(--text3)" id="wb-save-status"></span>\r\n     </div>\r\n     <div id="wb-custom-params" class="hidden"></div>\r\n    </div>\r\n\r\n        <!-- Step 6: Training -->'
if old2 in content:
    content = content.replace(old2, new2)
    print('Fix 2: OK')
else:
    print('Fix 2: NOT FOUND')
    idx = content.find('wb-save-status')
    print(repr(content[idx-100:idx+300]))

# Fix 3: verify the earlier edit to `case 'editor':` contains params rendering
idx3 = content.find('wb-custom-params')
if idx3 > 0:
    print(f'wb-custom-params at {idx3}')
    print(repr(content[idx3-100:idx3+200]))

with open(path, 'w', encoding='latin1') as f:
    f.write(content)
print('Saved')
