const s = require('fs').readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Check home-view block
const hv = s.indexOf("id='home-view'") >= 0 ? 'home-view' : (s.indexOf('id="home-view"') >= 0 ? "home-view" : "NOT FOUND");
console.log("home-view:", hv);

// Check tab-home button
const th = s.indexOf("id='tab-home'") >= 0 ? 'tab-home' : (s.indexOf('id=\"tab-home\"') >= 0 ? "tab-home" : "NOT FOUND");
console.log("tab-home:", th);

// Check switchTab home branch
const st = s.indexOf("function switchTab(");
const body = s.indexOf("{", st) + 1;
let d = 1, p = body;
while (d > 0) { if (s[p] === "{") d++; else if (s[p] === "}") d--; p++; }
const swBody = s.slice(body, p);
const homeBr = swBody.indexOf("if(tab==='home')");
console.log("home branch at:", homeBr);
if (homeBr >= 0) console.log("snippet:", swBody.slice(homeBr, homeBr + 200));

// Check default landing
const landing = s.match(/switchTab\('(\w+)'\)/);
console.log("first switchTab:", landing ? landing[0] : "NOT FOUND");

// Div balance
const dOpen = (s.match(/<div\b/g) || []).length;
const dClose = (s.match(/<\/div>/g) || []).length;
console.log(`Div: ${dOpen}/${dClose} diff=${dOpen - dClose}`);
