fetch('https://api.github.com/repos/caifu-001/grsds/pages/builds/latest',{
  headers:{'User-Agent':'node','Accept':'application/vnd.github+json'}}
).then(r=>r.json()).then(d=>console.log('status:',d.status,'sha:',d.commit,'url:',d.html_url)).catch(e=>console.error(e))
