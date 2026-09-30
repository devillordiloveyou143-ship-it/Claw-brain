/**
 * Model Router & Abstraction Layer
 * Task-specific model routing, token tracking, fallback resilience
 */

class ModelRouter {
  constructor() {
    this.tokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalCostEstimatedUSD: 0.0
    };

    // Role-to-model specialization routing table
    this.routingTable = {
      yudhishthira: 'o1-preview / claude-3-7-sonnet-thinking', // Deep Reasoning & Coordination
      arjuna: 'claude-3-5-sonnet / gpt-4o-coder',              // Fast Code Gen & Refactoring
      sahadeva: 'perplexity-sonar-pro / gemini-1.5-pro',       // Live Research & Grounding
      bhima: 'claude-3-5-sonnet',                             // IaC, K8s & Cloud Architecture
      nakula: 'gpt-4o-mini',                                  // High-throughput Telemetry & SRE
      advocate: 'claude-3-5-sonnet-security',                 // Vulnerability & Threat Modeling
      police: 'gpt-4o-mini'                                   // Low latency Policy Evaluation
    };
  }

  routeModelForAgent(agentName) {
    const key = agentName.toLowerCase();
    return this.routingTable[key] || 'claude-3-5-sonnet';
  }

  async generateResponse({ agentName, prompt, systemPrompt = '' }) {
    const model = this.routeModelForAgent(agentName);
    const simulatedTokens = Math.floor(prompt.length / 4) + 120;
    this.tokenUsage.promptTokens += Math.floor(prompt.length / 4);
    this.tokenUsage.completionTokens += 120;
    this.tokenUsage.totalCostEstimatedUSD += 0.0008;

    return {
      agent: agentName,
      modelUsed: model,
      tokensUsed: simulatedTokens,
      response: `[${agentName.toUpperCase()} via ${model}] Autonomously processed prompt: "${prompt.slice(0, 60)}..."`
    };
  }

  getMetrics() {
    return {
      ...this.tokenUsage,
      activeModels: Object.values(this.routingTable)
    };
  }
}

module.exports = { ModelRouter };
