import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = r"c:\Projects\symptom-app\src\App.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "symptom" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
