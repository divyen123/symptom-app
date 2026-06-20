import os

app_path = "src/App.jsx"
target_path = "scratch/last_target_content.txt"
replacement_path = "scratch/last_replacement_content.txt"

if not os.path.exists(target_path) or not os.path.exists(replacement_path):
    print("Error: Target or replacement content file missing.")
    exit(1)

with open(app_path, "r", encoding="utf-8") as f:
    app_content = f.read()

with open(target_path, "r", encoding="utf-8") as f:
    target_content = f.read()

with open(replacement_path, "r", encoding="utf-8") as f:
    replacement_content = f.read()

print("App content length:", len(app_content))
print("Replacement content length:", len(replacement_content))
print("Target content (original) length:", len(target_content))

# Check if replacement_content is in app_content
if replacement_content in app_content:
    print("Found replacement_content in App.jsx. Replacing...")
    new_content = app_content.replace(replacement_content, target_content)
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully restored App.jsx to pre-replacement state!")
else:
    # Let's try to do a substring check or warn
    print("Warning: replacement_content not found exactly in App.jsx.")
    # Let's check if the first 200 chars are there
    prefix = replacement_content[:200]
    if prefix in app_content:
        print("Found replacement prefix in App.jsx.")
    else:
        print("Replacement prefix not found either.")
