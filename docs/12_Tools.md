# 12 Tool Registry Specification

## 1. Central Tool Execution Flow
```
Agent -> Tool Request -> Police Policy Evaluation -> Scope Check -> Execution in Isolated Sandbox -> Immutable Audit Record -> Result
```

## 2. Core Operational Tools
- `fs.writeFile`: Write sandboxed files with path-traversal prevention.
- `fs.readFile`: Read isolated workspace source code.
- `fs.listFiles`: List directory structures and metadata.
- `sandbox.build`: Automated package and compile verification.
- `sandbox.test`: Execute unit and integration test assertions.
- `security.scan`: Advocate SAST and secret vulnerability scans.
- `infra.deploy`: Zero-downtime rolling deployment to staging/production clusters.
