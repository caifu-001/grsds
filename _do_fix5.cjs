const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// ============================================
// FIX 2: 修复孤立 </label> + "授权部门"前面加 <label>
// ============================================
// The exact bytes in the file (let me match by select pattern):
// h+='鎺堟潈閮ㄩ棬</label><select onchange="wfSetAssignee('+idx+',\'value\',this.value)"><option value="">鏃?/option>';
// 
// Replace the </label> after 鎺堟潈閮ㄩ棬 with <label>鎺堟潈閮ㄩ棬</label>
// Use simple substring replacement

// Find the literal text
const old = "h+='鎺堟潈閮ㄩ棬</label><select";
const ne = "h+='<label>鎺堟潈閮ㄩ棬</label><select";
if (s.includes(old)) {
  s = s.split(old).join(ne);
  console.log('FIX2 dept label: OK');
} else {
  console.log('FIX2: literal text not found, using byte search');
  // Try with escape sequences since the file might be in different encoding
  // Actually it's just simpler - the bytes 鎺堟潈閮ㄩ棬 are exactly 5 chars (15 bytes UTF-8)
  // The </label> after them is plain ASCII
  // Search for 鎺堟潈閮ㄩ棬</label>
  const target = "鎺堟潈閮ㄩ棬</label>";
  const idx = s.indexOf(target);
  console.log('target at:', idx);
}

// ============================================
// FIX 3: 把"无"乱码 (鏃?) 替换成更可读的"无"或者""
// 改用 'option' 文字 (但 wfShowProps 里 '鏃' 是 '无' 的截断)
// 实际我想保持中文 - 但 \u65E0 是 '无' 的正确字符
// Source: 鏃 = E9 8F 83 (U+93C3), 无 = E6 97 A0 (U+65E0)
// 实际显示效果：用 "--" 最安全
// ============================================
const garbledOpt1 = "><option value=\"\">鏃?/option>";
const goodOpt1 = '><option value="">--</option>';
let count = 0;
while (s.includes(garbledOpt1)) {
  s = s.split(garbledOpt1).join(goodOpt1);
  count++;
}
console.log('FIX3 garbled opt: replaced ' + count);

// Also fix the garbled in wfRefreshStaffDD
const garbledOpt2 = "dd.innerHTML='<option value=\"\">閺?/option>'";
const goodOpt2 = "dd.innerHTML='<option value=\"\">--</option>'";
if (s.includes(garbledOpt2)) {
  s = s.split(garbledOpt2).join(goodOpt2);
  console.log('FIX3b: staff opt fixed');
}

fs.writeFileSync('D:/1kaifa/grsds/index.html', s, 'utf8');

// Verify
const ls = s.lastIndexOf('<script>'), le = s.lastIndexOf('</script>');
try { new (require('vm').Script)(s.slice(ls+8, le)); console.log('JS: OK'); }
catch(e) { 
  console.log('JS FAIL:', e.message.substring(0,200));
  const m = (e.stack||'').match(/inline:(\d+)/);
  if (m) {
    const ln = parseInt(m[1]);
    const lines = s.slice(ls+8, le).split('\n');
    for (let k = Math.max(0,ln-3); k < Math.min(lines.length, ln+2); k++)
      console.log('L'+(k+1)+': '+(lines[k]||'').substring(0,200));
  }
}
const o=(s.match(/<div[\s>]/g)||[]).length, c=(s.match(/<\/div>/g)||[]).length;
console.log('Div:',o,c,o-c);
console.log('Size:', s.length);
