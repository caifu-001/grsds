with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('renderAdminUsers();', 'if(typeof renderAdminEmployees==="function")renderAdminEmployees();')

with open(r'D:\1kaifa\grsds\index.html', 'w', encoding='utf-8') as f:
    f.write(c)

print('done')
