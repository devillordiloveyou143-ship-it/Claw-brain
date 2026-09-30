/**
 * In-memory / SQLite wrapper for clean relational storage
 */
const fs = require('fs');
const path = require('path');

// Light SQLite abstraction using file-backed or memory-backed store
class DatabaseDriver {
  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    this.tables = {};
    this.load();
  }

  load() {
    if (this.dbPath !== ':memory:' && fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.tables = JSON.parse(raw);
      } catch (e) {
        this.tables = {};
      }
    }
  }

  save() {
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(this.tables, null, 2), 'utf8');
    }
  }

  prepare(sql) {
    const trimmed = sql.trim();
    const self = this;

    // Handle CREATE TABLE
    if (/^CREATE TABLE/i.test(trimmed)) {
      const match = trimmed.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-zA-Z0-9_]+)/i);
      const tableName = match ? match[1] : 'unknown';
      if (!self.tables[tableName]) {
        self.tables[tableName] = [];
      }
      return {
        run: () => {
          self.save();
          return { changes: 1 };
        }
      };
    }

    // Handle INSERT INTO
    if (/^INSERT INTO/i.test(trimmed)) {
      const match = trimmed.match(/INSERT INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
      const tableName = match ? match[1] : null;
      const columns = match ? match[2].split(',').map(c => c.trim()) : [];

      return {
        run: (...params) => {
          if (!self.tables[tableName]) self.tables[tableName] = [];
          const record = {};
          columns.forEach((col, idx) => {
            record[col] = params[idx];
          });
          self.tables[tableName].push(record);
          self.save();
          return { changes: 1, lastInsertRowid: self.tables[tableName].length };
        }
      };
    }

    // Handle UPDATE
    if (/^UPDATE/i.test(trimmed)) {
      const match = trimmed.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
      const tableName = match ? match[1] : null;

      return {
        run: (...params) => {
          const list = self.tables[tableName] || [];
          let changes = 0;
          // Simple key replacement for id match
          const lastParam = params[params.length - 1];
          for (const item of list) {
            if (item.id === lastParam) {
              // Parse SET clause
              const setParts = match[2].split(',').map(s => s.trim().split('=')[0].trim());
              setParts.forEach((col, i) => {
                item[col] = params[i];
              });
              changes++;
            }
          }
          self.save();
          return { changes };
        }
      };
    }

    // Handle SELECT
    if (/^SELECT/i.test(trimmed)) {
      const match = trimmed.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+))?/i);
      const tableName = match ? match[2] : null;

      return {
        all: (...params) => {
          const list = self.tables[tableName] || [];
          if (!params || params.length === 0) return [...list];

          // Basic query filter matching
          return list.filter(item => {
            let pIdx = 0;
            if (trimmed.includes('scope = ?') && item.scope !== params[pIdx++]) return false;
            if (trimmed.includes('reference_id = ?') && item.reference_id !== params[pIdx++]) return false;
            if (trimmed.includes('mission_id = ?') && item.mission_id !== params[pIdx++]) return false;
            if (trimmed.includes('status = ?') && item.status !== params[pIdx++]) return false;
            if (trimmed.includes('id = ?') && item.id !== params[pIdx++]) return false;
            return true;
          });
        },
        get: (...params) => {
          const all = self.tables[tableName] || [];
          if (params.length === 1) {
            return all.find(r => r.id === params[0]) || null;
          }
          return all[0] || null;
        }
      };
    }

    // Fallback stub
    return {
      run: () => ({ changes: 0 }),
      all: () => [],
      get: () => null
    };
  }
}

module.exports = { DatabaseDriver };
