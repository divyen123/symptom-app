import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        try:
            step = json.loads(line)
            step_idx = step.get("step_index")
            if step_idx and 5850 <= step_idx <= 5900:
                tc_list = []
                if "tool_calls" in step and step["tool_calls"]:
                    tc_list = step["tool_calls"]
                elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
                    tc_list = step["content"]["tool_calls"]
                
                for tc in tc_list:
                    name = tc.get("name")
                    if "replace" in name or "write" in name:
                        args = tc.get("args", {})
                        if "App.jsx" in args.get("TargetFile", ""):
                            print(f"Step {step_idx}: {name}")
                            if name == "replace_file_content":
                                print("  TargetContent:")
                                print(args.get("TargetContent")[:200] + "...")
                                print("  ReplacementContent:")
                                print(args.get("ReplacementContent")[:200] + "...")
        except Exception as e:
            pass
