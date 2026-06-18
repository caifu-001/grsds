import re

f=open(r'D:\1kaifa\grsds\index.html','r',encoding='utf-8').read()

fixes=0

# Specific fixes for known broken patterns in AFTER-SALES section

# 1. changeTicketStatus
old1 = "onclick=\"event.stopPropagation();changeTicketStatus(''+t.id+'','+(t.status==='pending'?'dispatched':t.status==='dispatched'?'in_progress':t.status==='in_progress'?'completed':t.status==='completed'?'confirmed':'closed')+'\\'')\">'+(t.status==='pending'?'派单':t.status==='dispatched'?'开始处理':t.status==='in_progress'?'完工':'关闭')+'</button>'"
# The issue: ''+t.id+'' should be \''+t.id+'\'
# Let me handle this differently - find the exact broken pattern and fix

# Pattern: ''+<variable>+'' inside h+='...' strings
# We need to escape these as \''+<variable>+'\'

# Let me look at the exact problematic segments
# Line 6158: ''+t.id+'',''+
# Line 6159: ''+t.id+'')
# Line 9404: ''+(s?s.id:'')+''
# Line 9458: ''+(t?t.id:'')+''

fixes_list = [
    # After-sales section
    ("changeTicketStatus(''+t.id+'','+(t.status", "changeTicketStatus(\\''+t.id+'\\','+(t.status"),
    ("onclick=\"event.stopPropagation();openTicketForm(''+t.id+'')\"","onclick=\"event.stopPropagation();openTicketForm(\\''+t.id+'\\')\""),
    ("confirmDialog('确定删除该工单？',async function(){await sb.from('service_tickets').delete().eq('id',''+t.id+'');loadTickets()})","confirmDialog('确定删除该工单？',async function(){await sb.from('service_tickets').delete().eq('id',\\''+t.id+'\\');loadTickets()})"),
    
    # Visit section
    ("confirmDialog('确定删除？',async function(){await sb.from('client_visits').delete().eq('id','+v.id+');loadVisits()})","confirmDialog('确定删除？',async function(){await sb.from('client_visits').delete().eq('id',\\''+v.id+'\\');loadVisits()})"),
    
    # Warranty section
    ("confirmDialog('确定删除？',async function(){await sb.from('warranties').delete().eq('id','+w.id+');loadWarranties()})","confirmDialog('确定删除？',async function(){await sb.from('warranties').delete().eq('id','+w.id+');loadWarranties()})"),
    
    # Maintenance section
    ("confirmDialog('确定删除？',async function(){await sb.from('maintenance_plans').delete().eq('id','+m.id+');loadMaintenancePlans()})","confirmDialog('确定删除？',async function(){await sb.from('maintenance_plans').delete().eq('id','+m.id+');loadMaintenancePlans()})"),
    
    # KB section
    ("confirmDialog('确定删除？',async function(){await sb.from('kb_articles').delete().eq('id','+k.id+');loadKB()})","confirmDialog('确定删除？',async function(){await sb.from('kb_articles').delete().eq('id',\\''+k.id+'\\');loadKB()})"),
    
    # Collab schedule save
    ("saveSchedule(''+(s?s.id:'')+'')","saveSchedule(\\''+(s?s.id:'')+'\\')"),
    ("saveTask(''+(t?t.id:'')+'')","saveTask(\\''+(t?t.id:'')+'\\')"),
]

for old_p, new_p in fixes_list:
    if old_p in f:
        f = f.replace(old_p, new_p)
        fixes += 1
        print(f'Fixed: {old_p[:60]}...')
    else:
        # Try with different spacing
        pass

print(f'\nApplied {fixes} specific fixes')

with open(r'D:\1kaifa\grsds\index.html','w',encoding='utf-8') as fh:
    fh.write(f)

# Verify with node
scripts = re.findall(r'<script[^>]*>(.*?)</script>', f, re.DOTALL)
with open(r'D:\1kaifa\grsds\_check_script3.js','w',encoding='utf-8') as fh:
    fh.write(scripts[3])

print(f'Lines: {len(f.splitlines())}')
