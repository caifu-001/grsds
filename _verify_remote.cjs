const https = require('https');
https.get('https://raw.githubusercontent.com/caifu-001/grsds/beebc13/index.html', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('Remote size:', d.length);
    console.log('has preload block:', d.includes("if(!allDepartments||!allDepartments.length||!allRoles||!allRoles.length)"));
    console.log('has <label>授权部门:', d.includes('<label>') && (d.match(/<label>[^<]*<\/label><select onchange="wfSetAssignee/g) || []).length);
    // Check if the dept line has label now
    const i = d.indexOf('wfSetAssignee(' + "'+idx+','+'\\'value\\',this.value)");
    if (i > 0) console.log('dept line at:', i, ':', d.slice(Math.max(0,i-100), i+30));
    // count </label><select with no opening
    const re = /<\/label><select/g;
    let m, count = 0;
    while ((m = re.exec(d)) !== null) count++;
    console.log('</label><select occurrences:', count);
  });
});
