import sys, re
sys.stdout.reconfigure(encoding='utf-8')
h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# admin-view closes at 107440 (line 1399) with 3 extra </div>s in invitation modal area
# Let's find exactly which </div>s close what

# Show lines 1388-1400 precisely
lines = h.split('\n')
for i in range(1385, 1412):
    print('%d: %s' % (i+1, lines[i].rstrip()))

print('\n---')

# Now show lines around admin-security close and admin-workflows (1540-1560)
for i in range(1538, 1560):
    print('%d: %s' % (i+1, lines[i].rstrip()))
