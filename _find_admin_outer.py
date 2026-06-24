import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find the main admin container div that wraps all admin panels
# It should be between the admin-tabs div and the FAB button
# Look for 'id="admin-users"' and go up to find parent <div>
admin_users = h.find('id="admin-users"')
print(f"admin-users: {admin_users}")
# Go backwards to find the wrapping <div>
pos = admin_users
while pos > 0:
    if h.find('<div', pos-5, pos) > -1:
        print(f"Found <div at ~{h.find('<div', pos-5, pos)}")
        # Show context
        print(h[max(0,pos-200):pos+100])
        break
    pos -= 1

# Find FAB button
fab = h.find('class="fab" id="main-fab"')
print(f"\nFAB button: {fab}")
print(h[max(0,fab-100):fab+80])

# Show where admin-workflows currently is with surrounding context
wf = h.find('id="admin-workflows"')
print(f"\n=== Current admin-workflows location ===")
print(h[wf-100:wf+200])
