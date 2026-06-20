import sys
import re

sys.stdout.reconfigure(encoding='utf-8')
file_path = r"c:\Projects\symptom-app\src\App.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Delete MediCureRecipe component definition entirely
print("Deleting MediCureRecipe component definition...")
start_marker = "// ─── MEDICURE RECIPE ──────────────────────────────────────────────────────────"
end_marker = "// ─── MEDITOWN VIEW ─────────────────────────────────────────────────────────────"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]
    print("✓ Successfully deleted MediCureRecipe component definition.")
else:
    print("WARNING: Could not find markers for MediCureRecipe definition!")

# Helper for standard replacements
def replace_exact(target, replacement, desc):
    global content
    count = content.count(target)
    if count == 1:
        content = content.replace(target, replacement)
        print(f"✓ Replaced: {desc}")
    elif count > 1:
        # If there are multiple occurrences but we only want to replace specific ones, we will do it carefully
        print(f"WARNING: Multiple occurrences ({count}) for '{desc}' - skipped to avoid corruption!")
    else:
        print(f"WARNING: Target not found for '{desc}'!")

# 2. ConfirmDialog backdrop overlay
replace_exact(
    '''      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,31,92,0.55)",
          backdropFilter: "blur(6px)", zIndex: 10000, animation: "fadeIn 0.15s ease both",
        }}
      />''',
    '''      <div
        onClick={onCancel}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 10000, animation: "fadeIn 0.15s ease both",
        }}
      />''',
    "ConfirmDialog backdrop overlay"
)

# 3. SelfCareDetailModal overlay & positioning
# The Target has 2 occurrences in the file, one in SelfCareDetailModal and one in ConditionDetailModal.
# Since we want to replace BOTH with the same fixed/blurred style, we can do it using replace if we allow it,
# but we want to change zIndex slightly differently or the same?
# Let's check: both can use position: fixed, zIndex 9999 for overlay and 10000 for container.
# So replacing both occurrences is actually perfect!
count = content.count('''      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 23, 0.5)", zIndex: 4000, animation: "fadeIn 0.2s ease both" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4001, pointerEvents: "none", padding: "16px" }}>''')
if count == 2:
    content = content.replace(
        '''      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2, 6, 23, 0.5)", zIndex: 4000, animation: "fadeIn 0.2s ease both" }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4001, pointerEvents: "none", padding: "16px" }}>''',
        '''      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 9999, animation: "fadeIn 0.2s ease both" }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, pointerEvents: "none", padding: "16px" }}>'''
    )
    print("✓ Replaced both SelfCareDetailModal and ConditionDetailModal absolute positioning/backdrop overlays.")
else:
    print(f"WARNING: Expected 2 occurrences of absolute overlays, found {count}!")

# 4. MedicalIdModal overlay and signature
replace_exact(
    '''function MedicalIdModal({ settings, savedMedicines, onClose }) {
  const profileInitial = (settings.name || "?")[0].toUpperCase();
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", zIndex: 9999 }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, pointerEvents: "none", padding: 20 }}>''',
    '''function MedicalIdModal({ settings, savedMedicines, reports = [], onClose }) {
  const profileInitial = (settings.name || "?")[0].toUpperCase();
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 9999 }} />
      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, pointerEvents: "none", padding: 20 }}>''',
    "MedicalIdModal signature and backdrop blur"
)

# 5. MedicalIdModal medications section to recent report
replace_exact(
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
    '''          {/* Recent Report Section */}
          <div style={{ padding: "24px" }}>
            <h4 style={{
              margin: "0 0 16px", fontSize: 13, fontWeight: 700,
              color: "var(--text-faint, #94a3b8)", textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}>
              📋 Recent Health Report
            </h4>
            {reports && reports.length > 0 ? (() => {
              const latest = reports[reports.length - 1];
              const sColor = severityColor(latest.severityLevel);
              const sBg = severityBg(latest.severityLevel);
              return (
                <div style={{
                  padding: "16px", borderRadius: 12,
                  background: "var(--surface, #f8fafc)",
                  border: "1px solid var(--border, #e2e8f0)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                      {new Date(latest.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <Badge color={sColor} bg={sBg}>
                      {latest.severityLevel}
                    </Badge>
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14.5, marginBottom: 8 }}>
                    {latest.condition && latest.condition !== "None" ? latest.condition : "General Health Check"}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {latest.symptoms.map((s, idx) => (
                      <span key={idx} style={{
                        background: "var(--blue-pale)", color: "var(--navy)",
                        border: "1px solid var(--blue-border)",
                        borderRadius: 99, padding: "3px 10px", fontSize: 11, fontWeight: 600
                      }}>{s}</span>
                    ))}
                  </div>
                </div>
              );
            })() : (
              <div style={{
                padding: "20px", textAlign: "center",
                color: "var(--text-muted, #94a3b8)", fontSize: 13, fontStyle: "italic",
              }}>
                No reports saved yet
              </div>
            )}
          </div>''',
    "MedicalIdModal Medications list -> Recent Report list"
)

# 6. Emergency component props & instantiations
replace_exact(
    '''function Emergency({ settings = {}, onSettingsChange, savedMedicines = [] }) {''',
    '''function Emergency({ settings = {}, onSettingsChange, savedMedicines = [], reports = [] }) {''',
    "Emergency component props list"
)

replace_exact(
    '''      {medicalIdOpen && <MedicalIdModal settings={settings} savedMedicines={savedMedicines} onClose={() => setMedicalIdOpen(false)} />}''',
    '''      {medicalIdOpen && <MedicalIdModal settings={settings} savedMedicines={savedMedicines} reports={reports} onClose={() => setMedicalIdOpen(false)} />}''',
    "Emergency MedicalIdModal call with reports prop"
)

# 7. ReportModal declaration & confirm popup integration
replace_exact(
    '''function ReportModal({ r, onClose, onDelete }) {
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";''',
    '''function ReportModal({ r, onClose, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";''',
    "ReportModal state declaration for confirmation popup"
)

replace_exact(
    '''  return createPortal(
    <>''',
    '''  return createPortal(
    <>
      {showConfirm && (
        <ConfirmDialog
          title="Delete Report?"
          message="This health report record will be permanently deleted and cannot be recovered."
          confirmLabel="Yes, Delete"
          onConfirm={() => {
            onDelete(r.id);
            onClose();
            setShowConfirm(false);
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}''',
    "ReportModal ConfirmDialog integration"
)

replace_exact(
    '''      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
          backdropFilter: "blur(4px)", zIndex: 10000, animation: "fadeIn 0.2s ease both",
        }}
      />''',
    '''      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0)",
          backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 10000, animation: "fadeIn 0.2s ease both",
        }}
      />''',
    "ReportModal backdrop overlay style"
)

replace_exact(
    '''            <button
              onClick={() => { onDelete(r.id); onClose(); }}
              style={{
                background: "var(--bg-red)", color: "var(--text-red-light)", border: "1px solid var(--border-red)",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)",
              }}
            >🗑 Delete</button>''',
    '''            <button
              onClick={() => setShowConfirm(true)}
              style={{
                background: "var(--bg-red)", color: "var(--text-red-light)", border: "1px solid var(--border-red)",
                borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13,
                fontFamily: "var(--font)",
              }}
            >🗑 Delete</button>''',
    "ReportModal delete button click to confirm"
)

# 8. GoogleModal backdrop overlay
# Let's adjust target exact string for GoogleModal spacing
replace_exact(
    '''            <div
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)",
                backdropFilter: "blur(4px)", zIndex: 10000, animation: "fadeIn 0.2s ease both"
              }}
            />''',
    '''            <div
              onClick={() => setShowGoogleModal(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0)",
                backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", zIndex: 10000, animation: "fadeIn 0.2s ease both"
              }}
            />''',
    "GoogleModal backdrop overlay style"
)

# 9. Self-care suggestions styling in analyzer results
replace_exact(
    '''          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
            🌿 Self-Care Suggestions <span style={{ color: "var(--blue)", textTransform: "none", fontSize: 10, marginLeft: 6, fontWeight: 600 }}>• Click cards for interactive guides</span>
          </div>''',
    '''          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
            🌿 Self-Care Suggestions
          </div>''',
    "Self-care Suggestions title bar without click text"
)

replace_exact(
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
              }}
              >''',
    "Self-care Suggestions card loop hover/click interactions removed"
)

# 10. Wellness Explore More block removed
replace_exact(
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
    '''        <div style={{ marginTop: 40 }} />''',
    "Wellness page Explore More buttons removal"
)

# 11. MediTown Back button label
# The back button appears inside MediTownView.
# Target:
#       <PageBackButton onClick={onBack} />
# We want to change the one inside MediTownView (line 10871, now line 10300 after deleting Medicure).
# We can replace both or specify with startline/endline, but let's do search count first.
# Since we deleted MediCureRecipe component (which had line 10436), there should only be 1 occurrence left in MediTownView!
# Let's verify by replacing:
replace_exact(
    '''      <PageBackButton onClick={onBack} />''',
    '''      <PageBackButton onClick={onBack} label="Go Back" />''',
    "MediTownView back button label"
)

# 12. navigateBack definition update
replace_exact(
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
    '''  const navigateBack = useCallback(() => {
    innerBackRef.current = null;
    const stack = navStackRef.current;
    const cur = stack[stack.length - 1];
    if (cur === "medicure" || cur === "meditown") {
      stack.pop();
    }
    const prev = stack.length > 0 ? stack[stack.length - 1] : "home";
    isPopNavRef.current = true;
    setActive(prev);
    setPageKey(k => k + 1);
    setMobileMenuOpen(false);
    window.history.pushState({ page: prev }, "", `#prev`);
  }, []);''',
    "navigateBack definition update to use dynamic history stack"
)

# 13. Scale transformation for root
replace_exact(
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
    '''    // Font size scale — use CSS transform to scale all hardcoded px sizes
    const scale = FONT_SIZE_OPTIONS.find(f => f.value === appearance.fontSize)?.scale || 1;
    const appRoot = document.getElementById("root");
    if (appRoot) {
      appRoot.style.transform = `scale(${scale})`;
      appRoot.style.transformOrigin = "top left";
      appRoot.style.width = `${100 / scale}%`;
      appRoot.style.height = `${100 / scale}%`;
      appRoot.style.position = "absolute";
      appRoot.style.top = "0";
      appRoot.style.left = "0";
      appRoot.style.overflow = "hidden";
    }''',
    "Root scale and height/position adjustment to remove bottom gap"
)

# 14. main content rendering wrapper style & Doctor AI layout fix
replace_exact(
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
    '''        <main className="main-content" style={{
          flex: 1, overflowY: active === "chatbot" ? "hidden" : "auto",
          background: "var(--surface)",
          display: active === "chatbot" ? "flex" : "block",
          flexDirection: "column",
          height: active === "chatbot" ? "100%" : "auto",
        }}>
          <div style={{ 
            width: "100%", maxWidth: 960, minWidth: 0, margin: "0 auto", padding: "0 24px", boxSizing: "border-box",
            height: active === "chatbot" ? "100%" : "auto",
            display: active === "chatbot" ? "flex" : "block",
            flexDirection: "column",
          }}>
            <div key={pageKey} className="page-enter" style={{
              height: active === "chatbot" ? "100%" : "auto",
              display: active === "chatbot" ? "flex" : "block",
              flexDirection: "column",
              flex: 1,
            }}>
              {renderContent()}
            </div>
          </div>
        </main>''',
    "main layout wrapper and Chatbot container height/overflow fix"
)

# 15. Medicine List popover panel header MediTown link
replace_exact(
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => {
                      setActive("meditown");
                      setShowMedList(false);
                    }}
                    title="Go to MeDiTown"
                    style={{
                      background: "rgba(255,255,255,0.15)", border: "none",
                      borderRadius: "50%", width: 28, height: 28,
                      cursor: "pointer", color: "#fff", fontSize: 16,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "var(--transition)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  >🏙️</button>
                  <button
                    onClick={() => setShowMedList(false)}
                    style={{
                      background: "rgba(255,255,255,0.15)", border: "none",
                      borderRadius: "50%", width: 26, height: 26,
                      cursor: "pointer", color: "#fff", fontSize: 15,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >×</button>
                </div>
              </div>''',
    "Medicine List popover panel header MediTown icon integration"
)

# 16. Pain Levels Stable / Recurring Symptoms in History dark theme
replace_exact(
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
    '''              } else {
                insights.push({ icon: "📊", color: "var(--blue)", bg: "var(--bg-blue-pale)", border: "var(--blue-border)",
                  title: "Pain Levels Stable",
                  desc: `Your pain is steady around ${avgRecent.toFixed(1)}/10 across recent and older reports.` });
              }
            }

            const recurringSymptoms = Object.entries(freq).filter(([, c]) => c >= 3);
            if (recurringSymptoms.length > 0) {
              insights.push({ icon: "🔄", color: "var(--text-purple)", bg: "var(--bg-purple-light)", border: "var(--border-purple)",
                title: "Recurring Symptoms",
                desc: `${recurringSymptoms.map(([s, c]) => `${s} (${c}×)`).join(", ")} — may indicate a chronic pattern.` });
            }''',
    "History insights colors for Pain Levels Stable and Recurring Symptoms (dark mode compatible)"
)

# 17. Case emergency instantiation in App
replace_exact(
    '''      case "emergency":return <Emergency settings={settings} onSettingsChange={handleSettingsChange} savedMedicines={savedMedicines} />;''',
    '''      case "emergency":return <Emergency settings={settings} onSettingsChange={handleSettingsChange} savedMedicines={savedMedicines} reports={reports} />;''',
    "Emergency case router rendering instantiation"
)

# 18. Case medicure removal in App router
replace_exact(
    '''      case "medicure": return (
        <MediCureRecipe
          onBack={navigateBack}
          registerInnerBack={registerInnerBack}
          pushHistoryEntry={pushHistoryEntry}
        />
      );''',
    '''''',
    "Remove medicure case rendering block from switch cases"
)

# 19. ALL_PAGES update (remove medicure)
replace_exact(
    '''  const ALL_PAGES = ["home", "analyzer", "vitals", "emergency", "hospitals", "chatbot", "reports", "history", "tips", "medicure", "meditown", "settings", "results"];''',
    '''  const ALL_PAGES = ["home", "analyzer", "vitals", "emergency", "hospitals", "chatbot", "reports", "history", "tips", "meditown", "settings", "results"];''',
    "Remove medicure page name from ALL_PAGES array"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished writing App.jsx file successfully!")
