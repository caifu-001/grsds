// Check JS syntax line by line to find all errors
const fs = require('fs');
const code = fs.readFileSync('_check_all.js', 'utf8');
const lines = code.split('\n');

// Try to find problematic single-quoted strings
const issues = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for h+=' pattern - these build HTML strings
    if (line.includes("h+='") && !line.trim().startsWith('//')) {
        // Count single quotes loosely
        let inStr = false;
        let quotePos = [];
        for (let j = 0; j < line.length; j++) {
            if (line[j] === "'" && (j === 0 || line[j-1] !== '\\')) {
                quotePos.push(j);
            }
        }
        // If odd number of quotes, likely an issue
        // But actually, h+='string'+expr+'string' has odd too...
    }
}

// Better approach: use acorn or just run node --check and capture
try {
    const { execSync } = require('child_process');
    execSync('node --check _check_all.js', {encoding:'utf8'});
    console.log('OK');
} catch (e) {
    const msg = e.stderr || e.message;
    // Parse line number from output
    const match = msg.match(/_check_all\.js:(\d+)/);
    if (match) {
        const lineNum = parseInt(match[1]);
        console.log('Error at line ' + lineNum);
        console.log('Code: ' + lines[lineNum-1].substring(0, 200));
    } else {
        console.log('Error: ' + msg.split('\n').slice(0,5).join('\n'));
    }
}
