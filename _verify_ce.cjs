const https = require('https');
https.get('https://raw.githubusercontent.com/caifu-001/grsds/ce8e8d7/index.html', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('Remote size:', d.length);
    console.log('has loadFWVisits:', d.includes('async function loadFWVisits'));
    console.log('has openFVisit:', d.includes('function openFVisit'));
    console.log('has closeFVisit:', d.includes('function closeFVisit'));
    console.log('has deleteVisit:', d.includes('async function deleteVisit'));
    console.log('switchFWTab calls loadFWVisits:', d.includes("else if(tab==='visits')loadFWVisits()"));
  });
});
