import re

with open('c:/Projects/symptom-app/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded light theme colors with variables
replacements = {
    r'"linear-gradient\(135deg, #fff5f5, #fef2f2\)"': '"linear-gradient(135deg, var(--bg-red-light), var(--bg-red))"',
    r'"linear-gradient\(135deg, #fffbeb, #fef9ec\)"': '"linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))"',
    r'"linear-gradient\(135deg, var\(--blue-pale\), #f0f7ff\)"': '"linear-gradient(135deg, var(--bg-blue-pale), var(--bg-blue-light))"',
    r'"#fff5f5"': '"var(--bg-red-light)"',
    r'"#fef2f2"': '"var(--bg-red)"',
    r'"#fecaca"': '"var(--border-red)"',
    r'"#fca5a5"': '"var(--border-red-dark)"',
    r'"#dc2626"': '"var(--text-red)"',
    r'"#ef4444"': '"var(--text-red-light)"',
    
    r'"#fffbeb"': '"var(--bg-amber-light)"',
    r'"#fef9ec"': '"var(--bg-amber)"',
    r'"#fde68a"': '"var(--border-amber)"',
    
    r'"#ecfdf5"': '"var(--bg-green-light)"',
    r'"#e4f9ef"': '"var(--bg-green)"',
    r'"#a7f3d0"': '"var(--border-green)"',
    
    # only replace exact match for white background
    r'background:\s*["\']#ffffff["\']': 'background: "var(--bg-modal)"',
    r'background:\s*["\']#fff["\']': 'background: "var(--bg-modal)"',
    r'background:\s*["\']rgba\(255,255,255,1\)["\']': 'background: "var(--bg-modal)"',
}

for k, v in replacements.items():
    content = re.sub(k, v, content)

# But wait, inside string templates for `<div style="...background:${report.hasFever ? '#fef2f2' : '#ecfdf5'}...">`
content = content.replace("'#fef2f2'", "'var(--bg-red)'")
content = content.replace("'#ecfdf5'", "'var(--bg-green-light)'")
content = content.replace("'#fecaca'", "'var(--border-red)'")
content = content.replace("'#a7f3d0'", "'var(--border-green)'")

with open('c:/Projects/symptom-app/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
