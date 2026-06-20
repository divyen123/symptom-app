import json
import os

log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript_full.jsonl"
if not os.path.exists(log_path):
    log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

steps = []
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            steps.append(json.loads(line))
        except:
            pass

print("Total steps in transcript:", len(steps))
for step in steps[-5:]:
    print("---")
    print(f"Step {step.get('step_index')}, source: {step.get('source')}, type: {step.get('type')}")
    tc_list = []
    if "tool_calls" in step and step["tool_calls"]:
        tc_list = step["tool_calls"]
    elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
        tc_list = step["content"]["tool_calls"]
    
    for tc in tc_list:
        print(f"  Tool call: {tc.get('name')}")
        if tc.get("name") in ["replace_file_content", "multi_replace_file_content"]:
            args = tc.get("args", {})
            print("  Target:", args.get("TargetFile"))
            print("  Instruction:", args.get("Instruction"))
            if tc.get("name") == "replace_file_content":
                print("  TargetContent length:", len(args.get("TargetContent", "")))
                print("  ReplacementContent length:", len(args.get("ReplacementContent", "")))
