// Syntax validation for index.html - checks JS for parse errors
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'D:\\1kaifa\\grsds\\index.html';
const content = fs.readFileSync(filePath, 'utf8');
console.log('File size: ' + content.length + ' bytes');

// Extract all script content between <script> tags
const scriptPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let scriptContent = '';
let match;
let scriptCount = 0;

while ((match = scriptPattern.exec(content)) !== null) {
  scriptCount++;
  scriptContent += match[1] + '\n;\n';
}

console.log('Found ' + scriptCount + ' script blocks');
console.log('Total script size: ' + scriptContent.length + ' bytes');

// Try to parse
try {
  // Use Function constructor to check for syntax errors
  new Function(scriptContent);
  console.log('✓ JavaScript syntax is VALID - no parse errors');
} catch (e) {
  console.error('✗ JavaScript syntax ERROR:');
  console.error('  ' + e.message);
  // Extract line number info
  if (e.stack) {
    const lines = e.stack.split('\n');
    console.error('  Stack:');
    for (const line of lines.slice(0, 5)) {
      console.error('    ' + line.trim());
    }
  }
  process.exit(1);
}

// Check for common issues
const divCount = (content.match(/<div\b/gi) || []).length;
const divCloseCount = (content.match(/<\/div>/gi) || []).length;
console.log('HTML divs: open=' + divCount + ' close=' + divCloseCount + ' diff=' + (divCount - divCloseCount));

if (divCount !== divCloseCount) {
  console.warn('⚠️ WARNING: Unbalanced div tags detected!');
} else {
  console.log('✓ HTML div tags balanced');
}

// Verify no double-patched issues
const wfPanelEditorCount = (content.match(/wb-panel-editor/g) || []).length;
const saveStepNoteCount = (content.match(/function saveStepNote/g) || []).length;
console.log('wb-panel-editor occurrences: ' + wfPanelEditorCount);
console.log('function saveStepNote occurrences: ' + saveStepNoteCount);

console.log('\n✓ Syntax validation complete');
