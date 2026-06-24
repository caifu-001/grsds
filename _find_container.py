import sys
sys.stdout.reconfigure(encoding='utf-8')
with open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8') as f:
    h = f.read()

# Find admin-workflows and check if it's inside admin-screen
wf = h.find('id="admin-workflows"')
# Find the admin-screen container
admin_screen = h.find('id="admin-screen"')
# Find admin-screen end
# Find the admin tabs container
admin_tabs_start = h.find('class="admin-tabs"')
if admin_tabs_start < 0:
    admin_tabs_start = h.find('admin-tabs')

print(f"admin-workflows: {wf}")
print(f"admin-screen: {admin_screen}")
print(f"admin-tabs: {admin_tabs_start}")

# Show what's right before admin-workflows
print("\n=== Before admin-workflows ===")
print(h[wf-500:wf])

# Is admin-workflows inside admin-screen?
# Look for the closing of admin-screen
# Find where other admin panels end
for name in ['admin-security', 'admin-users', 'admin-config']:
    pos = h.find(f'id="{name}"')
    if pos > 0:
        # find matching </div>
        d = 0; s = False; j = pos
        while j < len(h):
            if h[j:j+4].lower() == '<div': d += 1; s = True
            elif h[j:j+6].lower() == '</div>': d -= 1
            if s and d == 0: break
            j += 1
        print(f"\n{name}: {pos} to {j+6}")

# Find the <div> that wraps all admin content and its closing
# Look for the main screen div
main_screen = h.find('id="main-screen"')
settings_screen = h.find('id="settings-screen"')
print(f"\nmain-screen: {main_screen}")
print(f"settings-screen: {settings_screen}")
