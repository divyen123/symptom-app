import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if "function HealthTips" in line:
            try:
                step = json.loads(line)
                step_idx = step.get("step_index")
                print(f"Step {step_idx} contains function HealthTips.")
                
                # Let's extract tool calls
                tc_list = []
                if "tool_calls" in step and step["tool_calls"]:
                    tc_list = step["tool_calls"]
                elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
                    tc_list = step["content"]["tool_calls"]
                
                for tc in tc_list:
                    name = tc.get("name")
                    if name in ["replace_file_content", "write_to_file", "multi_replace_file_content"]:
                        args = tc.get("args", {})
                        if "App.jsx" in args.get("TargetFile", ""):
                            # Write this tool call args to a file so we can view it
                            out_file = f"scratch/step_{step_idx}_{name}.txt"
                            with open(out_file, "w", encoding="utf-8") as out:
                                json.dump(args, out, indent=2)
                            print(f"Wrote args to {out_file}")
            except Exception as e:
                print("Error parsing line:", e)
