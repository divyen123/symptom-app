import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

print("Checking path:", log_path)

with open(log_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        try:
            step = json.loads(line)
            tc_list = []
            if "tool_calls" in step and step["tool_calls"]:
                tc_list = step["tool_calls"]
            elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
                tc_list = step["content"]["tool_calls"]
            
            for tc in tc_list:
                name = tc.get("name")
                if name in ["replace_file_content", "write_to_file", "multi_replace_file_content"]:
                    args = tc.get("args", {})
                    target = args.get("TargetFile", "")
                    if "App.jsx" in target:
                        print(f"Line {idx}, Step {step.get('step_index')}: {name}")
        except Exception as e:
            pass
