#!/usr/bin/env python3
"""Scouting v2: inject from files."""
import sys, os

base = r"D:\1kaifa\grsds"

with open(os.path.join(base, "index.html"), "r", encoding="utf-8") as f:
    c = f.read()

changes = []

def do_replace(old_file, new_file, label):
    with open(old_file, "r", encoding="utf-8") as f:
        old = f.read()
    with open(new_file, "r", encoding="utf-8") as f:
        new = f.read()
    if old in c:
        c2 = c.replace(old, new)
        changes.append(f"OK: {label}")
        return c2
    else:
        changes.append(f"FAIL: {label} - not found")
        return c

c = do_replace(f"{base}\\_sctb_old.txt", f"{base}\\_sctb_new.txt", "1. toolbar filters")
c = do_replace(f"{base}\\_sccmp_old.txt", f"{base}\\_sccmp_new.txt", "2. analytics HTML")
c = do_replace(f"{base}\\_scrdr_old.txt", f"{base}\\_scrdr_new.txt", "3. renderScouting filter+stats")
c = do_replace(f"{base}\\_sccomp_old.txt", f"{base}\\_sccomp_new.txt", "4. analytics charts")
c = do_replace(f"{base}\\_scapp_old.txt", f"{base}\\_scapp_new.txt", "5. one-click pipeline")

with open(os.path.join(base, "index.html"), "w", encoding="utf-8") as f:
    f.write(c)

for ch in changes:
    print(ch)
print("=== Done ===")
