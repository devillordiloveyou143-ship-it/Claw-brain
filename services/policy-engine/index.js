/**
 * Policy Engine / POLICE
 * RBAC, ABAC, Tool Authorization, Network/Filesystem bounds, Approval requirements
 */

class PolicyEngine {
  constructor() {
    this.policies = [
      {
        id: 'pol_core_security',
        name: 'Prevent Destructive Execution on Host',
        effect: 'DENY',
        condition: (req) => {
          if (req.tool === 'terminal' || req.tool === 'exec') {
            const cmd = (req.params.command || '').toLowerCase();
            const destructive = ['rm -rf /', 'mkfs', 'dd if=', ':(){ :|:& };:', 'chmod -R 777 /'];
            if (destructive.some(d => cmd.includes(d))) return true;
          }
          return false;
        },
        reason: 'Execution would cause catastrophic host corruption'
      },
      {
        id: 'pol_approval_gate',
        name: 'Human Approval for Destructive or Production Changes',
        effect: 'REQUIRE_APPROVAL',
        condition: (req) => {
          if (req.tool === 'deploy' && req.params.environment === 'production' && !req.params.preApproved) {
            return true;
          }
          if (req.tool === 'database' && /drop\s+database|truncate/i.test(req.params.query || '')) {
            return true;
          }
          return false;
        },
        reason: 'Production deployments and destructive DB operations require explicit authorized sign-off'
      },
      {
        id: 'pol_sec_scope',
        name: 'Engineer Security Sandbox Target Authorization',
        effect: 'DENY',
        condition: (req) => {
          if (req.tool === 'security_scan') {
            const target = req.params.target || '';
            const authorized = ['localhost', '127.0.0.1', 'pandav-doctor', 'pandav-staging', 'internal.cluster.local'];
            if (!authorized.some(a => target.includes(a))) {
              return true;
            }
          }
          return false;
        },
        reason: 'Security assessments strictly prohibited against unauthorized third-party targets'
      }
    ];

    this.pendingApprovals = [];
    this.auditLogs = [];
  }

  evaluate(request) {
    const { actor, agent, tool, params, missionId } = request;

    // Default policy decision
    let decision = 'ALLOW';
    let rationale = 'Complies with all standard autonomy rules';
    let triggeredPolicy = null;

    for (const pol of this.policies) {
      if (pol.condition(request)) {
        decision = pol.effect;
        rationale = pol.reason;
        triggeredPolicy = pol.id;
        break;
      }
    }

    const logEntry = {
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      actor: actor || agent || 'system',
      agent: agent || 'system',
      missionId: missionId || null,
      tool,
      params: this.sanitizeParams(params),
      decision,
      rationale,
      policyId: triggeredPolicy
    };

    this.auditLogs.unshift(logEntry);

    if (decision === 'REQUIRE_APPROVAL') {
      const approval = {
        approvalId: 'appr_' + Date.now(),
        missionId,
        request,
        reason: rationale,
        status: 'PENDING',
        created_at: Date.now()
      };
      this.pendingApprovals.push(approval);
      return { decision, rationale, approvalId: approval.approvalId };
    }

    return { decision, rationale };
  }

  approve(approvalId, approver = 'admin') {
    const item = this.pendingApprovals.find(a => a.approvalId === approvalId);
    if (!item) return { success: false, error: 'Approval not found' };
    item.status = 'APPROVED';
    item.approver = approver;
    item.resolved_at = Date.now();

    this.auditLogs.unshift({
      id: 'audit_' + Date.now(),
      timestamp: Date.now(),
      actor: approver,
      tool: 'policy.approve',
      params: { approvalId },
      decision: 'ALLOW',
      rationale: `Manual human approval granted by ${approver}`
    });

    return { success: true, item };
  }

  reject(approvalId, approver = 'admin', reason = 'Rejected by operator') {
    const item = this.pendingApprovals.find(a => a.approvalId === approvalId);
    if (!item) return { success: false, error: 'Approval not found' };
    item.status = 'REJECTED';
    item.approver = approver;
    item.rejectionReason = reason;
    item.resolved_at = Date.now();
    return { success: true, item };
  }

  sanitizeParams(params) {
    if (!params) return {};
    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'private_key'];
    for (const k of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
        sanitized[k] = '***REDACTED***';
      }
    }
    return sanitized;
  }

  getAuditLogs(limit = 100) {
    return this.auditLogs.slice(0, limit);
  }
}

module.exports = { PolicyEngine };
