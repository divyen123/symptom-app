import sys
sys.stdout.reconfigure(encoding='utf-8')

file_path = r"c:\Projects\symptom-app\src\App.jsx"
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def print_context(line_num, context_before=5, context_after=5):
    print(f"--- Context for Line {line_num} ---")
    start = max(0, line_num - context_before - 1)
    end = min(len(lines), line_num + context_after)
    for idx in range(start, end):
        print(f"{idx+1}: {lines[idx].strip()}")
    print()

print_context(1072, 15, 5)
print_context(3738, 5, 5)
print_context(3769, 5, 5)
print_context(4442, 10, 5)
print_context(10074, 10, 5)
