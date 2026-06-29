const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Verify doSaveFVisit is intact
let dsv=h.indexOf('async function doSaveFVisit');
if(dsv>=0){
 // Find function body
 let p=h.indexOf('{',dsv),depth=0;
 while(p<h.length){if(h[p]=='{')depth++;else if(h[p]=='}'){depth--;if(depth===0)break}p++}
 console.log('=== doSaveFVisit ===');
 console.log(h.slice(dsv,p+1));
}

// Verify showLocationConfirm exists
console.log('\nshowLocationConfirm exists:',h.indexOf('function showLocationConfirm')>=0);
console.log('confirmLocation exists:',h.indexOf('function confirmLocation')>=0);
console.log('closeLocationConfirm exists:',h.indexOf('function closeLocationConfirm')>=0);

// Verify fw-location-confirm HTML
console.log('\nfw-location-confirm modal exists:',h.indexOf('id="fw-location-confirm"')>=0);

// Check doCheckIn calls showLocationConfirm
let dci=h.indexOf('async function doCheckIn');
let p=h.indexOf('showLocationConfirm(',dci);
console.log('\ndoCheckIn calls showLocationConfirm:',p>=0);
if(p>=0) console.log('  at offset',p,'context:',h.slice(p,Math.min(p+120,h.length)).replace(/\n/g,'\\n'));

// Check saveFVisit calls showLocationConfirm
let sfv=h.indexOf('async function saveFVisit');
let p2=h.indexOf('showLocationConfirm(',sfv);
console.log('\nsaveFVisit calls showLocationConfirm:',p2>=0);
if(p2>=0) console.log('  at offset',p2,'context:',h.slice(p2,Math.min(p2+120,h.length)).replace(/\n/g,'\\n'));
