var fs=require('fs');var h=fs.readFileSync('index.html','utf8');

// Check: is fieldwork-view after all scripts in the body? 
// Find the last script end
var lastScript=h.lastIndexOf('</script>');
var bodyEnd=h.indexOf('</body>');
console.log('Last </script> at',lastScript);
console.log('</body> at',bodyEnd);
console.log('fieldwork-view at',236707);
console.log('Is fieldwork-view AFTER last script?',236707>lastScript);

// If so, fieldwork-view HTML is actually INSIDE a script block or after scripts
// Let's see what comes 200 chars after main-screen close at 100562
var ms=100562;
console.log('\n--- After main-screen close ---');
console.log(h.substring(ms,ms+500));

// Find where fieldwork-view actually is in the document flow
var fw=236707;
console.log('\n--- Around fieldwork-view ---');
console.log(h.substring(fw-100,fw+300));
