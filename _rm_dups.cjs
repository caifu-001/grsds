const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// Remove the 3 duplicate tab buttons using exact lines from previous output
let deletions=[
 '\n   <button class="collab-subtab" data-ctab="mo-todo" onclick="switchCollabTab(\'mo-todo\')">✅ 待办</button>',
 '\n   <button class="collab-subtab" data-ctab="mo-approvals" onclick="switchCollabTab(\'mo-approvals\')">📋 审批</button>',
 '\n   <button class="collab-subtab" data-ctab="mo-msgs" onclick="switchCollabTab(\'mo-msgs\')">💬 消息</button>'
];

let count=0;
deletions.forEach(d=>{
 while(h.indexOf(d)>=0){h=h.replace(d,'');count++}
});
console.log('Removed',count,'duplicate tab buttons');

// Verify remaining mo- tabs
let moTabs=h.match(/data-ctab="mo-/g);
console.log('mo- tabs remaining:',moTabs?moTabs.length:0);
if(moTabs){
 let unique=new Set(moTabs);
 console.log('Unique:',[...unique].join(', '));
}

let opens=(h.match(/<div\b/g)||[]).length;
let closes=(h.match(/<\/div>/g)||[]).length;
console.log('Div balance:',opens,'open,',closes,'close, diff=',opens-closes);

fs.writeFileSync('D:/1kaifa/grsds/index.html',h,'utf8');
console.log('Written',h.length,'bytes');
