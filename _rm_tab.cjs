const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Remove the tab-myoffice button from topbar
let tb=h.indexOf('id="tab-myoffice"');
if(tb>0){
 // Find the full button element - start from <button, end at </button>
 let btnStart=h.lastIndexOf('<button',tb);
 let btnEnd=h.indexOf('</button>',tb)+9;
 console.log('Removing topbar button:',h.slice(btnStart,btnEnd));
 // Preserve surrounding whitespace cleanly
 h=h.slice(0,btnStart)+h.slice(btnEnd);
}

fs.writeFileSync('D:/1kaifa/grsds/index.html',h,'utf8');
console.log('Done:',h.length,'bytes');

// Quick verify
let opens=(h.match(/<div\b/g)||[]).length;
let closes=(h.match(/<\/div>/g)||[]).length;
console.log('Div balance:',opens,'open,',closes,'close, diff=',opens-closes);
