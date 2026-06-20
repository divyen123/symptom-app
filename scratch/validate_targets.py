import sys

sys.stdout.reconfigure(encoding='utf-8')
file_path = r"c:\Projects\symptom-app\src\App.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

targets = [
    # 1. ConfirmDialog backdrop
    '''      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,31,92,0.55)",
          backdropFilter: "blur(6px)", zIndex: 10000, animation: "fadeIn 0.15s ease both",
        }}
      />''',
    # 2. SelfCareDetailModal overlay
    '''      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 23, 0.5)", zIndex: 4000, animation: "fadeIn 0.2s ease both" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4001, pointerEvents: "none", padding: "16px" }}>''',
    # 3. ConditionDetailModal overlay
    '''      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 23, 0.5)", zIndex: 4000, animation: "fadeIn 0.2s ease both" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4001, pointerEvents: "none", padding: "16px" }}>''',
    # 4. MedicalIdModal overlay & declaration
    '''function MedicalIdModal({ settings, savedMedicines, onClose }) {
  const profileInitial = (settings.name || "?")[0].toUpperCase();
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 9999 }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, pointerEvents: "none", padding: 20 }}>''',
    # 5. MedicalIdModal medications section
    '''          {/* Medications Section */}
          <div style={{ padding: "24px" }}>
            <h4 style={{
              margin: "0 0 16px", fontSize: 13, fontWeight: 700,
              color: "var(--text-faint, #94a3b8)", textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              💊 Current Medications
            </h4>
            {savedMedicines?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {savedMedicines.map((m, i) => (
                  <div key={m.id || m.name || i} style={{
                    padding: "10px 14px", borderRadius: 10,
                    background: "var(--surface, #f8fafc)",
                    border: "1px solid var(--border, #e2e8f0)",
                    fontSize: 14, fontWeight: 600,
                    color: "var(--text, #334155)",
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: "#e11d48", flexShrink: 0,
                    }} />
                    {m.name}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: "20px", textAlign: "center",
                color: "var(--text-muted, #94a3b8)", fontSize: 13, fontStyle: "italic",
              }}>
                No medications saved yet
              </div>
            )}
          </div>''',
    # 6. Emergency component props & instantiations
    '''function Emergency({ settings = {}, onSettingsChange, savedMedicines = [] }) {''',
    '''      {medicalIdOpen && <MedicalIdModal settings={settings} savedMedicines={savedMedicines} onClose={() => setMedicalIdOpen(false)} />}''',
    # 7. ReportModal overlay & declaration & delete button
    '''function ReportModal({ r, onClose, onDelete }) {
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";''',
    '''      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(4px)", zIndex: 10000, animation: "fadeIn 0.2s ease both",
        }}
      />''',
    '''            <button
              onClick={() => { onDelete(r.id); onClose(); }}
              style={{
                background: "var(--bg-red)", color: "var(--text-red-light)", border: "1px solid var(--border-red)",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)",
              }}
            >🗑 Delete</button>''',
    # 8. GoogleModal overlay
    '''      <div
        onClick={() => setShowGoogleModal(false)}
        style={{
          position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)", zIndex: 10000, animation: "fadeIn 0.2s ease both"
        }}
      />''',
    # 9. Self-care suggestions
    '''          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
            🌿 Self-Care Suggestions <span style={{ color: "var(--blue)", textTransform: "none", fontSize: 10, marginLeft: 6, fontWeight: 600 }}>• Click cards for interactive guides</span>
          </div>''',
    '''            {report.selfCare.map((t, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "var(--surface)",
                borderRadius: "var(--radius-sm)",
                padding: "12px 14px",
                border: "1px solid var(--border)",
                lineHeight: 1.55,
                animation: `fadeUp 0.3s ease ${0.26 + i * 0.05}s both`,
                transition: "var(--transition)",
                cursor: "pointer",
              }}
                onClick={() => setActiveSuggestion({ text: t, index: i })}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--blue-pale)";
                  e.currentTarget.style.borderColor = "var(--blue-border)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--surface)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >''',
    # 10. Wellness Explore More
    '''        <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginBottom: 16 }}>Explore More</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={() => setActive('meditown')} className="btn-primary" style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              🏙️ Visit MeDiTown
            </button>
            <button onClick={() => setActive('medicure')} className="btn-primary" style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
              🥗 MediCure Recipe
            </button>
          </div>
        </div>''',
    # 11. MediTown Back button
    '''      <PageBackButton onClick={onBack} />''',
    # 12. navigateBack definition
    '''  const navigateBack = useCallback(() => {
    innerBackRef.current = null;
    const stack = navStackRef.current;
    const cur = stack[stack.length - 1];
    if (cur === "medicure" || cur === "meditown") stack.pop();
    if (stack[stack.length - 1] !== "tips") stack.push("tips");
    isPopNavRef.current = true;
    setActive("tips");
    setPageKey(k => k + 1);
    setMobileMenuOpen(false);
    window.history.pushState({ page: "tips" }, "", "#tips");
  }, []);''',
    # 13. Scale transformation for root
    '''    // Font size scale — use CSS transform to scale all hardcoded px sizes
    const scale = FONT_SIZE_OPTIONS.find(f => f.value === appearance.fontSize)?.scale || 1;
    const appRoot = document.getElementById("root");
    if (appRoot) {
      appRoot.style.transform = `scale(${scale})`;
      appRoot.style.transformOrigin = "top left";
      appRoot.style.width = `${100 / scale}%`;
      appRoot.style.height = `${100 / scale}vh`;
      appRoot.style.overflow = "hidden";
    }''',
    # 14. main content rendering wrapper style
    '''        <main className="main-content" style={{
          flex: 1, overflowY: "auto",
          background: "var(--surface)",
        }}>
          <div style={{ width: "100%", maxWidth: 960, minWidth: 0, margin: "0 auto", padding: "0 24px", boxSizing: "border-box" }}>
            <div key={pageKey} className="page-enter">
              {renderContent()}
            </div>
          </div>
        </main>''',
    # 15. Medicine List popover panel header
    '''              {/* Header */}
              <div style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>💊</span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "-0.2px" }}>Medicine List</div>
                    <div style={{ color: "rgba(191,219,254,0.85)", fontSize: 11, fontWeight: 600 }}>{savedMedicines.length} saved · tap to buy / refer</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowMedList(false)}
                  style={{
                    background: "rgba(255,255,255,0.15)", border: "none",
                    borderRadius: "50%", width: 26, height: 26,
                    cursor: "pointer", color: "#fff", fontSize: 15,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>''',
    # 16. Pain Levels Stable / Recurring Symptoms in History dark theme
    '''              } else {
                insights.push({ icon: "📊", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe",
                  title: "Pain Levels Stable",
                  desc: `Your pain is steady around ${avgRecent.toFixed(1)}/10 across recent and older reports.` });
              }
            }

            const recurringSymptoms = Object.entries(freq).filter(([, c]) => c >= 3);
            if (recurringSymptoms.length > 0) {
              insights.push({ icon: "🔄", color: "#7c3aed", bg: "#fdf4ff", border: "#e9d5ff",
                title: "Recurring Symptoms",
                desc: `${recurringSymptoms.map(([s, c]) => `${s} (${c}×)`).join(", ")} — may indicate a chronic pattern.` });
            }''',
    # 17. Case emergency instantiation in App
    '''      case "emergency":return <Emergency settings={settings} onSettingsChange={handleSettingsChange} savedMedicines={savedMedicines} />;'''
]

for idx, t in enumerate(targets):
    count = content.count(t)
    print(f"Target {idx + 1}: Found {count} occurrences.")
    if count != 1:
        print("WARNING: Expected exactly 1 occurrence!")
