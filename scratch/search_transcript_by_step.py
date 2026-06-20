import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            step = obj.get("step_index", 0)
            if 4250 <= step <= 4350:
                if obj.get("source") == "USER_EXPLICIT" or obj.get("type") == "USER_INPUT":
                    print(f"Step {step} USER: {obj.get('content')[:500]}")
                    print("="*60)
                elif obj.get("source") == "MODEL":
                    # print tool calls or summaries
                    tool_calls = obj.get("tool_calls", [])
                    for tc in tool_calls:
                        if tc.get("name") in ["replace_file_content", "multi_replace_file_content", "write_to_file"]:
                            desc = tc.get("args", {}).get("Description", "")
                            target = tc.get("args", {}).get("TargetFile", "")
                            print(f"Step {step} MODEL Tool {tc.get('name')} to {target}: {desc}")
                    content = obj.get("content", "")
                    if content and ("medical" in content.lower() or "symptom" in content.lower()):
                        print(f"Step {step} MODEL text: {content[:300]}")
                        print("="*60)
        except Exception as e:
            pass
