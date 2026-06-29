const fs = require('fs');
let s = fs.readFileSync('D:/1kaifa/grsds/index.html', 'utf8');

// Find the exact "指定负责人" label + department dropdown in wfShowProps
const marker = '鎸囧畾璐熻矗浜?/label>';
const idx = s.indexOf(marker);
if (idx < 0) { console.log('marker not found'); process.exit(1); }

// Find 授权部门 dropdown with hardcoded wfSetAssignee(2
const pattern = /鎺堟潈閮ㄩ棨<\/label><select onchange="wfSetAssignee\(2,'value'[^"]*\)">/;
const match = s.slice(idx, idx + 500).match(pattern);
if (!match) { console.log('dropdown pattern not found'); process.exit(1); }

const fullMatch = s.slice(idx + match.index, idx + match.index + match[0].length);
console.log('Found exact:', fullMatch);
console.log('Context:', s.slice(idx + match.index - 30, idx + match.index + 300).substring(0, 200));
