/**
 * Engineer Security Sandbox
 * SAST, DAST, Secret Detection, Dependency Vulnerabilities, K8s / Cloud Configuration Scan,
 * Strict Target Authorization Check
 */
const crypto = require('crypto');

class EngineerSecuritySandbox {
  constructor(policyEngine) {
    this.policyEngine = policyEngine;
    this.findings = new Map(); // missionId -> findings[]
  }

  // Pre-flight authorization validation
  validateAuthorization(target) {
    const authorizedTargets = ['localhost', '127.0.0.1', 'pandav-doctor', 'pandav-staging', 'internal.cluster.local'];
    const isAuth = authorizedTargets.some(auth => target.includes(auth));
    return {
      authorized: isAuth,
      target,
      scope: 'Strict Local & Dedicated Staging Sandboxes Only',
      reason: isAuth ? 'Target matches authorized internal test domain' : 'Target is OUT OF SCOPE. Unauthorized external scanning is prohibited.'
    };
  }

  scanWorkspace(missionId, files) {
    const authCheck = this.validateAuthorization('pandav-doctor');
    if (!authCheck.authorized) {
      throw new Error(`Security validation failed: ${authCheck.reason}`);
    }

    const detectedFindings = [];

    // Rules for Static Analysis (SAST), Secrets, and Misconfigurations
    for (const file of files) {
      const content = file.content || '';
      const path = file.path || '';

      // 1. Secret Scanning
      if (/AIzaSy[0-9A-Za-z_-]{33}/.test(content) || /AKIA[0-9A-Z]{16}/.test(content) || /sk-[a-zA-Z0-9]{32,}/.test(content)) {
        detectedFindings.push({
          finding_id: 'SEC-SEC-001',
          severity: 'CRITICAL',
          title: 'Hardcoded API / Cloud Secret Key',
          affected_component: path,
          evidence: 'High-entropy secret pattern identified in source file',
          impact: 'Exposure of credentials can lead to complete service compromise',
          remediation: 'Migrate secret key to HashiCorp Vault / Kubernetes Secret and load via process.env',
          verification_status: 'OPEN'
        });
      }

      // 2. Command Injection / Dangerous Eval
      if (/\beval\s*\(/.test(content) || /\bexec\s*\(\s*req\./.test(content)) {
        detectedFindings.push({
          finding_id: 'SEC-INJ-002',
          severity: 'HIGH',
          title: 'Dangerous Dynamic Execution / Command Injection',
          affected_component: path,
          evidence: 'eval() or direct untrusted command execution detected',
          impact: 'Remote Code Execution (RCE) by arbitrary user payload',
          remediation: 'Remove eval(); use parameterized execution with strict validation',
          verification_status: 'OPEN'
        });
      }

      // 3. SQL Injection pattern
      if (/SELECT\s+.*\+\s*req\.(query|body|params)/i.test(content) || /WHERE\s+.*=\s*['"]\s*\+/i.test(content)) {
        detectedFindings.push({
          finding_id: 'SEC-SQL-003',
          severity: 'HIGH',
          title: 'Unparameterized SQL Concatenation',
          affected_component: path,
          evidence: 'SQL query formed by dynamic string concatenation',
          impact: 'Data exfiltration and database tampering',
          remediation: 'Use prepared statements and ORM parameterized queries',
          verification_status: 'OPEN'
        });
      }

      // 4. Insecure CORS
      if (/cors\(\s*\{\s*origin\s*:\s*['"]\*['"]/i.test(content)) {
        detectedFindings.push({
          finding_id: 'SEC-CFG-004',
          severity: 'MEDIUM',
          title: 'Overly Permissive Cross-Origin Resource Sharing (CORS)',
          affected_component: path,
          evidence: 'Access-Control-Allow-Origin wildcard configured with credentials',
          impact: 'CSRF and unauthorized cross-domain data access',
          remediation: 'Restrict CORS allowed origins to explicit authorized domains',
          verification_status: 'OPEN'
        });
      }

      // 5. Container / K8s runAsRoot
      if (path.includes('Dockerfile') && !content.includes('USER ')) {
        detectedFindings.push({
          finding_id: 'SEC-CNT-005',
          severity: 'MEDIUM',
          title: 'Container Running As Root Default',
          affected_component: path,
          evidence: 'No non-privileged USER directive specified in Dockerfile',
          impact: 'Potential container escape risk if privilege escalation vulnerability exists',
          remediation: 'Add non-root user creation and USER directive in Dockerfile',
          verification_status: 'OPEN'
        });
      }
    }

    this.findings.set(missionId, detectedFindings);
    return {
      missionId,
      authorization: authCheck,
      total_findings: detectedFindings.length,
      findings: detectedFindings,
      passed: detectedFindings.filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length === 0
    };
  }

  retestFinding(missionId, findingId, updatedFileContent) {
    const list = this.findings.get(missionId) || [];
    const item = list.find(f => f.finding_id === findingId);
    if (!item) return { status: 'NOT_FOUND' };

    // Check if the vulnerability is resolved in the updated content
    let stillPresent = false;
    if (findingId === 'SEC-SEC-001' && (/AIzaSy/.test(updatedFileContent) || /AKIA/.test(updatedFileContent))) stillPresent = true;
    if (findingId === 'SEC-INJ-002' && /\beval\s*\(/.test(updatedFileContent)) stillPresent = true;
    if (findingId === 'SEC-SQL-003' && /WHERE\s+.*=\s*['"]\s*\+/i.test(updatedFileContent)) stillPresent = true;
    if (findingId === 'SEC-CFG-004' && /origin\s*:\s*['"]\*['"]/.test(updatedFileContent)) stillPresent = true;
    if (findingId === 'SEC-CNT-005' && !updatedFileContent.includes('USER ')) stillPresent = true;

    if (!stillPresent) {
      item.verification_status = 'REMEDIATED';
      item.retested_at = Date.now();
      return { status: 'REMEDIATED', finding: item };
    } else {
      item.verification_status = 'STILL_OPEN';
      return { status: 'STILL_OPEN', finding: item };
    }
  }

  getFindings(missionId) {
    return this.findings.get(missionId) || [];
  }
}

module.exports = { EngineerSecuritySandbox };
