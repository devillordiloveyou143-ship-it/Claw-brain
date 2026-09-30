const assert = require('assert');
const { DatabaseDriver } = require('../../services/memory-engine/storage');
const { MemoryEngine } = require('../../services/memory-engine');
const { PolicyEngine } = require('../../services/policy-engine');
const { DoctorSandbox } = require('../../services/sandbox/doctor');
const { EngineerSecuritySandbox } = require('../../services/security-engine/engineer');
const { AgentCouncil } = require('../../services/agent-runtime/council');
const { MissionEngine } = require('../../services/mission-engine/engine');

async function runE2E() {
  console.log('Running Autonomous ONE-PROMPT End-to-End Mission Verification...');

  const db = new DatabaseDriver(':memory:');
  const memory = new MemoryEngine(db);
  const policy = new PolicyEngine();
  const doctor = new DoctorSandbox('/tmp/pandav-e2e-workspaces');
  const engineer = new EngineerSecuritySandbox(policy);
  const council = new AgentCouncil(policy, doctor, engineer, memory);
  const missionEngine = new MissionEngine(council, doctor, engineer, memory, policy);

  const prompt = 'Build a production-ready hospital management platform with authentication, database, dashboard, APIs, testing, security validation, deployment and monitoring.';

  // 1. Mission Acceptance & Goal Parsing
  const mission = missionEngine.createMission(prompt);
  assert.ok(mission.id, 'Mission ID must exist');
  assert.strictEqual(mission.tasks.length, 8, 'Must decompose into complete task lifecycle graph');

  // 2. Autonomous Execution (Zero-human intervention)
  const result = await missionEngine.runAutonomousMission(mission.id);
  assert.strictEqual(result.success, true, 'Autonomous mission must succeed');
  assert.strictEqual(result.mission.status, 'COMPLETED', 'Mission must reach verified COMPLETED status');

  // 3. Verify Artifacts in Doctor Sandbox
  const files = doctor.listFiles(mission.id);
  assert.ok(files.some(f => f.path === 'server.js'), 'server.js must be generated');
  assert.ok(files.some(f => f.path === 'Dockerfile'), 'Dockerfile must be generated');

  // 4. Verify Security Validation by Advocate & Engineer Sandbox
  const secFindings = engineer.getFindings(mission.id);
  const openCriticals = secFindings.filter(f => (f.severity === 'CRITICAL' || f.severity === 'HIGH') && f.verification_status !== 'REMEDIATED');
  assert.strictEqual(openCriticals.length, 0, 'Zero unmitigated critical security findings');

  // 5. Verify Autonomy KPI Metric
  const kpi = missionEngine.getAutonomyKPI();
  assert.strictEqual(kpi.metrics.humanInterventions, 0, 'Zero human interventions for routine autonomous flow');
  assert.strictEqual(kpi.autonomousCompletionRate, '100.000%', 'Autonomous completion rate must hit 100% on eligible tasks');

  console.log('ONE-PROMPT AUTONOMOUS E2E RUN VERIFIED AND PASSED (100%)');
}

runE2E().catch(err => {
  console.error('E2E Failure:', err);
  process.exit(1);
});
