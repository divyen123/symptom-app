app_path = "src/App.jsx"

with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

target_str = "setActiveTip(t  // Start camera"

missing_block = """setActiveTip(t)} style={{ cursor: "pointer", position: "relative", overflow: "hidden" }}>
            {/* subtle gradient accent */}
            <div style={{
              position: "absolute", top: -20, right: -20,
              width: 80, height: 80, borderRadius: "50%",
              background: "var(--blue-pale)", opacity: 0.5,
            }} />
            <div style={{
              width: 52, height: 52, borderRadius: "var(--radius)",
              background: "var(--surface-2)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 28, marginBottom: 14, border: "1px solid var(--border)",
              position: "relative",
            }}>{t.icon}</div>
            <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 6, fontSize: 15, letterSpacing: "-0.2px" }}>{t.title}</div>
            <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.65 }}>{t.body}</p>
            <div style={{
              fontSize: 12, color: "var(--blue)", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 4,
            }}>View guide & suggestions →</div>
          </Card>
        ))}
      </div>

      
        <FeverCareGuide savedMedicines={savedMedicines} onSaveMedicine={onSaveMedicine} />

        <div style={{ marginTop: 40, borderTop: "1px solid var(--border)", paddingTop: 32 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", marginBottom: 16 }}>Explore More</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <button onClick={() => setActive('meditown')} className="btn-primary" style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "var(--blue)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(59,130,246,0.3)" }}>
              🏙️ Visit MeDiTown
            </button>
            <button onClick={() => setActive('medicure')} className="btn-primary" style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "linear-gradient(135deg, #10b981, #059669)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", border: "none", boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}>
              🥗 MediCure Recipe
            </button>
          </div>
        </div>


      {activeTip && (
        <TipDetailModal tip={activeTip} onClose={() => setActiveTip(null)} />
      )}
    </div>
  );
}

// ─── PPG SCANNER MODAL ────────────────────────────────────────────────────────
function PPGScannerModal({ onClose, onApply }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);  // hidden sampling canvas
  const waveRef = useRef(null);    // visible waveform canvas
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("idle"); // idle | waiting | calibrating | scanning | done
  const phaseRef = useRef("idle");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const updatePhase = (newPhase) => {
    phaseRef.current = newPhase;
    setPhase(newPhase);
  };
  const [countdown, setCountdown] = useState(15);
  const [liveBpm, setLiveBpm] = useState(0);
  const [finalBpm, setFinalBpm] = useState(0);
  const [finalSpo2, setFinalSpo2] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Preparing camera…");

  // Signal buffers stored in refs to avoid re-renders
  const bufRef = useRef({
    redVals: [], greenVals: [], blueVals: [],
    timestamps: [],
    baseline: 0,
    wavePoints: [],
    crossings: [],
    bpmHistory: [],
    fingerFrames: 0,
    calibFrames: 0,
    scanStart: 0,
  });

  // Start camera"""

if target_str in content:
    print("Found target string. Rebuilding App.jsx...")
    new_content = content.replace(target_str, missing_block)
    with open(app_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully restored the missing code block!")
else:
    print("Error: Target string not found in App.jsx.")
