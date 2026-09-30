/**
 * Memory Engine
 * Layered memory: Working, Mission, Project, Long-term (with semantic cosine similarity)
 */
const crypto = require('crypto');

class MemoryEngine {
  constructor(db) {
    this.db = db;
    this.initSchema();
  }

  initSchema() {
    this.db.prepare(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL, -- 'working', 'mission', 'project', 'long_term'
        reference_id TEXT, -- mission_id, project_id, etc.
        key TEXT,
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of floats for semantic search
        tags TEXT, -- JSON array of string tags
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `).run();
  }

  // Simple pseudo-embedding for local deterministic semantic vectors (16 dimensions)
  // Maps tokens and semantic hash codes to normalized vector space
  computeEmbedding(text) {
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const vector = new Array(16).fill(0.0);
    for (const token of tokens) {
      const hash = crypto.createHash('md5').update(token).digest();
      for (let i = 0; i < 16; i++) {
        vector[i] += (hash[i] / 255.0) - 0.5;
      }
    }
    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1.0;
    return vector.map(v => Number((v / norm).toFixed(4)));
  }

  cosineSimilarity(v1, v2) {
    if (!v1 || !v2 || v1.length !== v2.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < v1.length; i++) {
      dot += v1[i] * v2[i];
      normA += v1[i] * v1[i];
      normB += v2[i] * v2[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  store({ scope, referenceId = null, key = null, content, tags = [] }) {
    // Check secret leakage prevention
    if (this.containsSensitiveData(content)) {
      throw new Error('Memory policy violation: Plain-text secrets detected in memory payload');
    }

    const id = 'mem_' + crypto.randomUUID().slice(0, 8);
    const embedding = this.computeEmbedding(content);
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO memories (id, scope, reference_id, key, content, embedding, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, scope, referenceId, key, content, JSON.stringify(embedding), JSON.stringify(tags), now, now);
    return { id, scope, referenceId, key, content, tags, created_at: now };
  }

  query({ scope, referenceId = null, text = null, tags = [], limit = 10 }) {
    let sql = 'SELECT * FROM memories WHERE 1=1';
    const params = [];

    if (scope) {
      sql += ' AND scope = ?';
      params.push(scope);
    }
    if (referenceId) {
      sql += ' AND reference_id = ?';
      params.push(referenceId);
    }

    const rows = this.db.prepare(sql).all(...params);

    let results = rows.map(r => ({
      ...r,
      embedding: JSON.parse(r.embedding || '[]'),
      tags: JSON.parse(r.tags || '[]')
    }));

    if (tags.length > 0) {
      results = results.filter(r => tags.some(t => r.tags.includes(t)));
    }

    if (text) {
      const qVec = this.computeEmbedding(text);
      results = results.map(r => ({
        ...r,
        similarity: this.cosineSimilarity(qVec, r.embedding)
      })).sort((a, b) => b.similarity - a.similarity);
    } else {
      results.sort((a, b) => b.created_at - a.created_at);
    }

    return results.slice(0, limit);
  }

  containsSensitiveData(text) {
    const secretPatterns = [
      /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/,
      /AKIA[0-9A-Z]{16}/,
      /ghp_[a-zA-Z0-9]{36}/,
      /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
      /password\s*[:=]\s*['"][^'"]{8,}['"]/i
    ];
    return secretPatterns.some(pattern => pattern.test(text));
  }
}

module.exports = { MemoryEngine };
