const fs = require('fs');
const { execSync } = require('child_process');

let code = fs.readFileSync('_check_all.js', 'utf8');
let lines = code.split('\n');
let fixed = 0;
let maxFixes = 50;

while (maxFixes-- > 0) {
    try {
        execSync('node --check _check_all.js', {encoding:'utf8', stdio:'pipe'});
        console.log('All syntax errors fixed (' + fixed + ' total fixes)');
        process.exit(0);
    } catch (e) {
        const msg = (e.stderr || e.message || '').toString();
        const match = msg.match(/_check_all\.js:(\d+)/);
        if (!match) break;
        
        const lineNum = parseInt(match[1]);
        const line = lines[lineNum - 1];
        
        // Find the problematic pattern
        // Pattern: single-quotes inside single-quoted strings in h+= lines
        // e.g., this.closest('.modal-overlay') -> this.closest(\'.modal-overlay\')
        
        // Find unescaped single quotes inside onclick handlers in h+='...' strings
        let fixed2 = false;
        
        // Pattern 1: 'text'.method() inside h+='...'
        // Change .closest('.X') to .closest(\'.X\') inside single-quoted strings
        const pattern1 = /(h\+='[^']*[^.])\.([a-zA-Z_]+)\('([^']*)'\)/g;
        const newLine = line.replace(pattern1, function(m, prefix, method, arg) {
            fixed2 = true;
            return prefix + '.' + method + '("'+arg+'")';
        });
        
        if (fixed2) {
            lines[lineNum - 1] = newLine;
            fixed++;
            console.log('Fixed line ' + lineNum + ': ' + method_hint(line));
            code = lines.join('\n');
            fs.writeFileSync('_check_all.js', code, 'utf8');
            continue;
        }
        
        // If we can't auto-fix, print the error and stop
        console.log('Cannot auto-fix line ' + lineNum + ':');
        console.log(line.substring(0, 300));
        break;
    }
}

function method_hint(line) {
    const m = line.match(/\.([a-zA-Z_]+)\('([^']+)'\)/);
    return m ? m[1] + '(' + m[2] + ')' : line.substring(0, 80);
}
