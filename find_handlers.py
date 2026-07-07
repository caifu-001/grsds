import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open(r'D:\1kaifa\grsds\index.html', 'r', encoding='utf-8') as f:
    c = f.read()

# Find mousedown/mousemove/mouseup handlers and check if any re-render panel
for ev in ['mousedown', 'mousemove', 'mouseup']:
    print(f'=== {ev} handlers ===')
    for m in re.finditer(r'\.addEventListener\("' + ev + '"', c):
        pos = m.start()
        # find the start of the listener (back to var foo= or document.)
        line_start = c.rfind('\n', 0, pos) + 1
        line_end = c.find('\n', pos)
        if line_end < 0: line_end = len(c)
        line = c[line_start:line_end]
        # is this on document/window?
        prefix = c[max(0, pos-80):pos]
        target_match = re.search(r'(\w+)\.addEventListener', prefix)
        target = target_match.group(1) if target_match else '?'
        # body — extract following 500 chars
        body = c[pos:pos+1000]
        is_intersting = any(kw in body for kw in ['wfShowProps', 'wf-props-panel', 'innerHTML'])
        print(f'  pos {pos} target={target} interesting={is_intersting}')
        print(f'    line: {line[:200]}')
        if is_intersting:
            # show first 600 chars
            print(f'    body: {body[:600]}')
        print()
