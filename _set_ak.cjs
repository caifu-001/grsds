const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');
h=h.replace('你的百度地图AK','We6WBochlQEAiMK0DuQGyaN9Qz7yB4SU');
fs.writeFileSync('D:/1kaifa/grsds/index.html',h,'utf8');
console.log('Replaced AK, file:',h.length,'bytes');
