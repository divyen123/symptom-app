import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            obj = json.loads(line)
            if obj.get("source") == "USER_EXPLICIT" or obj.get("type") == "USER_INPUT":
                content = obj.get("content", "")
                if "medical" in content.lower() or "id" in content.lower():
                    print(f"Step {obj.get('step_index')}: {content}")
                    print("="*60)
        except Exception as e:
            pass
