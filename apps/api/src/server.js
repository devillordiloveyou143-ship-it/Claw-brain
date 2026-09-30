/**
 * Pandav AI Core API Server
 * Exposes Unified REST & SSE Endpoints for:
 * - Web UI Frontend Delivery & Live App Preview
 * - Helper Chat
 * - Doctor Workspace
 * - Engineer Security Sandbox
 * - Mission Orchestration & Dynamic Task Graph
 * - Policy & Human Approvals
 * - Memory & Audit Trails
 */

const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { DatabaseDriver } = require('../../../services/memory-engine/storage');
const { MemoryEngine } = require('../../../services/memory-engine');
const { PolicyEngine } = require('../../../services/policy-engine');
const { DoctorSandbox } = require('../../../services/sandbox/doctor');
const { EngineerSecuritySandbox } = require('../../../services/security-engine/engineer');
const { AgentCouncil } = require('../../../services/agent-runtime/council');
const { MissionEngine } = require('../../../services/mission-engine/engine');
const { ArmyWorkerEngine } = require('../../../services/worker-engine/army');
const { ModelRouter } = require('../../../services/model-router/router');
const { ToolRegistry } = require('../../../services/tool-runtime/registry');

const PORT = process.env.PORT || 3000;

// Initialize Core Subsystems
const db = new DatabaseDriver('/tmp/pandav-db.json');
const memoryEngine = new MemoryEngine(db);
const policyEngine = new PolicyEngine();
const doctorSandbox = new DoctorSandbox();
const engineerSandbox = new EngineerSecuritySandbox(policyEngine);
const council = new AgentCouncil(policyEngine, doctorSandbox, engineerSandbox, memoryEngine);
const missionEngine = new MissionEngine(council, doctorSandbox, engineerSandbox, memoryEngine, policyEngine);
const army = new ArmyWorkerEngine(5);
const modelRouter = new ModelRouter();
const toolRegistry = new ToolRegistry(policyEngine, doctorSandbox, engineerSandbox);

// Helper Chat History
const chatMessages = [
  {
    id: 'msg_welcome',
    sender: 'Pandav Helper',
    text: 'Welcome to Pandav AI. I can explain architecture, assist with troubleshooting, or you can submit a one-prompt mission to the Mission Engine.',
    timestamp: Date.now()
  }
];

// Helper to parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // ---------------------------------------------
    // Serve Web UI Frontend & Live App Preview
    // ---------------------------------------------
    if (pathname === '/' || pathname === '/index.html') {
      const htmlPath = path.join(__dirname, '../../web/src/index.html');
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(htmlPath, 'utf8'));
      }
    }

    if (pathname === '/preview/app') {
      const previewPath = path.join(__dirname, '../../web/src/preview.html');
      if (fs.existsSync(previewPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(previewPath, 'utf8'));
      }
    }

    // ---------------------------------------------
    // 1. Health & Telemetry
    // ---------------------------------------------
    if (pathname === '/health' && req.method === 'GET') {
      return sendJson(res, 200, {
        status: 'HEALTHY',
        platform: 'PANDAV AI v1.0.0',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: Date.now()
      });
    }

    if (pathname === '/api/kpi' && req.method === 'GET') {
      return sendJson(res, 200, missionEngine.getAutonomyKPI());
    }

    // ---------------------------------------------
    // 2. Helper Chat API
    // ---------------------------------------------
    if (pathname === '/api/chat/messages' && req.method === 'GET') {
      return sendJson(res, 200, { messages: chatMessages });
    }

    if (pathname === '/api/chat/messages' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const userMsg = {
        id: 'msg_' + Date.now(),
        sender: 'User',
        text: body.text || '',
        timestamp: Date.now()
      };
      chatMessages.push(userMsg);

      const aiResponse = await modelRouter.generateResponse({
        agentName: 'Helper',
        prompt: body.text || ''
      });

      const replyMsg = {
        id: 'msg_' + (Date.now() + 1),
        sender: 'Pandav Helper',
        text: `[Helper Advice]: ${aiResponse.response} (For autonomous end-to-end execution, initiate a mission in the Mission Dashboard)`,
        timestamp: Date.now()
      };
      chatMessages.push(replyMsg);

      return sendJson(res, 201, { userMessage: userMsg, reply: replyMsg });
    }

    // ---------------------------------------------
    // 3. Autonomous Missions API (ONE-PROMPT)
    // ---------------------------------------------
    if (pathname === '/api/missions' && req.method === 'GET') {
      return sendJson(res, 200, { missions: missionEngine.listMissions() });
    }

    if (pathname === '/api/missions' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.objective) {
        return sendJson(res, 400, { error: 'Mission objective is required' });
      }
      const mission = missionEngine.createMission(body.objective);

      if (body.autoStart !== false) {
        setTimeout(() => {
          missionEngine.runAutonomousMission(mission.id).catch(console.error);
        }, 10);
      }

      return sendJson(res, 201, {
        message: 'Mission accepted. Pandav Autonomous Council mobilizing.',
        mission
      });
    }

    if (pathname.startsWith('/api/missions/') && req.method === 'GET') {
      const missionId = pathname.replace('/api/missions/', '');
      const mission = missionEngine.getMission(missionId);
      if (!mission) return sendJson(res, 404, { error: 'Mission not found' });
      return sendJson(res, 200, { mission });
    }

    // ---------------------------------------------
    // 4. Doctor Sandbox Workspace API
    // ---------------------------------------------
    if (pathname === '/api/doctor/files' && req.method === 'GET') {
      const missionId = query.missionId || 'default-session';
      const files = doctorSandbox.listFiles(missionId);
      return sendJson(res, 200, { missionId, files });
    }

    if (pathname === '/api/doctor/file' && req.method === 'GET') {
      const missionId = query.missionId || 'default-session';
      const filePath = query.path;
      if (!filePath) return sendJson(res, 400, { error: 'Missing path parameter' });
      const content = doctorSandbox.readFile(missionId, filePath);
      return sendJson(res, 200, { path: filePath, content });
    }

    if (pathname === '/api/doctor/file' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const missionId = body.missionId || 'default-session';
      const result = doctorSandbox.writeFile(missionId, body.path, body.content);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/doctor/build' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const missionId = body.missionId || 'default-session';
      const result = doctorSandbox.runBuild(missionId);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/doctor/tests' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const missionId = body.missionId || 'default-session';
      const result = doctorSandbox.runTests(missionId, body.pattern);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/doctor/logs' && req.method === 'GET') {
      const missionId = query.missionId || 'default-session';
      return sendJson(res, 200, { logs: doctorSandbox.getLogs(missionId) });
    }

    // ---------------------------------------------
    // 5. Engineer Security Sandbox API
    // ---------------------------------------------
    if (pathname === '/api/engineer/scan' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const missionId = body.missionId || 'default-session';
      const files = doctorSandbox.listFiles(missionId).map(f => ({
        path: f.path,
        content: doctorSandbox.readFile(missionId, f.path)
      }));
      const scan = engineerSandbox.scanWorkspace(missionId, files);
      return sendJson(res, 200, scan);
    }

    if (pathname === '/api/engineer/findings' && req.method === 'GET') {
      const missionId = query.missionId || 'default-session';
      const findings = engineerSandbox.getFindings(missionId);
      return sendJson(res, 200, { missionId, findings });
    }

    // ---------------------------------------------
    // 6. Policy & Approvals API
    // ---------------------------------------------
    if (pathname === '/api/policy/approvals' && req.method === 'GET') {
      return sendJson(res, 200, { pending: policyEngine.pendingApprovals });
    }

    if (pathname === '/api/policy/approve' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = policyEngine.approve(body.approvalId, body.approver || 'admin');
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/policy/reject' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const result = policyEngine.reject(body.approvalId, body.approver || 'admin', body.reason);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/policy/audit' && req.method === 'GET') {
      return sendJson(res, 200, { auditLogs: policyEngine.getAuditLogs() });
    }

    // ---------------------------------------------
    // 7. Memory & Semantic Retrieval API
    // ---------------------------------------------
    if (pathname === '/api/memory/query' && req.method === 'GET') {
      const results = memoryEngine.query({
        scope: query.scope || null,
        referenceId: query.referenceId || null,
        text: query.q || null
      });
      return sendJson(res, 200, { results });
    }

    // ---------------------------------------------
    // 8. Army Worker Infrastructure & Telemetry
    // ---------------------------------------------
    if (pathname === '/api/army/stats' && req.method === 'GET') {
      return sendJson(res, 200, army.getWorkerStats());
    }

    // ---------------------------------------------
    // 9. Tool Registry
    // ---------------------------------------------
    if (pathname === '/api/tools' && req.method === 'GET') {
      return sendJson(res, 200, { tools: toolRegistry.listTools() });
    }

    sendJson(res, 404, { error: 'Route not found' });
  } catch (err) {
    console.error('API Error:', err);
    sendJson(res, 500, { error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[PANDAV AI] Core Engine API Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = { server, missionEngine, policyEngine, doctorSandbox, engineerSandbox, memoryEngine };
