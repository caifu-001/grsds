import sys, io, subprocess, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Check GitHub Pages deployment status
r = subprocess.run(["gh", "run", "list", "--repo", "caifu-001/grsds", "--workflow", "pages-build-deployment", "--limit", "3", "--json", "conclusion,headBranch,displayTitle,status"], 
                   capture_output=True, text=True, encoding="utf-8", errors="replace")
print("GitHub Pages deploys:")
print(r.stdout[:500] if r.stdout else "No output")
if r.stderr:
    print("stderr:", r.stderr[:300])
