import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

p = r"D:\1kaifa\grsds\index.html"
with open(p, "r", encoding="utf-8-sig") as f:
    raw = f.read()

# Step 1: Add </div> before "<!-- ====== Leads View ====== -->" to close inventory-view
leads_marker = "<!-- ====== Leads View ====== -->"
idx = raw.find(leads_marker)
if idx < 0:
    print(f"ERROR: marker not found")
    sys.exit(1)

# Find the </div> right before it
prev_div = raw.rfind("</div>", 0, idx)
# The line after that closing div is where we want our new </div>
# Find the newline after the closing div
next_nl = raw.find("\n", prev_div)
if next_nl < 0 or next_nl > idx:
    # Try \r\n
    next_nl = raw.find("\r\n", prev_div)

# Insert a new </div> line just before the leads comment
# The structure is: ...</div>\n\n<!-- ====== Leads...
insert_pos = idx  # right before the comment

# Use the right newline format
nl = raw[prev_div:prev_div+2] if raw[prev_div:prev_div+2] == "\r\n" else "\r\n"

# Insert: close div + newline
raw = raw[:insert_pos] + nl + "</div>" + nl + raw[insert_pos:]

print(f"✅ Step 1: Inserted </div> before Leads View comment at char {insert_pos}")

# Step 2: Remove the orphan </div> that originally closed inventory-view 
# It's at the end of the main-screen, after all views
# Find: </div>\n<!-- ===== END service-view ===== -->
old_end = raw.find("</div>\n<!-- ===== END service-view ===== -->")
if old_end > 0:
    # We need to remove just ONE </div> from this location
    # The structure was: ...</div>\n<!-- ===== END service-view ===== -->\n\n<button class="fab"...
    # After our insert, we now have an extra </div>
    # Remove the one just before "<!-- ===== END service-view"
    raw = raw[:old_end] + raw[old_end + len("</div>"):]
    print(f"✅ Step 2: Removed orphan </div> before END service-view comment")

# Write back
with open(p, "w", encoding="utf-8-sig", newline="") as f:
    f.write(raw.replace("\r\n", "\n"))

print("✅ Fix applied to index.html")
