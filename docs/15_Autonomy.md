# 15 Autonomy Evaluation & KPI

## 1. Primary Autonomy Benchmark
```
Autonomous Completion Rate = (Tasks Completed Without User Intervention / Eligible Autonomous Tasks) * 100
```

## 2. Engineering Targets & Principles
- **Target**: 99.998% for eligible, authorized, routine engineering tasks.
- **Principle**: The platform measures and records autonomy as a live engineering KPI. Autonomy is never achieved by compromising security or bypassing human approval boundaries on high-risk operations.
- **Failures Handled Autonomously**: Syntax errors, test assertion failures, security remediations, and worker heartbeat timeouts trigger autonomous self-healing loops.
