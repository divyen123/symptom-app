import re

path = 'c:/Projects/symptom-app/src/App.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update GLOBAL_CSS variables for :root
root_old = """  :root {
    --navy: #0f1f5c;
    --navy-mid: #1e3a8a;
    --blue: #2563eb;
    --blue-light: #3b82f6;
    --blue-pale: #eff6ff;
    --blue-border: #dbeafe;
    --slate: #64748b;
    --slate-light: #94a3b8;
    --surface: #f8faff;
    --surface-2: #f1f5fd;
    --white: #ffffff;
    --border: #e2e8f8;
    --text: #1e293b;
    --text-muted: #64748b;
    --text-faint: #94a3b8;
    --red: #ef4444;
    --red-dark: #dc2626;
    --green: #10b981;
    --amber: #f59e0b;
    --radius-sm: 8px;
    --radius: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(15,31,92,0.06), 0 1px 2px rgba(15,31,92,0.04);
    --shadow: 0 4px 16px rgba(15,31,92,0.08), 0 1px 4px rgba(15,31,92,0.04);
    --shadow-lg: 0 12px 40px rgba(15,31,92,0.12), 0 4px 12px rgba(15,31,92,0.06);
    --shadow-blue: 0 8px 32px rgba(37,99,235,0.2);
    --font: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    --sidebar-width: 228px;
    --sidebar-bg: #0f1f5c;
  }"""

root_new = """  :root {
    --navy: #0f1f5c;
    --navy-mid: #1e3a8a;
    --blue: #2563eb;
    --blue-light: #3b82f6;
    --blue-pale: #eff6ff;
    --blue-border: #dbeafe;
    --slate: #64748b;
    --slate-light: #94a3b8;
    --surface: #f8faff;
    --surface-2: #f1f5fd;
    --white: #ffffff;
    --border: #e2e8f8;
    --text: #1e293b;
    --text-muted: #64748b;
    --text-faint: #94a3b8;
    --red: #ef4444;
    --red-dark: #dc2626;
    --green: #10b981;
    --amber: #f59e0b;
    --radius-sm: 8px;
    --radius: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --shadow-sm: 0 1px 3px rgba(15,31,92,0.06), 0 1px 2px rgba(15,31,92,0.04);
    --shadow: 0 4px 16px rgba(15,31,92,0.08), 0 1px 4px rgba(15,31,92,0.04);
    --shadow-lg: 0 12px 40px rgba(15,31,92,0.12), 0 4px 12px rgba(15,31,92,0.06);
    --shadow-blue: 0 8px 32px rgba(37,99,235,0.2);
    --font: 'Plus Jakarta Sans', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    --sidebar-width: 228px;
    --sidebar-bg: #0f1f5c;

    /* Semantic backgrounds and borders */
    --bg-red-light: #fff5f5;
    --bg-red: #fef2f2;
    --border-red: #fecaca;
    --border-red-dark: #fca5a5;
    --text-red: #dc2626;
    --text-red-light: #ef4444;
    --text-red-dark: #7f1d1d;

    --bg-amber-light: #fffbeb;
    --bg-amber: #fef9ec;
    --border-amber: #fde68a;
    --text-amber: #92400e;

    --bg-green-light: #ecfdf5;
    --bg-green: #e4f9ef;
    --border-green: #a7f3d0;
    --text-green: #065f46;

    --bg-blue-pale: #eff6ff;
    --bg-blue-light: #f0f7ff;
    --text-blue: #1e3a8a;

    --bg-purple-light: #fdf4ff;
    --border-purple: #e9d5ff;
    --text-purple: #7c3aed;

    --bg-modal: #ffffff;
  }"""

content = content.replace(root_old, root_new)

# 2. Update GLOBAL_CSS variables for dark theme
dark_old = """  [data-theme="dark"] {
    --navy: #e2e8f0;
    --navy-mid: #93c5fd;
    --blue: #3b82f6;
    --blue-light: #60a5fa;
    --blue-pale: #1e293b;
    --blue-border: #334155;
    --slate: #94a3b8;
    --slate-light: #64748b;
    --surface: #0f172a;
    --surface-2: #0c1322;
    --white: #1e293b;
    --border: #334155;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --text-faint: #64748b;
    --red: #f87171;
    --red-dark: #ef4444;
    --green: #34d399;
    --amber: #fbbf24;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow: 0 4px 16px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25);
    --shadow-blue: 0 8px 32px rgba(59,130,246,0.3);
    --sidebar-bg: #070d19;
  }"""

dark_new = """  [data-theme="dark"] {
    --navy: #e2e8f0;
    --navy-mid: #93c5fd;
    --blue: #3b82f6;
    --blue-light: #60a5fa;
    --blue-pale: #1e293b;
    --blue-border: #334155;
    --slate: #94a3b8;
    --slate-light: #64748b;
    --surface: #0f172a;
    --surface-2: #0c1322;
    --white: #1e293b;
    --border: #334155;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --text-faint: #64748b;
    --red: #f87171;
    --red-dark: #ef4444;
    --green: #34d399;
    --amber: #fbbf24;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow: 0 4px 16px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.25);
    --shadow-blue: 0 8px 32px rgba(59,130,246,0.3);
    --sidebar-bg: #070d19;

    /* Semantic backgrounds and borders in dark mode */
    --bg-red-light: rgba(239, 68, 68, 0.15);
    --bg-red: rgba(239, 68, 68, 0.1);
    --border-red: rgba(239, 68, 68, 0.35);
    --border-red-dark: rgba(239, 68, 68, 0.55);
    --text-red: #fca5a5;
    --text-red-light: #f87171;
    --text-red-dark: #fca5a5;

    --bg-amber-light: rgba(245, 158, 11, 0.15);
    --bg-amber: rgba(245, 158, 11, 0.1);
    --border-amber: rgba(245, 158, 11, 0.35);
    --text-amber: #fbbf24;

    --bg-green-light: rgba(16, 185, 129, 0.15);
    --bg-green: rgba(16, 185, 129, 0.1);
    --border-green: rgba(16, 185, 129, 0.35);
    --text-green: #34d399;

    --bg-blue-pale: #1e293b;
    --bg-blue-light: #0f172a;
    --text-blue: #93c5fd;

    --bg-purple-light: rgba(124, 58, 237, 0.15);
    --border-purple: rgba(124, 58, 237, 0.35);
    --text-purple: #d8b4fe;

    --bg-modal: #1e293b;
  }"""

content = content.replace(dark_old, dark_new)

# 3. Remove Settings from NAV_ITEMS
nav_old = """  { id: "tips",      icon: "◈",  label: "Wellness" },
  { id: "settings",  icon: "⚙",  label: "Settings" },
];"""

nav_new = """  { id: "tips",      icon: "◈",  label: "Wellness" },
];"""

content = content.replace(nav_old, nav_new)

# 4. Modify DisclaimerBanner style
disclaimer_old = """function DisclaimerBanner() {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))",
      border: "1px solid #fde68a",
      borderRadius: "var(--radius)",
      padding: "10px 16px",
      fontSize: 12,
      color: "#92400e",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 500,
    }}>"""

disclaimer_new = """function DisclaimerBanner() {
  return (
    <div style={{
      background: "linear-gradient(135deg, var(--bg-amber-light), var(--bg-amber))",
      border: "1px solid var(--border-amber)",
      borderRadius: "var(--radius)",
      padding: "10px 16px",
      fontSize: 12,
      color: "var(--text-amber)",
      marginBottom: 20,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontWeight: 500,
    }}>"""

content = content.replace(disclaimer_old, disclaimer_new)

# 5. Fix Emergency card borders
content = content.replace('border: "1px solid #fecaca",', 'border: "1px solid var(--border-red)",')
content = content.replace('border: "2px solid #fecaca",', 'border: "2px solid var(--border-red)",')

# 6. Fix pre-existing condition tag in Results
content = content.replace('background: "#fdf4ff", color: "#7c3aed",\n              border: "1px solid #e9d5ff",', 
                          'background: "var(--bg-purple-light)", color: "var(--text-purple)",\n              border: "1px solid var(--border-purple)",')

# 7. Fix clinical rationale white block in Results
content = content.replace('background: "rgba(255,255,255,0.75)",\n              borderRadius: "var(--radius-sm)",\n              border: "1px solid rgba(255,255,255,0.9)",',
                          'background: "var(--bg-modal)",\n              borderRadius: "var(--radius-sm)",\n              border: "1px solid var(--border)",')

# 8. Fix SelfCareDetailModal hardcoded values
content = content.replace('border: "2.5px solid #bfdbfe",', 'border: "2.5px solid var(--blue-border)",')
content = content.replace('color: "#0f172a",', 'color: "var(--navy)",')
content = content.replace('borderBottom: "1px solid #e2e8f0",', 'borderBottom: "1px solid var(--border)",')
content = content.replace('borderTop: "1px solid #e2e8f0",', 'borderTop: "1px solid var(--border)",')
content = content.replace('background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",', 'background: "linear-gradient(135deg, var(--surface), var(--surface-2))",')
content = content.replace('border: "2px solid #a7f3d0",', 'border: "2px solid var(--border-green)",')
content = content.replace('color: "#64748b",', 'color: "var(--text-muted)",')
content = content.replace('color: "#334155",', 'color: "var(--text)",')
content = content.replace('background: "#f0fdf4",', 'background: "var(--bg-green-light)",')
content = content.replace('border: "1.5px dashed #bbf7d0",', 'border: "1.5px dashed var(--border-green)",')
content = content.replace('color: "#0284c7",', 'color: "var(--blue)",')
content = content.replace('color: "#475569",', 'color: "var(--text-muted)",')
content = content.replace('color: "#10b981",', 'color: "var(--green)",')
content = content.replace('background: isChecked ? "#f0fdf4" : "#f8fafc",', 'background: isChecked ? "var(--bg-green-light)" : "var(--surface)",')
content = content.replace('border: isChecked ? "1px solid #bbf7d0" : "1px solid #e2e8f0",', 'border: isChecked ? "1px solid var(--border-green)" : "1px solid var(--border)",')
content = content.replace('color: isChecked ? "#1b6b3e" : "#334155",', 'color: isChecked ? "var(--text-green)" : "var(--text)",')
content = content.replace('border: "1.5px solid #fde68a",', 'border: "1.5px solid var(--border-amber)",')
content = content.replace('color: "#d97706",', 'color: "var(--text-amber)",')
content = content.replace('color: "#92400e",', 'color: "var(--text-amber)",')
content = content.replace('color: "#e11d48",', 'color: "var(--text-red)",')
content = content.replace('background: "#fff1f2",', 'background: "var(--bg-red-light)",')
content = content.replace('border: "1px solid #fecdd3",', 'border: "1px solid var(--border-red)",')
content = content.replace('color: "#9f1239",', 'color: "var(--text-red)",')
content = content.replace('background: isSaved ? "#fda4af" : "#e11d48",', 'background: isSaved ? "var(--border-red)" : "var(--red)",')
content = content.replace('background: "#f8fafc",', 'background: "var(--surface)",')
content = content.replace('background: "#f8fafc"', 'background: "var(--surface)"')

# 9. Fix floating Medicine List popover
content = content.replace('border: "2px solid #bfdbfe",', 'border: "2px solid var(--blue-border)",')
content = content.replace('borderBottom: idx < savedMedicines.length - 1 ? "1px solid #f1f5f9" : "none",',
                          'borderBottom: idx < savedMedicines.length - 1 ? "1px solid var(--border)" : "none",')
content = content.replace('e.currentTarget.style.background = "#f8fafc"', 'e.currentTarget.style.background = "var(--surface-2)"')
content = content.replace('background: "#fef3c7", border: "1.5px solid #fde68a",', 'background: "var(--bg-amber-light)", border: "1.5px solid var(--border-amber)",')
content = content.replace('color: "#0f172a",', 'color: "var(--navy)",')
content = content.replace('color: "#64748b",', 'color: "var(--text-muted)",')
content = content.replace('color: "#94a3b8",', 'color: "var(--text-faint)",')

# 10. Fix renderCustomTip in HealthTips
content = content.replace("color: '#0f172a',", "color: 'var(--navy)',")
content = content.replace("color: '#334155'", "color: 'var(--text)'")
content = content.replace("iconBg=\"#dbeafe\" iconColor=\"#2563eb\"", "iconBg=\"var(--bg-blue-pale)\" iconColor=\"var(--blue)\"")
content = content.replace("color=\"#0ea5e9\" bgColor=\"#e0f2fe\" borderColor=\"#bae6fd\"", "color=\"var(--blue-light)\" bgColor=\"var(--bg-blue-pale)\" borderColor=\"var(--blue-border)\"")
content = content.replace("iconBg=\"#dcfce7\" iconColor=\"#16a34a\"", "iconBg=\"var(--bg-green-light)\" iconColor=\"var(--green)\"")
content = content.replace("color=\"#16a34a\" bgColor=\"#dcfce7\" borderColor=\"#86efac\"", "color=\"var(--green)\" bgColor=\"var(--bg-green-light)\" borderColor=\"var(--border-green)\"")
content = content.replace("iconBg=\"#fef3c7\" iconColor=\"#d97706\"", "iconBg=\"var(--bg-amber-light)\" iconColor=\"var(--text-amber)\"")
content = content.replace("background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e'",
                          "background: 'var(--bg-amber-light)', border: '1px solid var(--border-amber)', color: 'var(--text-amber)'")
content = content.replace("color: '#d97706', background: '#fef3c7'", "color: 'var(--text-amber)', background: 'var(--bg-amber-light)'")
content = content.replace("border: alreadySaved ? '1.5px solid #bbf7d0' : '1.5px solid #bfdbfe'",
                          "border: alreadySaved ? '1.5px solid var(--border-green)' : '1.5px solid var(--blue-border)'")
content = content.replace("background: alreadySaved ? '#f0fdf4' : '#eff6ff'",
                          "background: alreadySaved ? 'var(--bg-green-light)' : 'var(--bg-blue-pale)'")
content = content.replace("color: alreadySaved ? '#16a34a' : '#1d4ed8'",
                          "color: alreadySaved ? 'var(--green)' : 'var(--blue)'")
content = content.replace("color: '#475569',", "color: 'var(--text-muted)',")
content = content.replace("background: 'rgba(255,255,255,0.6)',", "background: 'rgba(255,255,255,0.06)',")
content = content.replace("borderLeft: '4px solid #3b82f6'", "borderLeft: '4px solid var(--blue)'")

# 11. Fix search result container in HealthTips
content = content.replace('background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)", border: "1px solid #bae6fd",',
                          'background: "linear-gradient(135deg, var(--bg-blue-pale), var(--bg-blue-light))", border: "1px solid var(--blue-border)",')
content = content.replace('fontWeight: 800, color: "#0369a1",', 'fontWeight: 800, color: "var(--text-blue)",')
content = content.replace('borderBottom: "1px solid rgba(3,105,161,0.1)",', 'borderBottom: "1px solid var(--blue-border)",')
content = content.replace('border: "1px solid #bae6fd",', 'border: "1px solid var(--blue-border)",')
content = content.replace('color: "#0369a1",', 'color: "var(--text-blue)",')

# 12. Fix FeverCareGuide foods
content = content.replace('background: "#f0fdf4", border: "1.5px solid #bbf7d0",', 'background: "var(--bg-green-light)", border: "1.5px solid var(--border-green)",')
content = content.replace('borderColor = "#34d399"', 'borderColor = "var(--green)"')
content = content.replace('background = "#f0fdf4"', 'background = "var(--bg-green-light)"')
content = content.replace('borderColor = "#bbf7d0"', 'borderColor = "var(--border-green)"')
content = content.replace('color: "#059669",', 'color: "var(--green)",')
content = content.replace('color: "#047857",', 'color: "var(--text-green)",')
content = content.replace('background: "#d1fae5",', 'background: "var(--bg-green-light)",')

# 13. Fix FeverDetailModal rx/otc badge and buttons
content = content.replace('background: m.otc ? "var(--bg-green-light)" : "#f5f3ff",',
                          'background: m.otc ? "var(--bg-green-light)" : "var(--bg-purple-light)",')
content = content.replace('border: `1px solid ${m.otc ? "var(--border-green)" : "#ddd6fe"}`',
                          'border: `1px solid ${m.otc ? "var(--border-green)" : "var(--border-purple)"}`')
content = content.replace('alreadySaved ? \'#f0fdf4\' : \'#eff6ff\'', 'alreadySaved ? \'var(--bg-green-light)\' : \'var(--bg-blue-pale)\'')
content = content.replace('alreadySaved ? \'#16a34a\' : \'#1d4ed8\'', 'alreadySaved ? \'var(--green)\' : \'var(--blue)\'')
content = content.replace("border: alreadySaved ? '1.5px solid #bbf7d0' : '1.5px solid #bfdbfe',",
                          "border: alreadySaved ? '1.5px solid var(--border-green)' : '1.5px solid var(--blue-border)',")

# 14. Fix FeverDetailModal ingredients and warnings
content = content.replace('background: "#f0fdf4", border: "1px solid #bbf7d0"', 'background: "var(--bg-green-light)", border: "1px solid var(--border-green)"')
content = content.replace('color: "#065f46"', 'color: "var(--text-green)"')
content = content.replace('background: "#f0fdf4", borderRadius: "var(--radius)", border: "1px solid #bbf7d0"',
                          'background: "var(--bg-green-light)", borderRadius: "var(--radius)", border: "1px solid var(--border-green)"')
content = content.replace('color: "#065f46", letterSpacing: "0.1em"', 'color: "var(--text-green)", letterSpacing: "0.1em"')
content = content.replace('color: "#064e3b"', 'color: "var(--text-green)"')
content = content.replace('color: "#b91c1c"', 'color: "var(--text-red)"')
content = content.replace('color: "#7f1d1d"', 'color: "var(--text-red-dark)"')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("App.jsx patched successfully!")
