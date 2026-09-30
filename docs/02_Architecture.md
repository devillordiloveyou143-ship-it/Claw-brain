# 02 Architecture Specification

## 1. Monorepo Topology
```
pandav-ai/
├── apps/
│   ├── api/              # REST & SSE Control Plane API Server
│   └── web/              # Single-page Mission & Sandbox Dashboard
├── services/
│   ├── mission-engine/   # Dynamic Task Graph & Autonomy Coordinator
│   ├── agent-runtime/    # Pandav Council (Yudhishthira, Arjuna, etc.)
│   ├── tool-runtime/     # Tool Registry & Safe Invocation
│   ├── sandbox/          # Doctor Sandbox Environment
│   ├── security-engine/  # Engineer Security Sandbox & SAST/DAST
│   ├── worker-engine/    # Army Worker Pool & Dead-Letter Queues
│   ├── memory-engine/    # 4-Layer Memory & Cosine Similarity Search
│   ├── policy-engine/    # Police RBAC/ABAC & Approval Boundaries
│   └── model-router/     # Model Abstraction & Cost/Token Tracking
└── infrastructure/       # Docker, K8s, Terraform, Prometheus
```

## 2. Dynamic Task Graph & Autonomy Loop
The system rejects rigid linear pipelines. It operates on an observable, event-driven state graph with automatic failure classification and self-healing loops:
`PLAN -> EXECUTE -> OBSERVE -> VERIFY -> CONTINUE OR RECOVER`
