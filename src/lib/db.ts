import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Database instance type from sql.js namespace
type SqlJsDatabase = InstanceType<initSqlJs.SqlJsStatic['Database']>;

const DATA_DIR = path.join(os.homedir(), 'mrwrite');
const DB_PATH = path.join(DATA_DIR, 'mrwrite.db');

let db: SqlJsDatabase | null = null;

async function initSql(): Promise<initSqlJs.SqlJsStatic> {
  return initSqlJs();
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (!db) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const SQL = await initSql();

    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }

    db.run('PRAGMA journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database: SqlJsDatabase) {
  database.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      path TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      tags TEXT DEFAULT '[]'
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS skill_preferences (
      skill_name TEXT PRIMARY KEY,
      config TEXT DEFAULT '{}',
      usage_count INTEGER DEFAULT 0,
      avg_score REAL DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT,
      format TEXT,
      path TEXT,
      exported_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      document_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);
}

export function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export interface DocumentRow {
  id: string;
  title: string;
  path: string;
  word_count: number;
  created_at: string;
  updated_at: string;
  tags: string;
}

export async function listDocuments(): Promise<DocumentRow[]> {
  const database = await getDb();
  const results = database.exec('SELECT * FROM documents ORDER BY updated_at DESC');
  if (!results.length) return [];

  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const doc: any = {};
    columns.forEach((col: string, i: number) => { doc[col] = row[i]; });
    return doc as DocumentRow;
  });
}

export async function getDocument(id: string): Promise<DocumentRow | undefined> {
  const database = await getDb();
  const results = database.exec('SELECT * FROM documents WHERE id = ?', [id]);
  if (!results.length || !results[0].values.length) return undefined;

  const { columns, values } = results[0];
  const doc: any = {};
  columns.forEach((col: string, i: number) => { doc[col] = values[0][i]; });
  return doc as DocumentRow;
}

export async function upsertDocument(doc: Omit<DocumentRow, 'created_at' | 'updated_at'>) {
  const database = await getDb();
  database.run(
    `INSERT INTO documents (id, title, path, word_count, tags, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       word_count = excluded.word_count,
       tags = excluded.tags,
       updated_at = datetime('now')`,
    [doc.id, doc.title, doc.path, doc.word_count, doc.tags]
  );
  saveDb();
}

export async function deleteDocument(id: string) {
  const database = await getDb();
  database.run('DELETE FROM documents WHERE id = ?', [id]);
  saveDb();
}

export async function getSkillPrefs(skillName: string): Promise<Record<string, unknown>> {
  const database = await getDb();
  const results = database.exec('SELECT config FROM skill_preferences WHERE skill_name = ?', [skillName]);
  if (!results.length || !results[0].values.length) return {};
  return JSON.parse(results[0].values[0][0] as string);
}

export async function saveSkillPrefs(skillName: string, config: Record<string, unknown>) {
  const database = await getDb();
  database.run(
    `INSERT INTO skill_preferences (skill_name, config) VALUES (?, ?)
     ON CONFLICT(skill_name) DO UPDATE SET config = excluded.config`,
    [skillName, JSON.stringify(config)]
  );
  saveDb();
}

// Conversation types and CRUD

export interface ConversationRow {
  id: string;
  title: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: number;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function listConversations(): Promise<ConversationRow[]> {
  const database = await getDb();
  const results = database.exec('SELECT * FROM conversations ORDER BY updated_at DESC');
  if (!results.length) return [];
  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const c: any = {};
    columns.forEach((col: string, i: number) => { c[col] = row[i]; });
    return c as ConversationRow;
  });
}

export async function getConversation(id: string): Promise<ConversationRow | undefined> {
  const database = await getDb();
  const results = database.exec('SELECT * FROM conversations WHERE id = ?', [id]);
  if (!results.length || !results[0].values.length) return undefined;
  const { columns, values } = results[0];
  const c: any = {};
  columns.forEach((col: string, i: number) => { c[col] = values[0][i]; });
  return c as ConversationRow;
}

export async function createConversation(id: string, title: string, documentId?: string) {
  const database = await getDb();
  database.run(
    `INSERT INTO conversations (id, title, document_id) VALUES (?, ?, ?)`,
    [id, title, documentId || null]
  );
  saveDb();
}

export async function updateConversationTitle(id: string, title: string) {
  const database = await getDb();
  database.run(
    `UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`,
    [title, id]
  );
  saveDb();
}

export async function deleteConversation(id: string) {
  const database = await getDb();
  database.run('DELETE FROM messages WHERE conversation_id = ?', [id]);
  database.run('DELETE FROM conversations WHERE id = ?', [id]);
  saveDb();
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const database = await getDb();
  const results = database.exec(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  if (!results.length) return [];
  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const m: any = {};
    columns.forEach((col: string, i: number) => { m[col] = row[i]; });
    return m as MessageRow;
  });
}

export async function saveMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string) {
  const database = await getDb();
  database.run(
    `INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)`,
    [conversationId, role, content]
  );
  database.run(
    `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`,
    [conversationId]
  );
  saveDb();
}

export async function deleteMessages(conversationId: string) {
  const database = await getDb();
  database.run('DELETE FROM messages WHERE conversation_id = ?', [conversationId]);
  saveDb();
}
