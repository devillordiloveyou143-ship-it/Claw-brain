const assert = require('assert');
const { DatabaseDriver } = require('../../services/memory-engine/storage');
const { MemoryEngine } = require('../../services/memory-engine');
const { PolicyEngine } = require('../../services/policy-engine');
const { DoctorSandbox } = require('../../services/sandbox/doctor');
const { EngineerSecuritySandbox } = require('../../services/security-engine/engineer');
const { ModelRouter } = require('../../services/model-router/router');
const { ArmyWorkerEngine } = require('../../services/worker-engine/army');

console.log('Running PANDAV AI Unit Test Suite...');

// 1. Memory Engine
const db = new DatabaseDriver(':memory:');
const memory = new MemoryEngine(db);
const mem = memory.store({
  scope: 'mission',
  referenceId: 'mis-test-1',
  content: 'Architecture plan for hospital management system',
  tags: ['architecture']
});
assert.ok(mem.id, 'Memory ID should be generated');

// Memory Secret Protection Test
assert.throws(() => {
  memory.store({
    scope: 'mission',
    content: 'Sensitive token: ghp_123456789012345678901234567890123456'
  });
}, /Memory policy violation/, 'Memory must reject plain-text secrets');

// 2. Policy Engine (Police)
const policy = new PolicyEngine();
const allowDecision = policy.evaluate({
  actor: 'ARJUNA',
  tool: 'fs.writeFile',
  params: { path: 'server.js' }
});
assert.strictEqual(allowDecision.decision, 'ALLOW');

const denyDecision = policy.evaluate({
  actor: 'ARJUNA',
  tool: 'terminal',
  params: { command: 'rm -rf /' }
});
assert.strictEqual(denyDecision.decision, 'DENY', 'Police must block destructive commands');

// 3. Doctor Sandbox Isolation
const doctor = new DoctorSandbox('/tmp/test-doctor-ws');
const fileRes = doctor.writeFile('mis-100', 'index.js', 'console.log("hello world");');
assert.strictEqual(fileRes.status, 'written');
const content = doctor.readFile('mis-100', 'index.js');
assert.strictEqual(content, 'console.log("hello world");');

// Path traversal defense
assert.throws(() => {
  doctor.readFile('mis-100', '../../../../etc/passwd');
}, /File not found or access denied/, 'Sandbox must block directory traversal attempts');

// Snapshots and rollbacks
const snap = doctor.createSnapshot('mis-100', 'v1');
doctor.writeFile('mis-100', 'index.js', 'corrupted content');
doctor.rollbackSnapshot('mis-100', snap.snapshotId);
assert.strictEqual(doctor.readFile('mis-100', 'index.js'), 'console.log("hello world");', 'Rollback should restore files');

// 4. Engineer Security Sandbox (Advocate)
const engineer = new EngineerSecuritySandbox(policy);
const secScan = engineer.scanWorkspace('mis-100', [
  { path: 'clean.js', content: 'const x = 10;' },
  { path: 'vulnerable.js', content: 'const key = "AKIA1234567890123456"; eval(req.query.param);' }
]);
assert.strictEqual(secScan.total_findings, 2, 'Should identify API secret and eval injection');
assert.strictEqual(secScan.passed, false, 'Security gate should fail when high vulnerabilities exist');

// Retesting after remediation
engineer.retestFinding('mis-100', 'SEC-SEC-001', 'const key = process.env.AWS_KEY;');
assert.strictEqual(engineer.getFindings('mis-100')[0].verification_status, 'REMEDIATED');

// 5. Army Worker Engine
const army = new ArmyWorkerEngine(3);
const stats = army.getWorkerStats();
assert.strictEqual(stats.poolSize, 3);

// 6. Model Router
const router = new ModelRouter();
assert.ok(router.routeModelForAgent('arjuna').includes('claude-3-5-sonnet'));
assert.ok(router.routeModelForAgent('yudhishthira').includes('o1-preview'));

console.log('ALL UNIT TESTS PASSED SUCCESSFULLY (100%)');
