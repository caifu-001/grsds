#!/usr/bin/env python3
"""Verify index.html patch integrity"""
import re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('D:/1kaifa/grsds/index.html', 'r', encoding='utf-8') as f:
    c = f.read()

opens = c.count('{')
closes = c.count('}')
print(f'Brace balance: {{ {opens} - }} {closes} = {opens-closes}')

fc = len(re.findall(r'function \w+', c))
print(f'Function count: {fc}')
print(f'Total lines: {len(c.splitlines())}')
print(f'Filesize: {len(c)/1024:.1f} KB')

key_funcs = ['loadStockTransfers','renderTransfers','openTransferForm','saveTransfer','confirmTransfer',
             'loadStockLedger','renderLedger','exportLedgerCSV',
             'loadPurchaseOrders','renderPurchaseOrders','openPurchaseOrderForm','savePurchaseOrder','receivePO',
             'openSettlementForm','saveSettlement','closeSettlementForm','deletePurchaseOrder','deleteTransferById']
print('\nKey functions:')
for kf in key_funcs:
    cnt = c.count(f'function {kf}(')
    ok = 'OK' if cnt == 1 else f'MISS({cnt})'
    print(f'  {ok} {kf}')

key_ids = ['inv-transfers','inv-ledger','purchase-view','transfer-modal','po-modal','settlement-modal',
           'pof-supplier','pof-number','sf-supplier','sf-amount','tfm-from','tfm-to']
print('\nKey DOM ids:')
for ki in key_ids:
    cnt = c.count(f'id="{ki}"')
    ok = 'OK' if cnt >= 1 else 'MISS'
    print(f'  {ok} id="{ki}": {cnt}')

checks = [
    ('switchResTab purchase', "sub==='purchase'"),
    ('switchInventoryTab transfers', "t==='transfers'"),
    ('switchInventoryTab ledger', "t==='ledger'"),
    ('purchase-view in allViews', 'purchv'),
    ('loadPurchaseOrders called', 'loadPurchaseOrders()'),
    ('loadStockTransfers called', 'loadStockTransfers()'),
    ('loadStockLedger called', 'loadStockLedger()'),
    ('settlement button', 'openSettlementForm()'),
    ('confirmTransfer', 'confirmTransfer'),
    ('receivePO', 'receivePO'),
]
print('\nConnectivity checks:')
for label, pattern in checks:
    cnt = c.count(pattern)
    ok = 'OK' if cnt >= 1 else 'MISS'
    print(f'  {ok} {label}: {cnt}')

print('\nDONE')
