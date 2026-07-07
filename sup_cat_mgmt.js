// ── Supplier Category Management ──
var customSupCats=JSON.parse(localStorage.getItem('custom_sup_cats')||'[]');
function saveCustomSupCats(){localStorage.setItem('custom_sup_cats',JSON.stringify(customSupCats));}
function getAllSupCategories(){var s=new Set();for(var i=0;i<allSuppliers.length;i++){if(allSuppliers[i].category)s.add(allSuppliers[i].category)}for(var j=0;j<customSupCats.length;j++)s.add(customSupCats[j]);return Array.from(s).sort();}
function toggleSupCatManage(){var p=document.getElementById('sup-cat-manage');p.classList.toggle('hidden');if(!p.classList.contains('hidden'))renderSupCatTags();}
function renderSupCatTags(){var ct=document.getElementById('sup-cat-tags');var cats=getAllSupCategories();var h='';for(var i=0;i<cats.length;i++)h+='<span class="sup-cat-tag">'+escHtml(cats[i])+'<span class="cat-tag-del" onclick="removeSupCategory(\x27'+escHtml(cats[i]).replace(/'/g,"\\'")+'\x27)">&times;</span></span>';ct.innerHTML=h||'<span style="font-size:12px;color:var(--text3)">暂无类别</span>';}
function addSupCategory(){var inp=document.getElementById('sup-cat-new');var v=inp.value.trim();if(!v)return;if(customSupCats.indexOf(v)<0){customSupCats.push(v);saveCustomSupCats();}inp.value='';renderSupCatTags();buildSupCategories();}
function removeSupCategory(cat){customSupCats=customSupCats.filter(function(c){return c!==cat});saveCustomSupCats();renderSupCatTags();buildSupCategories();}
