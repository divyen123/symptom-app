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
                source = step.get("source")
                type_ = step.get("type")
                if source == "MODEL" and type_ in ["PLANNER_RESPONSE", "CODE_ACTION"]:
                    print(f"Step {step_idx}: source={source} type={type_}")
                    tc_list = []
                    if "tool_calls" in step and step["tool_calls"]:
                        tc_list = step["tool_calls"]
                    elif "content" in step and isinstance(step["content"], dict) and "tool_calls" in step["content"]:
                        tc_list = step["content"]["tool_calls"]
                    elif isinstance(step.get("content"), str):
                        # check if it contains JSON or block
                        pass
                    
                    for tc in tc_list:
                        name = tc.get("name")
                        args = tc.get("args", {})
                        target = args.get("TargetFile", "")
                        print(f"  Tool Call: {name}, target={target}")
                        if "App.jsx" in target:
                            # write to a file
                            out_file = f"scratch/step_{step_idx}_{name}.txt"
                            with open(out_file, "w", encoding="utf-8") as out:
                                json.dump(args, out, indent=2)
                            print(f"    Wrote args to {out_file}")
            except Exception as e:
                pass
