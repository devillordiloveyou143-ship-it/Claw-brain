# 07 Layered Memory System

PANDAV AI implements four distinct memory layers:
1. **Working Memory**: Transient task context and intermediate execution tokens.
2. **Mission Memory**: Mission goals, decisions, task results, and failure logs.
3. **Project Memory**: Long-lived architectural conventions, schemas, and API contracts.
4. **Long-Term Memory**: Semantic vector index with cosine similarity search for cross-mission learning.

Memory payloads are continuously scrubbed to ensure API keys, SSH private keys, and passwords are never persisted in plain text.
