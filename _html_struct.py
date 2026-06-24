import sys
sys.stdout.reconfigure(encoding='utf-8')

h = open(r'D:\1kaifa\grsds\index.html', encoding='utf-8').read()

# Find main script boundaries
script_tag_close = h.find('>', h.find('<script>'))
last_script_end = h.rfind('</script>')

html_part = h[:script_tag_close+1]  # everything before script
post_script = h[last_script_end+9:]  # everything after script

print(f"HTML before script: {len(html_part)} bytes")
print(f"After last </script>: {len(post_script)} bytes")
print(f"\nPost-script content:")
print(repr(post_script[:500]))
print(f"\n...end...")
print(repr(post_script[-200:]))

# Count real divs in HTML part only (not JavaScript)
def count_real_divs(text):
    opening = 0; closing = 0
    i = 0
    while i < len(text):
        if text[i:i+4].lower() == '<div' and text[i+4:i+5] in (' ', '>'):
            opening += 1
        elif text[i:i+6].lower() == '</div>':
            closing += 1
        i += 1
    return opening, closing

html_o, html_c = count_real_divs(html_part)
post_o, post_c = count_real_divs(post_script)
total_o = html_o + post_o
total_c = html_c + post_c

print(f"\n=== Div balance (excluding JS string divs) ===")
print(f"HTML part: {html_o} opening, {html_c} closing, net={html_o-html_c}")
print(f"Post-script: {post_o} opening, {post_c} closing, net={post_o-post_c}")
print(f"TOTAL: {total_o} opening, {total_c} closing, net={total_o-total_c}")

# Also check HTML div balance between main-screen and end
ms = h.find('id="main-screen"')
# Find the </div> that closes main-screen in the REAL HTML, not JS strings
# Use the post-script part to find how many closing divs happen
# main-screen is opened before the script, and closed after the script
# If post-script doesn't have enough closing divs, main-screen is not properly closed

# Check: does post_script have content after the final divs?
post_lines = post_script.strip().split('\n')
print(f"\nPost-script lines (cleaned):")
for i, line in enumerate(post_lines):
    if line.strip():
        print(f"  {i}: {line.strip()[:120]}")
