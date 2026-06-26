var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// 1. Add debug overlay at the top of fieldwork-view
var fwv=h.indexOf('id="fieldwork-view" class="hidden">');
var insertAt=h.indexOf('\n',fwv)+1;
var debugBlock='<div id="fw-debug" style="position:fixed;top:60px;right:12px;background:rgba(0,0,0,0.85);color:#0f0;padding:8px 12px;border-radius:6px;font:11px monospace;z-index:9999;max-width:350px;max-height:400px;overflow-y:auto;display:none"></div>\n';
h=h.substring(0,insertAt)+debugBlock+h.substring(insertAt);

// 2. Modify switchFWTab to include debug logging
var swDef=h.indexOf('function switchFWTab(tab){');
var swBody=h.indexOf('{',swDef)+1;
var debugInj='\n  var dbg=document.getElementById("fw-debug");if(dbg){dbg.style.display="block";dbg.innerHTML="▶ switchFWTab: "+tab;}';
h=h.substring(0,swBody)+debugInj+h.substring(swBody);

// 3. Modify loadFWOverview to check preconditions and log step-by-step
var lfoDef=h.indexOf('async function loadFWOverview(){');
var lfoBody=h.indexOf('{',lfoDef)+1;
var lfoDebug='\n  var dbg=document.getElementById("fw-debug");if(dbg)dbg.innerHTML+="<br>● loadFWOverview start";\n  if(typeof currentUser==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ currentUser undefined";return}\n  if(!currentUser||!currentUser.id){if(dbg)dbg.innerHTML+="<br>⛔ currentUser.id missing: "+JSON.stringify(currentUser);return}\n  if(typeof sb==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ sb undefined";return}\n  if(typeof currentCompanyId==="undefined"){if(dbg)dbg.innerHTML+="<br>⛔ currentCompanyId undefined";return}\n  if(dbg)dbg.innerHTML+="<br>✔ user="+currentUser.id.substring(0,8)+" company="+currentCompanyId;\n';
h=h.substring(0,lfoBody)+lfoDebug+h.substring(lfoBody);

// 4. Add step-by-step in the try block of loadFWOverview
var tryPos=h.indexOf('try{',lfoBody);
var tryBody=h.indexOf('{',tryPos)+1;
var tryDebug='\n  if(dbg)dbg.innerHTML+="<br>▶ Querying field_checkins...";\n';
h=h.substring(0,tryBody)+tryDebug+h.substring(tryBody);

// 5. After the first query, add log
var query1=h.indexOf('var {data:checks}=await sb.from(',lfoBody);
var afterQuery1=h.indexOf(';',query1)+1;
h=h.substring(0,afterQuery1)+'\n  if(dbg)dbg.innerHTML+="<br>✔ checks: "+(checks?(checks.length+" rows"):"null");'+h.substring(afterQuery1);

// 6. After the second query, add log
var query2=h.indexOf('var {data:visits}=await sb.from(',lfoBody);
var afterQuery2=h.indexOf(';',query2)+1;
h=h.substring(0,afterQuery2)+'\n  if(dbg)dbg.innerHTML+="<br>✔ visits: "+(visits?(visits.length+" rows"):"null");'+h.substring(afterQuery2);

// 7. After third query (week visits)
var query3=h.indexOf('var {data:weekVisits}=await sb.from(',lfoBody);
var afterQuery3=h.indexOf(';',query3)+1;
h=h.substring(0,afterQuery3)+'\n  if(dbg)dbg.innerHTML+="<br>✔ weekVisits: "+(weekVisits?(weekVisits.length+" rows"):"null");'+h.substring(afterQuery3);

// 8. After fourth query (team checks)
var query4=h.indexOf('var {data:teamChecks}=await sb.from(',lfoBody);
var afterQuery4=h.indexOf(';',query4)+1;
h=h.substring(0,afterQuery4)+'\n  if(dbg)dbg.innerHTML+="<br>✔ teamChecks: "+(teamChecks?(teamChecks.length+" rows"):"null");'+h.substring(afterQuery4);

// 9. Add log before kpi.innerHTML assignment
var kpiLine=h.indexOf("kpi.innerHTML='<div class=",lfoBody);
h=h.substring(0,kpiLine)+'if(dbg)dbg.innerHTML+="<br>▶ Rendering KPI cards...";'+h.substring(kpiLine);

// 10. At end of try, add done log
var tryEnd=h.indexOf('}catch(e)',lfoBody);
var doneLog='\n  if(dbg)dbg.innerHTML+="<br>✅ loadFWOverview done";\n';
h=h.substring(0,tryEnd)+doneLog+h.substring(tryEnd);

// 11. In catch, add visible error
var catchBody=h.indexOf('{',tryEnd)+1;
h=h.substring(0,catchBody)+'\n  if(dbg)dbg.innerHTML+="<br>🔥 ERROR: "+(e.message||e)+"<br>"+(e.stack||"").substring(0,200);'+h.substring(catchBody);

// 12. Also inject debug into switchTab fieldwork branch
var fwBranch=h.indexOf("switchFWTab('overview');");
var fwBranchBefore=h.lastIndexOf('\n',fwBranch);
var tabDebug='\n  var dbg=document.getElementById("fw-debug");if(dbg){dbg.style.display="block";dbg.innerHTML="FW init...";}\n';
h=h.substring(0,fwBranchBefore+1)+tabDebug+h.substring(fwBranchBefore+1);

fs.writeFileSync('index.html',h,'utf8');
console.log('Done. Size:',h.length);
