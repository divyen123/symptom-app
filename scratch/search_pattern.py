import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

def search_pattern(pattern, file_path=r"c:\Projects\symptom-app\src\App.jsx"):
    print(f"=== Searching for: {pattern} ===")
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    matches = []
    regex = re.compile(pattern, re.IGNORECASE)
    for idx, line in enumerate(lines):
        if regex.search(line):
            matches.append((idx + 1, line.strip()))
            
    print(f"Found {len(matches)} matches:")
    for num, content in matches[:50]:  # Limit to 50 matches
        print(f"Line {num}: {content[:120]}")
    if len(matches) > 50:
        print(f"... and {len(matches) - 50} more matches.")
    print()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        search_pattern(sys.argv[1])
    else:
        # Default searches for our tasks
        search_pattern("Medical ID")
        search_pattern("Medicure")
        search_pattern("MediTown")
        search_pattern("Medi Town")
        search_pattern("self-care suggestions")
        search_pattern("Pain Levels Stable")
