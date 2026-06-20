import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

found = False
with open(log_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "HealthTips" in line and ("replace_file_content" in line or "multi_replace" in line or "write_to_file" in line or "view_file" in line):
            try:
                step = json.loads(line)
                print(f"Line {idx}, Step {step.get('step_index')}: source={step.get('source')} type={step.get('type')}")
                found = True
            except:
                pass
if not found:
    print("No matches found.")
