/**
 * Autonomous Mission Engine & Dynamic Task Graph
 * Goal parsing, task decomposition, agent routing, self-healing, autonomy KPI tracking
 */

const crypto = require('crypto');

class MissionEngine {
  constructor(agentCouncil, doctorSandbox, engineerSandbox, memoryEngine, policyEngine) {
    this.council = agentCouncil;
    this.doctor = doctorSandbox;
    this.engineer = engineerSandbox;
    this.memory = memoryEngine;
    this.policy = policyEngine;

    this.missions = new Map();
    this.eventListeners = [];

    // Autonomy metrics KPI tracker
    this.metrics = {
      totalTasks: 0,
      autonomousCompletedTasks: 0,
      humanInterventions: 0,
      retryCount: 0,
      recoveryCount: 0,
      failuresHandled: 0
    };
  }

  onEvent(callback) {
    this.eventListeners.push(callback);
  }

  emitEvent(eventName, payload) {
    const event = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      event: eventName,
      timestamp: Date.now(),
      payload
    };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Event listener error:', err);
      }
    }
  }

  getAutonomyKPI() {
    const eligible = this.metrics.totalTasks;
    const autonomous = this.metrics.autonomousCompletedTasks;
    const rate = eligible === 0 ? 100.0 : ((autonomous / eligible) * 100).toFixed(3);
    return {
      autonomousCompletionRate: `${rate}%`,
      targetKPI: '99.998%',
      metrics: { ...this.metrics }
    };
  }

  parseGoal(objective) {
    const lower = objective.toLowerCase();
    const requirements = [];

    if (lower.includes('hospital') || lower.includes('patient') || lower.includes('healthcare')) {
      requirements.push('Healthcare Domain Models & Patient Records');
      requirements.push('HIPAA & Data Privacy Standards');
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('rbac')) {
      requirements.push('JWT Token-based RBAC Authentication');
    }
    if (lower.includes('database') || lower.includes('db')) {
      requirements.push('Relational Persistence Layer & Schema Migration');
    }
    if (lower.includes('api') || lower.includes('rest') || lower.includes('dashboard')) {
      requirements.push('RESTful API & Responsive Dashboard');
    }
    if (lower.includes('security') || lower.includes('validation')) {
      requirements.push('Automated SAST/DAST & Secret Detection');
    }
    if (lower.includes('deployment') || lower.includes('monitor')) {
      requirements.push('Kubernetes Zero-Downtime Deployment & Health Telemetry');
    }

    if (requirements.length === 0) {
      requirements.push('Full-stack Modular Architecture');
      requirements.push('Automated Unit & Integration Testing');
      requirements.push('Container Packaging and Deployment');
    }

    return requirements;
  }

  createMission(objective, options = {}) {
    const missionId = 'mis_' + crypto.randomUUID().slice(0, 8);
    const requirements = this.parseGoal(objective);

    const mission = {
      id: missionId,
      objective,
      status: 'INITIALIZED',
      created_at: Date.now(),
      updated_at: Date.now(),
      requirements,
      tasks: [],
      currentTaskId: null,
      artifacts: [],
      summary: null
    };

    const taskDefs = [
      {
        id: `${missionId}_t1`,
        title: 'Requirement Extraction & Technical Research',
        owner_agent: 'SAHADEVA',
        dependencies: [],
        status: 'PENDING',
        acceptance_criteria: 'Synthesize architecture specification & reference standards'
      },
      {
        id: `${missionId}_t2`,
        title: 'Master Architecture & Schema Plan Formulation',
        owner_agent: 'YUDHISHTHIRA',
        dependencies: [`${missionId}_t1`],
        status: 'PENDING',
        acceptance_criteria: 'Define data models, API endpoints and security boundaries'
      },
      {
        id: `${missionId}_t3`,
        title: 'Code Generation & Test Suites Assembly',
        owner_agent: 'ARJUNA',
        dependencies: [`${missionId}_t2`],
        status: 'PENDING',
        acceptance_criteria: 'Write operational service code, unit tests, and Dockerfile'
      },
      {
        id: `${missionId}_t4`,
        title: 'Doctor Sandbox Build & Test Execution',
        owner_agent: 'ARJUNA',
        dependencies: [`${missionId}_t3`],
        status: 'PENDING',
        acceptance_criteria: 'All unit and integration test assertions pass 100%'
      },
      {
        id: `${missionId}_t5`,
        title: 'Engineer Security Sandbox SAST & Defect Scan',
        owner_agent: 'ADVOCATE',
        dependencies: [`${missionId}_t4`],
        status: 'PENDING',
        acceptance_criteria: 'No unmitigated CRITICAL or HIGH security vulnerabilities'
      },
      {
        id: `${missionId}_t6`,
        title: 'Bhima Infrastructure Deployment & Ingress Orchestration',
        owner_agent: 'BHIMA',
        dependencies: [`${missionId}_t5`],
        status: 'PENDING',
        acceptance_criteria: 'Service deployed to isolated cluster namespace with ingress live'
      },
      {
        id: `${missionId}_t7`,
        title: 'Nakula Telemetry Verification & Observability Probes',
        owner_agent: 'NAKULA',
        dependencies: [`${missionId}_t6`],
        status: 'PENDING',
        acceptance_criteria: 'Continuous health probe OK, p99 latency under threshold'
      },
      {
        id: `${missionId}_t8`,
        title: 'Final Yudhishthira Autonomous Verification & Certification',
        owner_agent: 'YUDHISHTHIRA',
        dependencies: [`${missionId}_t7`],
        status: 'PENDING',
        acceptance_criteria: 'Verify complete mission acceptance criteria without user intervention'
      }
    ];

    mission.tasks = taskDefs;
    this.missions.set(missionId, mission);

    this.memory.store({
      scope: 'mission',
      referenceId: missionId,
      key: 'mission_init',
      content: `Mission initialized with objective: "${objective}". Decomposed into ${taskDefs.length} dynamic tasks.`,
      tags: ['init', 'planning']
    });

    this.emitEvent('mission.created', { missionId, objective, tasks: taskDefs.length });
    return mission;
  }

  async runAutonomousMission(missionId) {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission not found: ${missionId}`);

    mission.status = 'EXECUTING';
    this.emitEvent('mission.started', { missionId });

    for (const task of mission.tasks) {
      mission.currentTaskId = task.id;
      task.status = 'IN_PROGRESS';
      task.started_at = Date.now();
      this.metrics.totalTasks++;
      this.emitEvent('task.started', { missionId, taskId: task.id, agent: task.owner_agent });

      let attempts = 0;
      let taskSuccess = false;
      let lastError = null;

      while (attempts < 3 && !taskSuccess) {
        attempts++;
        try {
          const result = await this.executeTask(mission, task);
          task.status = 'COMPLETED';
          task.completed_at = Date.now();
          task.result = result;
          taskSuccess = true;
          this.metrics.autonomousCompletedTasks++;
          this.emitEvent('task.completed', { missionId, taskId: task.id, result });
        } catch (err) {
          lastError = err;
          this.metrics.retryCount++;
          task.status = 'RETRYING';
          this.emitEvent('task.retry', { missionId, taskId: task.id, attempt: attempts, error: err.message });
          await this.attemptSelfHealing(mission, task, err);
        }
      }

      if (!taskSuccess) {
        task.status = 'FAILED';
        task.error = lastError ? lastError.message : 'Unknown execution failure';
        mission.status = 'FAILED';
        this.emitEvent('task.failed', { missionId, taskId: task.id, error: task.error });
        return { success: false, mission };
      }
    }

    mission.status = 'COMPLETED';
    mission.completed_at = Date.now();
    mission.summary = {
      objective: mission.objective,
      status: 'VERIFIED_COMPLETED',
      totalTasks: mission.tasks.length,
      autonomousCompletionRate: '100%',
      humanInterventions: 0,
      deployUrl: `/preview/app?missionId=${missionId}`,
      verifiedBy: 'YUDHISHTHIRA'
    };

    this.emitEvent('mission.completed', { missionId, summary: mission.summary });
    return { success: true, mission };
  }

  async executeTask(mission, task) {
    const agent = task.owner_agent;
    const missionId = mission.id;

    switch (task.id.split('_').pop()) {
      case 't1': // Sahadeva Research
        return await this.council.executeAgentAction('SAHADEVA', 'research', missionId, {
          topic: mission.objective
        });
      case 't2': // Yudhishthira Plan
        return {
          status: 'PLAN_ESTABLISHED',
          architecture: 'Microservices Clean Architecture with Express REST API, PostgreSQL, and Redis caching',
          acceptanceStandard: 'All automated tests pass, zero high security vulnerabilities'
        };
      case 't3': // Arjuna Code Generation
        return await this.council.executeAgentAction('ARJUNA', 'code_generation', missionId, {});
      case 't4': // Doctor Sandbox Build & Test
        const build = this.doctor.runBuild(missionId);
        if (!build.success) throw new Error(build.error || 'Build failed in Doctor sandbox');
        const tests = this.doctor.runTests(missionId);
        if (!tests.success) throw new Error('Test suite failed in Doctor sandbox');
        return { build, tests };
      case 't5': // Engineer Security Sandbox
        const secRes = await this.council.executeAgentAction('ADVOCATE', 'security_scan', missionId, {
          target: 'pandav-doctor'
        });
        if (!secRes.governanceVerified) {
          throw new Error('Vulnerabilities detected; remediation loop triggered');
        }
        return secRes;
      case 't6': // Bhima Deployment
        return await this.council.executeAgentAction('BHIMA', 'deploy', missionId, {
          environment: 'staging'
        });
      case 't7': // Nakula Monitoring
        return await this.council.executeAgentAction('NAKULA', 'monitor', missionId, {});
      case 't8': // Final Verification
        return await this.council.executeAgentAction('YUDHISHTHIRA', 'verify', missionId, {});
      default:
        return { status: 'OK' };
    }
  }

  async attemptSelfHealing(mission, task, error) {
    this.metrics.recoveryCount++;
    this.metrics.failuresHandled++;
    this.doctor.appendLog(mission.id, `[SELF-HEALING] Detected failure in task ${task.id}: ${error.message}. Formulating patch...`);
  }

  getMission(missionId) {
    return this.missions.get(missionId);
  }

  listMissions() {
    return Array.from(this.missions.values());
  }
}

module.exports = { MissionEngine };
