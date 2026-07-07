const fs = require('fs');
const path = 'D:\\1kaifa\\grsds\\js\\app.js';

// Read current file
const buf = fs.readFileSync(path);
const text = buf.toString('utf8');

// The first correct JS line starts with "// === 安全管理"
const idx = text.indexOf('// === 安全管理');
console.log('Found real JS at offset:', idx);

if (idx >= 0) {
    const header = '// === app.js — 模块化 JS，从 index.html 提取 ===\r\n// 全局变量 (SUPABASE_URL, SUPABASE_ANON_KEY, SUPAFUNC_BASE) 已通过 HTML 中的 <script> 标签设置，此文件无需重复声明\r\n\r\n';
    const newContent = '\ufeff' + header + text.substring(idx);
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('Fixed! Wrote', Buffer.byteLength(newContent, 'utf8'), 'bytes');
    
    // Verify first 5 lines
    const verify = fs.readFileSync(path, 'utf8');
    const lines = verify.split('\n');
    for (let i = 0; i < 5; i++) {
        console.log('Line', i + 1, ':', lines[i]);
    }
} else {
    console.log('ERROR: Could not find "// === 安全管理"');
}
