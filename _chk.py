import re
with open(r"D:\1kaifa\grsds\index.html","r",encoding="utf-8") as f:
    c = f.read()
bo = c.count('{')
bc = c.count('}')
print('Brace: open=%d close=%d delta=%d' % (bo, bc, bo-bc))
print('Lines: %d' % len(c.splitlines()))
print('Functions: %d' % len(re.findall(r'function \w+', c)))
print()
for fn in ['loadStockTransfers','renderTransfers','openTransferForm','saveTransfer','confirmTransfer','deleteTransferById',
           'loadStockLedger','renderLedger','exportLedgerCSV',
           'loadPurchaseOrders','renderPurchaseOrders','openPurchaseOrderForm','savePurchaseOrder','receivePO','deletePurchaseOrder',
           'openSettlementForm','saveSettlement','closeSettlementForm']:
    ok = ('function '+fn+'(') in c
    print('[%s] %s' % ('OK' if ok else 'MISS', fn))
print()
for pid in ['inv-transfers','inv-ledger','purchase-view','transfer-modal','po-modal','settlement-modal']:
    ok = ('id="'+pid+'"') in c
    print('[%s] DOM: %s' % ('OK' if ok else 'MISS', pid))
print()
print('showToast copies: %d' % len(re.findall(r'function showToast\(', c)))
print('escHtml copies: %d' % len(re.findall(r'function escHtml\(', c)))
