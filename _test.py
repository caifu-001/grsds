import subprocess, json, sys, io, time
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

XB = r"C:\Users\yinsu\.qclaw\skills\xbrowser\scripts\xb.cjs"

def run(args):
    cmd = ["node", XB, "run", "--browser", "default", "--timeout", "29000"]
    cmd.extend(args)
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', timeout=35)
    try:
        return json.loads(r.stdout)
    except:
        print("ERR:", r.stdout[:300] if r.stdout else "EMPTY")
        return None

# Go back to main
res = run(["click", "@e3"])  # return btn
time.sleep(0.5)

# Also try directly running JS to open admin view
res = run(["act", "--js", "switchTab('admin')"])
time.sleep(1.5)
res = run(["wait", "--load", "networkidle"])
res = run(["snapshot", "-i"])
if res and res.get("ok"):
    print("=== ADMIN SNAPSHOT ===")
    print(res["data"]["result"]["data"]["snapshot"])
    print("\n=== REFS ===")
    for k, v in res["data"]["result"]["data"]["refs"].items():
        print(f"  {k}: {v['name']} ({v['role']})")
