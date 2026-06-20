import json
import sys

sys.stdout.reconfigure(encoding='utf-8')
log_path = r"C:\Users\divye\.gemini\antigravity\brain\a1216794-4f79-43db-8706-56a6fe8bee77\.system_generated\logs\transcript.jsonl"

def search_transcript(query):
    print(f"=== Searching transcript for: '{query}' ===")
    count = 0
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                obj = json.loads(line)
                content = obj.get("content", "")
                if not content and "tool_calls" in obj:
                    content = str(obj["tool_calls"])
                if query.lower() in content.lower():
                    count += 1
                    print(f"Match {count} (Step {obj.get('step_index')}, Source {obj.get('source')}):")
                    # print first 300 chars
                    print(content[:400].replace('\n', ' '))
                    print("-" * 50)
            except Exception as e:
                pass

if __name__ == "__main__":
    if len(sys.argv) > 1:
        search_transcript(sys.argv[1])
    else:
        search_transcript("Medical ID")
