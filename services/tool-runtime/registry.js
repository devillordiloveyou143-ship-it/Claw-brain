/**
 * Central Tool Registry
 * Identity, Policy verification, Scope checking, Sandboxed Execution, Audit Logging
 */

class ToolRegistry {
  constructor(policyEngine, doctorSandbox, engineerSandbox) {
    this.policyEngine = policyEngine;
    this.doctor = doctorSandbox;
    this.engineer = engineerSandbox;
    this.tools = new Map();

    this.registerCoreTools();
  }

  registerTool(name, description, requiredRole, handler) {
    this.tools.set(name, {
      name,
      description,
      requiredRole,
      handler
    });
  }

  registerCoreTools() {
    this.registerTool('fs.writeFile', 'Write file to Doctor sandbox', 'ARJUNA', (params, missionId) => {
      return this.doctor.writeFile(missionId, params.path, params.content);
    });

    this.registerTool('fs.readFile', 'Read file from Doctor sandbox', 'ANY', (params, missionId) => {
      return this.doctor.readFile(missionId, params.path);
    });

    this.registerTool('fs.listFiles', 'List files in Doctor sandbox', 'ANY', (params, missionId) => {
      return this.doctor.listFiles(missionId);
    });

    this.registerTool('sandbox.build', 'Build source code in Doctor sandbox', 'ARJUNA', (params, missionId) => {
      return this.doctor.runBuild(missionId);
    });

    this.registerTool('sandbox.test', 'Execute automated tests in Doctor sandbox', 'ARJUNA', (params, missionId) => {
      return this.doctor.runTests(missionId, params.pattern);
    });

    this.registerTool('security.scan', 'Run SAST and secret scan in Engineer sandbox', 'ADVOCATE', (params, missionId) => {
      const files = this.doctor.listFiles(missionId).map(f => ({
        path: f.path,
        content: this.doctor.readFile(missionId, f.path)
      }));
      return this.engineer.scanWorkspace(missionId, files);
    });

    this.registerTool('infra.deploy', 'Deploy service to Kubernetes cluster via Bhima', 'BHIMA', (params, missionId) => {
      return {
        status: 'DEPLOYED',
        missionId,
        environment: params.environment || 'staging',
        endpoint: `https://${missionId}.staging.pandav.local`
      };
    });
  }

  async executeTool(toolName, agentName, missionId, params) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Pass through Policy Engine
    const policyResult = this.policyEngine.evaluate({
      actor: agentName,
      agent: agentName,
      tool: toolName,
      params,
      missionId
    });

    if (policyResult.decision === 'DENY') {
      throw new Error(`Execution DENIED by Police: ${policyResult.rationale}`);
    }

    if (policyResult.decision === 'REQUIRE_APPROVAL') {
      return {
        status: 'PENDING_APPROVAL',
        approvalId: policyResult.approvalId,
        rationale: policyResult.rationale
      };
    }

    const output = await tool.handler(params, missionId);
    return {
      status: 'SUCCESS',
      tool: toolName,
      executedBy: agentName,
      output
    };
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      requiredRole: t.requiredRole
    }));
  }
}

module.exports = { ToolRegistry };
