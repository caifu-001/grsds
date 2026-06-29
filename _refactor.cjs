const fs=require('fs');
let h=fs.readFileSync('D:/1kaifa/grsds/index.html','utf8');

// ═══ PHASE 1: Remove duplicate my-office tabs (keep only overview + docs) ═══

// A) Remove duplicate tab buttons from subtabs area
let delTabs=[
 '   <button class="collab-subtab" data-ctab="mo-todo"\n    onclick="switchCollabTab(\'mo-todo\')">✅ 待办</button>\n',
 '   <button class="collab-subtab" data-ctab="mo-approvals"\n    onclick="switchCollabTab(\'mo-approvals\')">📋 审批</button>\n',
 '   <button class="collab-subtab" data-ctab="mo-msgs"\n    onclick="switchCollabTab(\'mo-msgs\')">💬 消息</button>\n'
];
let removed=0;
delTabs.forEach(t=>{while(h.indexOf(t)>=0){h=h.replace(t,'');removed++}});
console.log('Removed',removed,'duplicate tabs');

// B) Remove duplicate panel HTML (mo-todo, mo-approvals, mo-messages)
// These are inside the my-office panels block in collab-view. Find them by id.
function removePanel(id){
 let start=h.indexOf('id="'+id+'"');
 if(start<0) return;
 // Back to enclosing <div>
 let divStart=h.lastIndexOf('<div',start);
 let depth=0,p=divStart;
 while(p<h.length){
  if(h.startsWith('<div',p)) depth++;
  else if(h.startsWith('</div>',p)){depth--;if(depth===0){p+=6;break}}
  p++;
 }
 // Also clean up leading whitespace/newlines
 while(divStart>0&&h[divStart-1]==='\n') divStart--;
 h=h.slice(0,divStart)+h.slice(p);
}
// Remove mo-todo panel (duplicate of collab task)
let todoStart=h.indexOf('id="mo-todo"');
if(todoStart>0){
 let divStart=h.lastIndexOf('<div',todoStart);
 let depth=0,p=divStart;
 while(p<h.length){if(h.startsWith('<div',p))depth++;else if(h.startsWith('</div>',p)){depth--;if(depth===0){p+=6;break}}p++}
 while(divStart>0&&h[divStart-1]==='\n')divStart--;
 h=h.slice(0,divStart)+h.slice(p);
 console.log('Removed mo-todo panel');
}

// Remove mo-approvals panel
let apprStart=h.indexOf('id="mo-approvals"');
if(apprStart>0){
 let divStart=h.lastIndexOf('<div',apprStart);
 let depth=0,p=divStart;
 while(p<h.length){if(h.startsWith('<div',p))depth++;else if(h.startsWith('</div>',p)){depth--;if(depth===0){p+=6;break}}p++}
 while(divStart>0&&h[divStart-1]==='\n')divStart--;
 h=h.slice(0,divStart)+h.slice(p);
 console.log('Removed mo-approvals panel');
}

// Remove mo-messages panel
let msgStart=h.indexOf('id="mo-messages"');
if(msgStart>0){
 let divStart=h.lastIndexOf('<div',msgStart);
 let depth=0,p=divStart;
 while(p<h.length){if(h.startsWith('<div',p))depth++;else if(h.startsWith('</div>',p)){depth--;if(depth===0){p+=6;break}}p++}
 while(divStart>0&&h[divStart-1]==='\n')divStart--;
 h=h.slice(0,divStart)+h.slice(p);
 console.log('Removed mo-messages panel');
}

// C) Clean up references in switchCollabTab
let sctOld=`  // [INTEGRATED] Handle my-office panels
  var moPanels=document.querySelectorAll("#collab-view .mo-panel");
  for(var mp=0;mp<moPanels.length;mp++)moPanels[mp].classList.toggle("hidden",moPanels[mp].id!=="mo-"+tab);
  // Init on demand
  if(tab==="mo-overview"&&typeof loadMyOfficeOverview==="function")loadMyOfficeOverview();
  else if(tab==="mo-todo"&&typeof renderMyOfficeTodo==="function")renderMyOfficeTodo("all");
  else if(tab==="mo-docs"&&typeof renderMyOfficeDocs==="function")renderMyOfficeDocs("all");
  else if(tab==="mo-approvals"&&typeof loadMyOfficeApprovals==="function")loadMyOfficeApprovals();
  else if(tab==="mo-msgs"&&typeof loadMoMessages==="function")loadMoMessages();`;

let sctNew=`  // [INTEGRATED] Handle my-office panels (overview + docs only)
  var moPanels=document.querySelectorAll("#collab-view .mo-panel");
  for(var mp=0;mp<moPanels.length;mp++)moPanels[mp].classList.toggle("hidden",moPanels[mp].id!=="mo-"+tab);
  // Init on demand
  if(tab==="mo-overview"&&typeof loadMyOfficeOverview==="function")loadMyOfficeOverview();
  else if(tab==="mo-docs"&&typeof renderMyOfficeDocs==="function")renderMyOfficeDocs("all");`;

h=h.replace(sctOld,sctNew);
console.log('Cleaned switchCollabTab references');

// D) Clean up the show/hide logic for mo- prefix in switchCollabTab
// The "if(tab.startsWith("mo-"))" block is still fine since overview/docs still use mo-

// ═══ PHASE 2: Switch Leaflet to Baidu Maps ═══

// Remove Leaflet CDN
let leafletCSS='\n<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>\n<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>\n';
h=h.replace(leafletCSS,'');

// Add Baidu Maps CDN (v3.0, no ak needed for basic usage, but will prompt user)
let baiduAPI='\n<script src="https://api.map.baidu.com/api?v=3.0&ak=你的百度地图AK"></script>\n';
// Insert before </head>
let headEnd=h.indexOf('</head>');
h=h.slice(0,headEnd)+baiduAPI+h.slice(headEnd);
console.log('Added Baidu Maps API (replace AK)');

// Replace Leaflet CSS with Baidu maps CSS
let leafletCSS2='\n/* Leaflet map styles */\n.fw-track-map{height:320px;border-radius:12px;overflow:hidden;border:1px solid var(--border)}\n.leaflet-container{font-family:inherit}\n.fw-visit-loc{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--primary);margin-top:4px}\n.fw-visit-loc.no-gps{color:var(--text3)}\n';
let baiduCSS='\n/* Baidu Map styles */\n.fw-track-map{height:320px;border-radius:12px;overflow:hidden;border:1px solid var(--border)}\n.BMap_mask,.BMap_noprint{font-family:inherit!important}\n.fw-visit-loc{display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--primary);margin-top:4px}\n.fw-visit-loc.no-gps{color:var(--text3)}\n';
h=h.replace(leafletCSS2,baiduCSS);
console.log('Replaced Leaflet CSS with Baidu CSS');

// Replace the map rendering code in loadFWTrack
let mapOld=`mcont.innerHTML='<div id="fw-leaflet-map" style="width:100%;height:100%"></div>';
    setTimeout(function(){
      if(!window.L){mcont.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">🗺️</div><div>地图加载中...</div></div>';return}
      if(window._fwMap)window._fwMap.remove();
      var map=L.map('fw-leaflet-map',{attributionControl:false,zoomControl:true}).setView([39.9,116.4],12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
      window._fwMap=map;
      // Add markers
      var bounds=[];
      if(checks){for(var i=0;i<checks.length;i++){var ck=checks[i];if(!ck.latitude)continue;
        var marker=L.marker([ck.latitude,ck.longitude])
          .bindPopup((ck.type==='in'?'📍 签到':'🏠 签退')+(ck.note?': '+ck.note:'')+'<br><small>'+new Date(ck.created_at).toLocaleTimeString('zh-CN')+'</small>')
          .addTo(map);
        bounds.push([ck.latitude,ck.longitude]);
      }}
      if(visits){for(var i=0;i<visits.length;i++){var vt=visits[i];if(!vt.latitude)continue;
        var m2=L.marker([vt.latitude,vt.longitude],{icon:L.divIcon({html:'<div style="background:#10B981;color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3)">🏢</div>',iconSize:[24,24],iconAnchor:[12,12]})})
          .bindPopup('🏢 拜访 '+h(vt.client_name||'未知')+(vt.purpose?'<br>🎯 '+h(vt.purpose):'')+'<br><small>'+vt.visit_date+'</small>')
          .addTo(map);
        bounds.push([vt.latitude,vt.longitude]);
      }}
      if(bounds.length>0){map.fitBounds(bounds,{padding:[30,30]})}
    },200);`;

let mapNew=`mcont.innerHTML='<div id="fw-baidu-map" style="width:100%;height:100%"></div>';
    setTimeout(function(){
      if(!window.BMap||!window.BMap.Map){mcont.innerHTML='<div style="text-align:center;padding:40px"><div style="font-size:48px">🗺️</div><div>百度地图加载中...<br><span style="font-size:12px;color:var(--text3)">如持续显示，请检查百度地图AK是否正确</span></div></div>';return}
      if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null;}
      var map=new BMap.Map('fw-baidu-map',{enableMapClick:false});
      map.addControl(new BMap.NavigationControl({anchor:BMAP_ANCHOR_TOP_LEFT,type:BMAP_NAVIGATION_CONTROL_SMALL}));
      map.centerAndZoom(new BMap.Point(116.404,39.915),12);
      map.enableScrollWheelZoom();
      window._fwMap=map;
      // GPS→BD-09 coordinate converter
      function toBaidu(lat,lng){
        if(!window._gps2bd) window._gps2bd=new BMap.Convertor();
        return new Promise(function(res){
          window._gps2bd.translate([new BMap.Point(lng,lat)],1,5,function(data){res(data.points[0])})
        });
      }
      // Collect all points
      var allPts=[];
      if(checks){for(var i=0;i<checks.length;i++){var ck=checks[i];if(!ck.latitude)continue;
        allPts.push({lat:ck.latitude,lng:ck.longitude,label:(ck.type==='in'?'📍 签到':'🏠 签退'),note:ck.note,time:new Date(ck.created_at).toLocaleTimeString('zh-CN'),icon:'📍'});
      }}
      if(visits){for(var i=0;i<visits.length;i++){var vt=visits[i];if(!vt.latitude)continue;
        allPts.push({lat:vt.latitude,lng:vt.longitude,label:'🏢 '+h(vt.client_name||'未知'),note:vt.purpose,time:vt.visit_date,icon:'🏢'});
      }}
      if(!allPts.length) return;
      // Convert and add markers
      Promise.all(allPts.map(function(pt){
        return toBaidu(pt.lat,pt.lng).then(function(baiduPt){
          var mk=new BMap.Marker(baiduPt);
          var info=new BMap.InfoWindow(pt.label+(pt.note?': '+pt.note:'')+'<br><small>'+pt.time+'</small>',{width:200});
          mk.addEventListener('click',function(){map.openInfoWindow(info,baiduPt)});
          map.addOverlay(mk);
          return baiduPt;
        });
      })).then(function(results){
        if(results.length>0){
          var view=map.getViewport(results);
          map.setViewport(results);
        }
      });
    },200);`;

h=h.replace(mapOld,mapNew);
console.log('Switched Leaflet to Baidu Maps');

// Cleanup: remove L references in map cleanup
h=h.replace('if(window._fwMap){window._fwMap.remove();window._fwMap=null;}','if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null;}');
// Also in the "points===0" branch
h=h.replace("if(window._fwMap){window._fwMap.remove();window._fwMap=null}","if(window._fwMap){window._fwMap.clearOverlays();window._fwMap=null}");

// ═══ VERIFY ═══
let opens=(h.match(/<div\b/g)||[]).length;
let closes=(h.match(/<\/div>/g)||[]).length;
console.log('\nDiv balance:',opens,'open,',closes,'close, diff=',opens-closes);

fs.writeFileSync('D:/1kaifa/grsds/index.html',h,'utf8');
console.log('Written',h.length,'bytes');
console.log('\n⚠ 重要：需要在 https://lbsyun.baidu.com 注册获取百度地图AK，替换 index.html 中的"你的百度地图AK"');
