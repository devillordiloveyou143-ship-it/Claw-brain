# 04 System Design

PANDAV AI is architected for zero single points of failure:
- **State Machine**: Deterministic mission state transitions with event streaming.
- **Isolation**: Workspaces are partitioned by mission ID with distinct working directories.
- **Evidence Verification**: Supervisor agents require cryptographic hashes or test execution results before certifying milestone completion.
