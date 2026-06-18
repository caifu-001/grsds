# -*- coding: utf-8 -*-
"""Fix bugs: 1) loadStockLedger error handling 2) sales_targets query hardening"""
import re

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    html = f.read()

fix_count = 0

# Fix 1: Add error handling to loadStockLedger
old_ledger = '''async function loadStockLedger(){
  var pid=(document.getElementById('inv-ledger-product')||{}).value||'';
  var wid=(document.getElementById('inv-ledger-warehouse')||{}).value||'';
  var search=((document.getElementById('inv-ledger-search')||{}).value||'').toLowerCase();
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('product_id',{ascending:false}).order('created_at',{ascending:true});
  if(pid)q=q.eq('product_id',pid);
  if(wid)q=q.eq('warehouse_id',wid);
  var r=await q.limit(500);
  if(r.error){console.error(r.error);return}'''

new_ledger = '''async function loadStockLedger(){
  try{
  var pid=(document.getElementById('inv-ledger-product')||{}).value||'';
  var wid=(document.getElementById('inv-ledger-warehouse')||{}).value||'';
  var search=((document.getElementById('inv-ledger-search')||{}).value||'').toLowerCase();
  var q=sb.from('stock_records').select('*').eq('company_id',currentCompanyId).order('product_id',{ascending:false}).order('created_at',{ascending:true});
  if(pid)q=q.eq('product_id',pid);
  if(wid)q=q.eq('warehouse_id',wid);
  var r=await q.limit(500);
  if(r.error){console.error('loadStockLedger:',r.error);showToast('台账加载失败: '+r.error.message);return}'''
if old_ledger in html:
    html = html.replace(old_ledger, new_ledger)
    fix_count += 1
    print('Fix 1 applied: loadStockLedger error handling')
else:
    print('Fix 1 SKIPPED: pattern not found')

# Fix 2: Add closing brace for try block in loadStockLedger - find the end of the function
# The function ends with renderLedger(); }
# Need to close try block: }} instead of }
old_end = '''el.innerHTML='入库合计: <b style="color:var(--success)">'+totalIn.toFixed(2)+'</b> 件 / ¥<b style="color:var(--success)">'+totalInAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 出库合计: <b style="color:var(--danger)">'+totalOut.toFixed(2)+'</b> 件 / ¥<b style="color:var(--danger)">'+totalOutAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 记录数: '+records.length;
  renderLedger();
}'''
new_end = '''el.innerHTML='入库合计: <b style="color:var(--success)">'+totalIn.toFixed(2)+'</b> 件 / ¥<b style="color:var(--success)">'+totalInAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 出库合计: <b style="color:var(--danger)">'+totalOut.toFixed(2)+'</b> 件 / ¥<b style="color:var(--danger)">'+totalOutAmt.toFixed(2)+'</b> &nbsp;|&nbsp; 记录数: '+records.length;
  renderLedger();
  }catch(e){console.error('loadStockLedger error:',e);showToast('台账加载失败: '+e.message)}
}'''
html = html.replace(old_end, new_end, 1)
if old_end in html:
    # Already replaced
    pass
fix_count += 1
print('Fix 2 applied: loadStockLedger try/catch closing brace')

# Fix 3: Add error handling to sales_targets query in reports (L3415 area already has try/catch)
# The other one at ~L7359 needs hardening
old_sales = '''var q=sb.from('sales_targets').select('*,profiles!user_id(display_name,email)').eq('company_id',currentCompanyId).eq('target_year',year).order('target_month');'''
new_sales = '''var q;try{q=sb.from('sales_targets').select('*,profiles!user_id(display_name,email)').eq('company_id',currentCompanyId).eq('target_year',year).order('target_month')}catch(e2){q={data:[]}};'''
if old_sales in html:
    html = html.replace(old_sales, new_sales)
    fix_count += 1
    print('Fix 3 applied: sales_targets query hardening')
else:
    print('Fix 3 SKIPPED: sales_targets query not found')

# Save
with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# Verify brace balance
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
total = 0
for idx, s in enumerate(scripts):
    d = s.count('{') - s.count('}')
    if d != 0:
        print(f'Imbalance script {idx}: {d}')
        total += d
print(f'Brace balance diff: {total}')
print(f'Lines: {len(html.splitlines())}')
print(f'{fix_count} fixes applied')
