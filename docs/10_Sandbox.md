# 10 Doctor Sandbox Architecture

The Doctor Sandbox provides isolated development environments:
- Enforces strict path traversal defenses.
- Creates full point-in-time workspace snapshots before significant modifications.
- Instant rollback restores workspace to a verified clean state if test suites fail.
