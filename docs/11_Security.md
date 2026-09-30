# 11 Engineer Security Sandbox & Policies

- **Pre-flight Scope Enforcement**: Every scan validates the target against authorized internal namespaces.
- **Static Analysis (SAST)**: Detects dynamic code evaluation, SQL concatenation, and insecure CORS.
- **Secret Detection**: Scans for AWS, GitHub, and generic high-entropy API keys.
- **Automated Retesting**: Verifies remediation before allowing deployment.
