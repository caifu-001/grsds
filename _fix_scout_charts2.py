import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()
c = c.replace("\r\n", "\n")

# Find the function boundaries
idx = c.find("function drawScoutingCategoryCharts")
end = c.find("\n// === Company Directory", idx)
old_func = c[idx:end]

# Build new function
new_func = '''function drawScoutingCategoryCharts(data){
  var byProd={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var key=(d.product_name||'未命名').substring(0,10);
    if(!byProd[key])byProd[key]={count:0,prices:[],sellPrices:[],margins:[],commissions:[],moqs:[],minPrice:Infinity};
    byProd[key].count++;
    var pp=parseFloat(d.purchase_price)||0;if(pp>0){byProd[key].prices.push(pp);if(pp<byProd[key].minPrice)byProd[key].minPrice=pp;}
    var sp=parseFloat(d.selling_price)||0;if(sp>0){byProd[key].sellPrices.push(sp);}
    if(sp>0&&pp>0){byProd[key].margins.push(Math.round((sp-pp)/sp*100));}
    var cm=parseFloat(d.influencer_commission)||0;if(cm>0)byProd[key].commissions.push(cm);
    var mq=parseInt(d.moq)||0;if(mq>0)byProd[key].moqs.push(mq);
  }
  var keys=Object.keys(byProd).sort();if(!keys.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0;}

  var priceData=[];var pmax=0;
  for(var p=0;p<keys.length;p++){var prod=byProd[keys[p]];var avp=avg(prod.prices),avs=avg(prod.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:keys[p],groups:[{value:avp,color:'#4a90d9'},{value:avs,color:'#27ae60'}]});}
  drawGroupedBarChart('sc-price-chart',priceData,{maxValue:pmax,groupLabels:['\u5e73\u5747\u91c7\u8d2d\u4ef7','\u5e73\u5747\u9500\u552e\u4ef7'],groupColors:['#4a90d9','#27ae60'],labelWidth:80});

  var marginData=[];var mxmax=0;
  for(var m0=0;m0<keys.length;m0++){var mv=avg(byProd[keys[m0]].margins);mxmax=Math.max(mxmax,Math.abs(mv));marginData.push({label:keys[m0],value:mv,color:mv>=0?'#27ae60':'#e74c3c'});}
  drawBarChart('sc-margin-chart',marginData,{maxValue:mxmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  var commData=[];var cmax=0;
  for(var c2=0;c2<keys.length;c2++){var cv=avg(byProd[keys[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:keys[c2],value:cv,color:'#e67e22'});}
  drawBarChart('sc-commission-chart',commData,{maxValue:cmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  var moqData=[];var mmax=0;
  for(var m=0;m<keys.length;m++){var mqv=avg(byProd[keys[m]].moqs);mmax=Math.max(mmax,mqv);moqData.push({label:keys[m],value:mqv,color:'#8e44ad'});}
  drawBarChart('sc-moq-chart',moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+'\u4ef6'},labelWidth:80});

  var cntData=[];var cntMax=0;
  for(var n=0;n<keys.length;n++){cntMax=Math.max(cntMax,byProd[keys[n]].count);cntData.push({label:keys[n],value:byProd[keys[n]].count,color:'#3498db'});}
  drawBarChart('sc-category-chart',cntData,{maxValue:cntMax,labelWidth:80});
}'''

if old_func in c:
    c = c.replace(old_func, new_func)
    print("FIX 1: chart grouping changed to product_name")
else:
    print(f"FAIL: old_func not matched. First 100 old: {repr(old_func[:100])}")
    print(f"First 100 new: {repr(new_func[:100])}")

# FIX 4: Add sc-margin-chart canvas
# Current canvas IDs in analytics section: sc-price-chart, sc-commission-chart, sc-moq-chart, sc-category-chart
# Insert margin chart after price chart, before commission chart
old_canvas = '<canvas id="sc-commission-chart" style="width:100%;height:240px"></canvas>'
new_canvas = '<canvas id="sc-margin-chart" style="width:100%;height:240px"></canvas>\n      ' + old_canvas

if old_canvas in c:
    c = c.replace(old_canvas, new_canvas)
    print("FIX 4: margin chart canvas added")
else:
    # Try without style attr
    for alt in ['<canvas id="sc-commission-chart" height="200" style="width:100%"></canvas>',
                '<canvas id="sc-commission-chart"']:
        idx4 = c.find(alt)
        if idx4 > 0:
            print(f"FOUND at {idx4}: {repr(c[idx4:idx4+100])}")
            break
    else:
        print("FAIL: FIX 4 canvas not found")

# Also update the title for commission chart section
old_title = '<h4 style="font-size:14px">\ud83d\udcca 佣金分析（按分类）</h4>'
new_title = '<h4 style="font-size:14px">\ud83d\udcca 佣金分析（按产品）</h4>'
if old_title in c:
    c = c.replace(old_title, new_title)
    print("FIX 5: commission title updated")

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"Done. Size: {size_kb:.1f} KB")
