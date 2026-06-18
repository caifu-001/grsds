content = open(r"D:\1kaifa\grsds\index.html", 'r', encoding='utf-8').read()
# Find admin tabs HTML
tidx = content.find('admin-tabs')
if tidx > 0:
    print('ADMIN TABS at:', tidx)
    print(content[tidx:tidx+800])
print('\n=== SEPARATOR ===\n')
aidx = content.find('id="admin-users"')
if aidx > 0:
    print('ADMIN USERS at:', aidx)
    print(content[aidx:aidx+500])
print('\n=== ROLES PERMISSIONS ===\n')
ridx = content.find('permissions')
if ridx > 0:
    # Find the default roles
    didx = content.find('default_roles')
    if didx > 0:
        print(content[didx:didx+800])
    else:
        print(content[max(0,ridx-300):ridx+500])
