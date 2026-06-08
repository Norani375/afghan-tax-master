// Browser-side SQLite shim exposing `window.tasklet.sqlQuery` / `sqlExec`.
// Persists the DB to localStorage so data survives reloads.
import initSqlJs, { Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

declare global {
  interface Window {
    tasklet: {
      sqlExec: (sql: string) => Promise<void>;
      sqlQuery: (sql: string) => Promise<Record<string, unknown>[]>;
    };
  }
}

const STORAGE_KEY = 'tasklet_sqlite_db_v1';
let dbPromise: Promise<Database> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await initSqlJs({ locateFile: () => wasmUrl });
      const saved = localStorage.getItem(STORAGE_KEY);
      let db: Database;
      if (saved) {
        try {
          const bytes = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
          db = new SQL.Database(bytes);
        } catch {
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }
      // Seed default users table + admin/admin account if missing
      db.run(`CREATE TABLE IF NOT EXISTS tax_users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        fullName TEXT,
        role TEXT
      )`);
      const res = db.exec(`SELECT COUNT(*) as c FROM tax_users`);
      const count = res[0]?.values?.[0]?.[0] as number | undefined;
      if (!count) {
        db.run(
          `INSERT INTO tax_users (username,password,fullName,role) VALUES
            ('admin','admin','مدیر سیستم','admin'),
            ('user','user','کاربر','accountant')`
        );
        persist(db);
      }
      return db;
    })();
  }
  return dbPromise;
}

function persist(db: Database) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const bytes = db.export();
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)) as number[]
        );
      }
      localStorage.setItem(STORAGE_KEY, btoa(bin));
    } catch (e) {
      console.warn('tasklet persist failed', e);
    }
  }, 150);
}

async function sqlExec(sql: string): Promise<void> {
  const db = await getDb();
  db.run(sql);
  persist(db);
}

async function sqlQuery(sql: string): Promise<Record<string, unknown>[]> {
  const db = await getDb();
  const res = db.exec(sql);
  if (!res.length) return [];
  const { columns, values } = res[0];
  return values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  });
}

if (typeof window !== 'undefined' && !window.tasklet) {
  window.tasklet = { sqlExec, sqlQuery };
}

export {};
