const fs = require('fs');
const s = fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');
const ss = s.indexOf('<script>');
const js = s.slice(ss + 8, s.indexOf('</script>', ss));
try {
  new Function(js);
  console.log('JS: OK');
} catch(e) {
  console.log('JS error:', e.message.slice(0, 120));
}
const d = (s.match(/<div\b/g) || []).length;
const c = (s.match(/<\/div>/g) || []).length;
console.log('Div:', d, c, d - c);
