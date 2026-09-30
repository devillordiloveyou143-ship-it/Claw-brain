# 03 System Rules & Governance

1. **Zero Micromanagement**: The user should never have to manually issue sequential commands such as 'now code', 'now test', 'now deploy'.
2. **Strict Defense in Depth**: Non-root execution by default, path-traversal prevention, memory secret-leakage blocking.
3. **Human Approval Boundaries**: Routine engineering runs 100% autonomously; high-risk actions (destructive DB drops, unverified production deletion, financial transactions) pause for human sign-off.
4. **Authorized Scope Only**: Security testing is strictly prohibited against external or unauthorized targets.
