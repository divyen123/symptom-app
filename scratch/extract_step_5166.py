import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

last_replace_tc = None
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            step = json.loads(line)
            tc_list = []
            if "tool_calls" in step and step["tool_calls"]:
                tc_list = step["tool_calls"]
            elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
                tc_list = step["content"]["tool_calls"]
            
            for tc in tc_list:
                if tc.get("name") == "replace_file_content":
                    args = tc.get("args", {})
                    if "App.jsx" in args.get("TargetFile", ""):
                        # We only care about the one that broke it, which is the last replace_file_content call
                        last_replace_tc = (step.get("step_index"), args)
        except Exception as e:
            pass

if last_replace_tc:
    step_idx, args = last_replace_tc
    print(f"Found last replace_file_content in Step {step_idx}")
    with open("scratch/last_target_content.txt", "w", encoding="utf-8") as out:
        out.write(args.get("TargetContent", ""))
    with open("scratch/last_replacement_content.txt", "w", encoding="utf-8") as out:
        out.write(args.get("ReplacementContent", ""))
    print("Wrote TargetContent and ReplacementContent to scratch/ directory.")
else:
    print("No replace_file_content call found.")
