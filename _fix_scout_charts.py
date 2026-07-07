import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    c = f.read()

# ====== FIX 1: drawScoutingCategoryCharts - change group key from product_category to product_name ======
# Old key: d.product_category
# New key: d.product_name (first 8 chars as label)

old_chart = '''function drawScoutingCategoryCharts(data){
  var byCat={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var cat=d.product_category||'\\u672a\\u5206\\u7c7b';
    if(!byCat[cat])byCat[cat]={count:0,prices:[],sellPrices:[],commissions:[],moqs:[]};
    byCat[cat].count++;
    var pp=parseFloat(d.purchase_price)||0;if(pp>0)byCat[cat].prices.push(pp);
    var sp=parseFloat(d.selling_price)||0;if(sp>0)byCat[cat].sellPrices.push(sp);
    var cm=parseFloat(d.influencer_commission)||0;if(cm>0)byCat[cat].commissions.push(cm);
    var mq=parseInt(d.moq)||0;if(mq>0)byCat[cat].moqs.push(mq);
  }
  var cats=Object.keys(byCat).sort();if(!cats.length)return;
  function avg(arr){return arr.length?Math.round(arr.reduce(function(a,b){return a+b},0)/arr.length):0;}

  var priceData=[];var pmax=0;
  for(var p=0;p<cats.length;p++){var pcat=byCat[cats[p]];var avp=avg(pcat.prices),avs=avg(pcat.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:cats[p],groups:[{value:avp,color:'#4a90d9'},{value:avs,color:'#27ae60'}]});}
  drawGroupedBarChart('sc-price-chart',priceData,{maxValue:pmax,groupLabels:['\\u5e73\\u5747\\u91c7\\u8d2d\\u4ef7','\\u5e73\\u5747\\u9500\\u552e\\u4ef7'],groupColors:['#4a90d9','#27ae60'],labelWidth:80});

  var commData=[];var cmax=0;
  for(var c2=0;c2<cats.length;c2++){var cv=avg(byCat[cats[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:cats[c2],value:cv,color:'#e67e22'});}
  drawBarChart('sc-commission-chart',commData,{maxValue:cmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  var moqData=[];var mmax=0;
  for(var m=0;m<cats.length;m++){var mv=avg(byCat[cats[m]].moqs);mmax=Math.max(mmax,mv);moqData.push({label:cats[m],value:mv,color:'#8e44ad'});}
  drawBarChart('sc-moq-chart',moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+'\\u4ef6'},labelWidth:80});

  var cntData=[];var cntMax=0;
  for(var n=0;n<cats.length;n++){cntMax=Math.max(cntMax,byCat[cats[n]].count);cntData.push({label:cats[n],value:byCat[cats[n]].count,color:'#3498db'});}
  drawBarChart('sc-category-chart',cntData,{maxValue:cntMax,labelWidth:80});
}'''

new_chart = '''function drawScoutingCategoryCharts(data){
  var byProd={};
  for(var i=0;i<data.length;i++){
    var d=data[i];var key=(d.product_name||'\\u672a\\u547d\\u540d').substring(0,10);
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

  // Price comparison: avg purchase price vs avg selling price per product
  var priceData=[];var pmax=0;
  for(var p=0;p<keys.length;p++){var prod=byProd[keys[p]];var avp=avg(prod.prices),avs=avg(prod.sellPrices);pmax=Math.max(pmax,avp,avs);
    priceData.push({label:keys[p],groups:[{value:avp,color:'#4a90d9'},{value:avs,color:'#27ae60'}]});}
  drawGroupedBarChart('sc-price-chart',priceData,{maxValue:pmax,groupLabels:['\\u5e73\\u5747\\u91c7\\u8d2d\\u4ef7','\\u5e73\\u5747\\u9500\\u552e\\u4ef7'],groupColors:['#4a90d9','#27ae60'],labelWidth:80});

  // Margin per product
  var marginData=[];var mxmax=0;
  for(var m0=0;m0<keys.length;m0++){var mv=avg(byProd[keys[m0]].margins);mxmax=Math.max(mxmax,Math.abs(mv));marginData.push({label:keys[m0],value:mv,color:mv>=0?'#27ae60':'#e74c3c'});}
  drawBarChart('sc-margin-chart',marginData,{maxValue:mxmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  // Commission per product
  var commData=[];var cmax=0;
  for(var c2=0;c2<keys.length;c2++){var cv=avg(byProd[keys[c2]].commissions);cmax=Math.max(cmax,cv);commData.push({label:keys[c2],value:cv,color:'#e67e22'});}
  drawBarChart('sc-commission-chart',commData,{maxValue:cmax||10,valueFormatter:function(v){return v+'%'},labelWidth:80});

  // MOQ per product
  var moqData=[];var mmax=0;
  for(var m=0;m<keys.length;m++){var mqv=avg(byProd[keys[m]].moqs);mmax=Math.max(mmax,mqv);moqData.push({label:keys[m],value:mqv,color:'#8e44ad'});}
  drawBarChart('sc-moq-chart',moqData,{maxValue:mmax||100,valueFormatter:function(v){return v+'\\u4ef6'},labelWidth:80});

  // Supplier count per product
  var cntData=[];var cntMax=0;
  for(var n=0;n<keys.length;n++){cntMax=Math.max(cntMax,byProd[keys[n]].count);cntData.push({label:keys[n],value:byProd[keys[n]].count,color:'#3498db'});}
  drawBarChart('sc-category-chart',cntData,{maxValue:cntMax,labelWidth:80});
}'''

if old_chart in c:
    c = c.replace(old_chart, new_chart)
    print("FIX 1: chart grouping changed to product_name")
else:
    print("FAIL: FIX 1 - chart not found in old form")
    # Try to find the function differently
    idx = c.find("function drawScoutingCategoryCharts")
    if idx > 0:
        end = c.find("\n// === Company Directory", idx)
        print(f"  Found at {idx}, end={end}")
        # Show first 200 chars
        print(f"  Start: {repr(c[idx:idx+200])}")
        # Try with different unicode forms
        if "d.product_category" in c[idx:end]:
            print("  Has product_category (unicode)")
            # Let's reconstruct the old string
            func_body = c[idx:end]
            # Try matching with actual unicode chars
            test = c[idx:idx+100]
            print(f"  First 100 unicode: {test}")

# ====== FIX 2: Compare table - add margin column ======
old_head = "var headHtml='<tr><th>\\u4ea7\\u54c1</th>';"
new_head = "var headHtml='<tr><th>\\u4ea7\\u54c1</th><th>\\u6bdb\\u5229\\u7387</th>';"

old_th = "<th>\\u4f9b\\u5e94\\u5546\\uff06\\u6e20\\u9053</th><th>\\u91c7\\u8d2d\\u4ef7</th><th>MOQ</th>"
new_th = "<th>\\u4f9b\\u5e94\\u5546\\uff06\\u6e20\\u9053</th><th>\\u91c7\\u8d2d\\u4ef7</th><th>\\u6bdb\\u5229\\u7387</th><th>MOQ</th>"

if old_head in c:
    c = c.replace(old_head, new_head)
    print("FIX 2a: head +margin column")
elif old_head in c.replace("\\u4ea7\\u54c1", "\u4ea7\u54c1"):
    # Try with unicode directly
    alt_old = old_head.replace("\\u4ea7\\u54c1", "\u4ea7\u54c1")
    alt_new = new_head.replace("\\u4ea7\\u54c1", "\u4ea7\u54c1").replace("\\u6bdb\\u5229\\u7387", "\u6bdb\u5229\u7387")
    c = c.replace(alt_old, alt_new)
    print("FIX 2a: head +margin (unicode direct)")
else:
    print("FAIL: FIX 2a - old_head not found")

if old_th in c:
    c = c.replace(old_th, new_th)
    print("FIX 2b: supplier ths +margin column")
elif old_th.replace("\\uff06", "\uff06") in c:
    alt_old2 = old_th.replace("\\uff06", "\uff06")
    alt_new2 = new_th.replace("\\uff06", "\uff06").replace("\\u6bdb\\u5229\\u7387", "\u6bdb\u5229\u7387")
    c = c.replace(alt_old2, alt_new2)
    print("FIX 2b: supplier ths +margin (unicode direct)")
else:
    print("FAIL: FIX 2b - old_th not found")

# ====== FIX 3: Compare table body - add margin cell ======
# Old: bodyHtml+='<td'+bg+'><b>'+escHtml(it.supplier_name
# After supplier cell, add margin cell before MOQ
old_supplier_line = "bodyHtml+='<td'+bg+'><b>'+escHtml(it.supplier_name||'-')+'</b><br><span style=\"font-size:11px;color:var(--text-secondary)\">'+escHtml(it.channel||'')+'</span></td>';"
old_price_line = "bodyHtml+='<td'+(cheapest?' style=\"background:#e8f5e9;font-weight:700;color:var(--success)\"':'')+'>'+fmtNum(it.purchase_price)+'</td>';"
old_moq_line = "bodyHtml+='<td'+bg+'>'+(it.moq||'-')+'</td>';"

new_supplier_line = old_supplier_line
new_price_line = old_price_line
new_margin_line = "        var itSp=parseFloat(it.selling_price)||0,itPp=parseFloat(it.purchase_price)||0,itMargin=itSp>0?Math.round((itSp-itPp)/itSp*100):0;bodyHtml+='<td'+(itMargin>0?' style=\"color:var(--success);font-weight:600\"':'')+(itMargin<0?' style=\"color:var(--danger);font-weight:600\"':'')+'>'+(itSp>0?itMargin+'%':'N/A')+'</td>';\n"
new_moq_line = "bodyHtml+='<td'+bg+'>'+(it.moq||'-')+'</td>';"

# The key is: after price line, insert margin line before MOQ line
# Pattern: price_line + moq_line -> price_line + margin_line + moq_line
if old_price_line in c and old_moq_line in c:
    # Find the segment in refreshScoutingCompare
    idx_rc = c.find("function refreshScoutingCompare")
    end_rc = c.find("\nfunction ", idx_rc + 10)
    segment = c[idx_rc:end_rc]

    if old_price_line in segment and old_moq_line in segment:
        # Replace in the full file
        combined_old = old_price_line + "\n        " + old_moq_line
        combined_new = old_price_line + "\n" + new_margin_line + "        " + new_moq_line
        if combined_old in c:
            c = c.replace(combined_old, combined_new)
            print("FIX 3: margin cell inserted in compare table body")
        else:
            # Try with different indentation
            for indent in ["        ", "          ", "      "]:
                test_old = old_price_line + "\n" + indent + old_moq_line
                if test_old in c:
                    test_new = old_price_line + "\n" + new_margin_line + indent + new_moq_line
                    c = c.replace(test_old, test_new)
                    print(f"FIX 3: margin cell inserted (indent={repr(indent)})")
                    break
            else:
                print("FAIL: FIX 3 - combined old not found")
                # Show context
                pp = c.find(old_price_line)
                if pp > 0:
                    print(f"  price line at {pp}, context: {repr(c[pp:pp+200])}")
    else:
        print("FAIL: FIX 3 - lines not in refreshScoutingCompare")
else:
    print("FAIL: FIX 3 - price_line or moq_line not found at all")

# ====== FIX 4: Add sc-margin-chart canvas to analytics area ======
# Find the existing commission chart canvas and add margin chart before it
old_commission_canvas = '<canvas id="sc-commission-chart" height="200" style="width:100%"></canvas>'
new_commission_canvas = '<canvas id="sc-margin-chart" height="200" style="width:100%"></canvas>\n            ' + old_commission_canvas

if old_commission_canvas in c:
    c = c.replace(old_commission_canvas, new_commission_canvas)
    print("FIX 4: margin chart canvas added before commission chart")
else:
    print("FAIL: FIX 4 - commission canvas not found")
    # Search with unicode
    idx4 = c.find("sc-commission-chart")
    if idx4 > 0:
        print(f"  sc-commission-chart at {idx4}: {repr(c[idx4-50:idx4+60])}")

# ====== Also need to update the chart title labels ======
# The existing titles are probably "佣金分析" etc. Let's not change those for now.

with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(c.replace("\n", "\r\n"))

size_kb = len(c.encode("utf-8-sig")) / 1024
print(f"\nDone. Size: {size_kb:.1f} KB")
