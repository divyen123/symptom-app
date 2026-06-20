import sys

sys.stdout.reconfigure(encoding='utf-8')
file_path = r"c:\Projects\symptom-app\src\App.jsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''function ReportModal({ r, onClose, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";

  return createPortal(
    <>'''

replacement = '''function ReportModal({ r, onClose, onDelete }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const severityColors = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444", Emergency: "#dc2626" };
  const sColor = severityColors[r.severityLevel] || "#64748b";

  return createPortal(
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
      )}'''

count = content.count(target)
if count == 1:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("✓ Successfully integrated ConfirmDialog inside ReportModal.")
else:
    print(f"ERROR: Expected 1 occurrence, found {count}!")
