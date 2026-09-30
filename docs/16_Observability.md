# 16 Observability Architecture

- **Nakula SRE Agent**: Monitors p99 latency, CPU/memory consumption, and synthetic probe health.
- **Prometheus Metrics**: Scrapes  and service health endpoints every 15s.
- **OpenTelemetry Standard**: Structured traces across agent delegations and tool invocations.
