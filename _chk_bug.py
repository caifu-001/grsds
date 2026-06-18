import sys
html=open(r'D:\1kaifa\grsds\index.html','rb').read().decode('utf-8')
print('ledger-summary:', html.count('ledger-summary'))
idx=html.find('id="inv-ledger"')
if idx>=0:
    print(html[idx:idx+1000])
else:
    print('inv-ledger panel NOT FOUND')
# Check remaining loadStockLedger
idx2=html.find('function loadStockLedger')
if idx2>=0:
    # Find end
    end=idx2
    depth=0
    for i in range(idx2, len(html)):
        if html[i]=='{': depth+=1
        elif html[i]=='}': depth-=1
            if depth==0:
                end=i+1
                break
    print('\n--- loadStockLedger body ---')
    print(html[idx2:end])
