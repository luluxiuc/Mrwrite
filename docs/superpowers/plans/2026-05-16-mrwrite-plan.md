# MrWrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first, skill-driven AI writing agent — terminal launch (`mrwrite`), browser UI, pluggable skill system.

**Architecture:** Next.js 14 App Router with API routes as LLM proxy and skill engine. Three-panel UI (skill bar + TipTap editor + AI chat). Skills load from `.mrwrite/skills/` at runtime. Documents stored as local Markdown files with SQLite metadata.

**Tech Stack:** Next.js 14, TypeScript, TipTap, Tailwind CSS, shadcn/ui, better-sqlite3, OpenAI SDK, Pandoc

**Architecture Refinements (from high-star agent research):**
1. **Progressive Skill Loading**: L1 (metadata ~100 tokens) → L2 (full SKILL.md on demand) → L3 (scripts/resources on demand). Never preload more than one skill.
2. **Context Compression**: 5-tier pipeline — message size limit → snip old → microcompact → context collapse → auto-compact (summarize, never truncate).
3. **Filesystem as Memory**: Large outputs written to files, agent discovers via targeted reads. Tool output capped at ~8000 chars.
4. **Session Isolation**: Subagents get fresh context windows; only summaries return to parent.
5. **On-Demand Loading**: Documentation/schemas/skills kept out of system prompt, fetched only when invoked.

---

## File Structure Map

```
mrwrite/
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.example
├── cli/
│   └── mrwrite.js              # CLI entry: starts server, opens browser
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (dark theme, fonts)
│   │   ├── page.tsx             # Main page: ThreePanel wrapper
│   │   ├── globals.css          # Tailwind + custom styles
│   │   └── api/
│   │       ├── llm/route.ts     # POST: proxy LLM request
│   │       ├── llm/models/route.ts  # GET: list configured models
│   │       ├── skills/route.ts      # GET: list skills, POST: execute
│   │       ├── documents/route.ts   # GET: list docs, POST: create
│   │       ├── documents/[id]/route.ts  # GET/PUT/DELETE document
│   │       └── export/route.ts       # POST: export to format
│   ├── components/
│   │   ├── layout/
│   │   │   ├── ThreePanelLayout.tsx
│   │   │   └── ResizeHandle.tsx
│   │   ├── editor/
│   │   │   ├── WritingEditor.tsx     # TipTap wrapper
│   │   │   └── EditorToolbar.tsx
│   │   ├── sidebar/
│   │   │   ├── SkillBar.tsx          # Left icon column
│   │   │   └── DocumentList.tsx      # Open/save docs
│   │   ├── agent/
│   │   │   ├── ChatPanel.tsx         # Right AI chat
│   │   │   └── ChatMessage.tsx
│   │   └── settings/
│   │       └── SettingsDialog.tsx    # API key config
│   ├── skills/
│   │   ├── types.ts              # SkillDefinition, SkillResult
│   │   ├── registry.ts           # SkillLoader: reads SKILL.md from disk
│   │   ├── engine.ts             # SkillRunner: execute pipeline
│   │   └── built-in/
│   │       └── humanizer/
│   │           ├── SKILL.md
│   │           ├── patterns.json
│   │           └── index.ts
│   ├── lib/
│   │   ├── llm.ts               # LLMClient: OpenAI-compatible wrapper
│   │   ├── storage.ts           # FileSystem + SQLite ops
│   │   ├── db.ts                # SQLite schema + queries
│   │   └── pandoc.ts            # Export via Pandoc CLI
│   └── middleware.ts
├── .mrwrite/                    # User workspace (runtime)
│   └── skills/                  # User-installed skills
└── public/
```

---

## Phase 1: Project Scaffold

### Task 1: Initialize Next.js project with all dependencies

**Files:**
- Create: `package.json`
- Create: `next.config.js`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`

- [ ] **Step 1: Create package.json and install dependencies**

```bash
cd "D:\code shijian\rewrite" && npm init -y
```

```json
{
  "name": "mrwrite",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "mrwrite": "node cli/mrwrite.js"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tiptap/react": "^2.5.0",
    "@tiptap/starter-kit": "^2.5.0",
    "@tiptap/extension-placeholder": "^2.5.0",
    "@tiptap/extension-character-count": "^2.5.0",
    "@tiptap/extension-highlight": "^2.5.0",
    "@tiptap/extension-typography": "^2.5.0",
    "openai": "^4.50.0",
    "better-sqlite3": "^11.0.0",
    "lucide-react": "^0.370.0",
    "tailwind-merge": "^2.3.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/better-sqlite3": "^7.6.0",
    "typescript": "^5.4.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
```

Run: `npm install`

- [ ] **Step 2: Create next.config.js**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'better-sqlite3'];
    return config;
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'hsl(220 15% 8%)',
        surface: 'hsl(220 15% 12%)',
        border: 'hsl(220 10% 20%)',
        accent: 'hsl(220 80% 60%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Create .env.example**

```
# LLM API Configuration
LLM_API_KEY=sk-your-api-key-here
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# Server
PORT=3000
```

- [ ] **Step 6: Create src/app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-bg text-gray-200 antialiased;
  }
}

/* TipTap editor styles */
.ProseMirror {
  @apply outline-none min-h-[60vh] px-8 py-6;
  font-family: Georgia, Cambria, serif;
  font-size: 18px;
  line-height: 1.8;
}

.ProseMirror p {
  @apply mb-4;
}

.ProseMirror h1 {
  @apply text-3xl font-bold mb-6 mt-8;
}

.ProseMirror h2 {
  @apply text-2xl font-semibold mb-4 mt-6;
}

.ProseMirror h3 {
  @apply text-xl font-medium mb-3 mt-4;
}

.ProseMirror blockquote {
  @apply border-l-4 border-accent pl-4 italic my-4 text-gray-400;
}

.ProseMirror ul { @apply list-disc ml-6 mb-4; }
.ProseMirror ol { @apply list-decimal ml-6 mb-4; }

.ProseMirror code {
  @apply bg-surface px-1.5 py-0.5 rounded text-sm font-mono;
}

.ProseMirror pre {
  @apply bg-surface p-4 rounded-lg my-4 overflow-x-auto;
}

.ProseMirror pre code {
  @apply bg-transparent p-0;
}

.ProseMirror hr {
  @apply border-border my-8;
}
```

- [ ] **Step 7: Create src/app/layout.tsx**

```typescript
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MrWrite — AI Writing Studio',
  description: 'A local-first, skill-driven AI writing agent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Verify dev server starts**

Run: `npx next dev`
Expected: Server starts on http://localhost:3000

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js project with dependencies and config"
```

---

### Task 2: Initialize shadcn/ui

- [ ] **Step 1: Run shadcn init**

Run: `npx shadcn-ui@latest init`
- Select: TypeScript, Default style, Slate base color, CSS variables: no

- [ ] **Step 2: Install shadcn components**

```bash
npx shadcn-ui@latest add button input dialog textarea scroll-area tooltip separator dropdown-menu toast tabs
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add shadcn/ui components"
```

---

## Phase 2: Core Infrastructure

### Task 3: Define skill types and interfaces

**Files:** Create: `src/skills/types.ts`

- [ ] **Step 1: Write skill type definitions**

```typescript
// src/skills/types.ts

export interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  author?: string;
  /** Which writing phase this skill targets */
  phase: 'pre-writing' | 'drafting' | 'editing' | 'polishing' | 'export';
  /** Execution mode: 'code' runs index.ts, 'prompt' uses SKILL.md instructions */
  mode: 'code' | 'prompt' | 'hybrid';
  /** Categories for UI grouping */
  tags: string[];
  /** User-configurable parameters */
  config: SkillConfig;
  /** Path on disk */
  path: string;
}

export interface SkillConfig {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select';
    label: string;
    default: string | number | boolean;
    options?: string[];
    description?: string;
  };
}

export interface SkillExecuteRequest {
  skillName: string;
  input: string;        // Selected text or full document
  context?: string;     // Surrounding context (full doc or chapter)
  params?: Record<string, unknown>;
  model?: string;
}

export interface SkillExecuteResult {
  output: string;       // The transformed text
  score?: number;       // Quality gate score (0-100)
  warnings?: string[];  // Issues detected
  diff?: string;        // What changed
}

export interface SkillModule {
  default: {
    execute: (req: SkillExecuteRequest) => Promise<SkillExecuteResult>;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/skills/types.ts && git commit -m "feat: define skill types and interfaces"
```

---

### Task 4: LLM client abstraction

**Files:** Create: `src/lib/llm.ts`

- [ ] **Step 1: Write LLM client**

```typescript
// src/lib/llm.ts

import OpenAI from 'openai';

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getConfig(): LLMConfig {
  return {
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o',
  };
}

export function createClient(config?: Partial<LLMConfig>) {
  const c = { ...getConfig(), ...config };
  return new OpenAI({
    apiKey: c.apiKey,
    baseURL: c.baseURL,
  });
}

export interface StreamChatOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(options: StreamChatOptions) {
  const config = getConfig();
  const openai = createClient();

  try {
    const stream = await openai.chat.completions.create({
      model: options.model || config.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: true,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userMessage },
      ],
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) options.onChunk(content);
    }
    options.onDone();
  } catch (err) {
    options.onError(err as Error);
  }
}

export async function chat(
  systemPrompt: string,
  userMessage: string,
  model?: string
): Promise<string> {
  const config = getConfig();
  const openai = createClient();

  const response = await openai.chat.completions.create({
    model: model || config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content || '';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/llm.ts && git commit -m "feat: add LLM client with streaming support"
```

---

### Task 5: Database and storage layer

**Files:** Create: `src/lib/db.ts`, `src/lib/storage.ts`

- [ ] **Step 1: Write database schema and queries**

```typescript
// src/lib/db.ts

import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

const DATA_DIR = path.join(os.homedir(), 'mrwrite');
const DB_PATH = path.join(DATA_DIR, 'mrwrite.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const fs = require('fs');
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      path TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      tags TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS skill_preferences (
      skill_name TEXT PRIMARY KEY,
      config TEXT DEFAULT '{}',
      usage_count INTEGER DEFAULT 0,
      avg_score REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS export_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id TEXT,
      format TEXT,
      path TEXT,
      exported_at TEXT DEFAULT (datetime('now'))
    );
  `);
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

export function listDocuments(): DocumentRow[] {
  return getDb().prepare(
    'SELECT * FROM documents ORDER BY updated_at DESC'
  ).all() as DocumentRow[];
}

export function getDocument(id: string): DocumentRow | undefined {
  return getDb().prepare(
    'SELECT * FROM documents WHERE id = ?'
  ).get(id) as DocumentRow | undefined;
}

export function upsertDocument(doc: Omit<DocumentRow, 'created_at' | 'updated_at'>) {
  getDb().prepare(`
    INSERT INTO documents (id, title, path, word_count, tags, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      word_count = excluded.word_count,
      tags = excluded.tags,
      updated_at = datetime('now')
  `).run(doc.id, doc.title, doc.path, doc.word_count, doc.tags);
}

export function deleteDocument(id: string) {
  getDb().prepare('DELETE FROM documents WHERE id = ?').run(id);
}

export function getSkillPrefs(skillName: string): Record<string, unknown> {
  const row = getDb().prepare(
    'SELECT config FROM skill_preferences WHERE skill_name = ?'
  ).get(skillName) as { config: string } | undefined;
  return row ? JSON.parse(row.config) : {};
}

export function saveSkillPrefs(skillName: string, config: Record<string, unknown>) {
  getDb().prepare(`
    INSERT INTO skill_preferences (skill_name, config) VALUES (?, ?)
    ON CONFLICT(skill_name) DO UPDATE SET config = excluded.config
  `).run(skillName, JSON.stringify(config));
}
```

- [ ] **Step 2: Write storage operations**

```typescript
// src/lib/storage.ts

import path from 'path';
import fs from 'fs';
import os from 'os';

export const DATA_DIR = path.join(os.homedir(), 'mrwrite');
export const WORKSPACE_DIR = path.join(DATA_DIR, 'workspace');
export const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
export const SKILLS_DIR = path.join(DATA_DIR, 'skills');

export function ensureDirs() {
  [DATA_DIR, WORKSPACE_DIR, EXPORTS_DIR, SKILLS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function readDocument(docId: string): string | null {
  const filePath = path.join(WORKSPACE_DIR, `${docId}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf-8');
}

export function writeDocument(docId: string, content: string) {
  const filePath = path.join(WORKSPACE_DIR, `${docId}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function deleteDocumentFile(docId: string) {
  const filePath = path.join(WORKSPACE_DIR, `${docId}.md`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function listDocumentFiles(): string[] {
  ensureDirs();
  return fs.readdirSync(WORKSPACE_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace('.md', ''));
}

export function countWords(content: string): number {
  const cleaned = content.replace(/[#*`>\[\]()]/g, ' ').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function getExportPath(docId: string, format: string): string {
  ensureDirs();
  return path.join(EXPORTS_DIR, `${docId}.${format}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/db.ts src/lib/storage.ts && git commit -m "feat: add SQLite database and filesystem storage layer"
```

---

### Task 6: Pandoc export service

**Files:** Create: `src/lib/pandoc.ts`

- [ ] **Step 1: Write Pandoc wrapper**

```typescript
// src/lib/pandoc.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { WORKSPACE_DIR, getExportPath } from './storage';

const execAsync = promisify(exec);

export type ExportFormat = 'docx' | 'pdf' | 'epub' | 'html' | 'txt';

export async function exportDocument(
  docId: string,
  format: ExportFormat
): Promise<string> {
  const inputPath = path.join(WORKSPACE_DIR, `${docId}.md`);
  const outputPath = getExportPath(docId, format);

  const formatArgs: Record<ExportFormat, string> = {
    docx: '-t docx',
    pdf: '--pdf-engine=xelatex -t pdf',
    epub: '-t epub',
    html: '-t html5 --standalone',
    txt: '-t plain',
  };

  const cmd = `pandoc "${inputPath}" ${formatArgs[format]} -o "${outputPath}"`;

  try {
    await execAsync(cmd);
    return outputPath;
  } catch (err: any) {
    if (err.message?.includes('not found') || err.code === 127) {
      throw new Error(
        'Pandoc is not installed. Please install it from https://pandoc.org/installing.html'
      );
    }
    throw err;
  }
}

export async function checkPandoc(): Promise<boolean> {
  try {
    await execAsync('pandoc --version');
    return true;
  } catch {
    return false;
  }
}

/** Pure client-side export (no Pandoc required) */
export function exportToHTML(markdown: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { max-width: 720px; margin: 40px auto; font-family: Georgia, serif;
           line-height: 1.8; color: #333; }
    h1, h2, h3 { color: #111; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
    pre { background: #f4f4f4; padding: 16px; border-radius: 6px; overflow-x: auto; }
  </style>
</head>
<body>${markdown}</body>
</html>`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pandoc.ts && git commit -m "feat: add Pandoc export service with HTML fallback"
```

---

## Phase 3: Skill System

### Task 7: Skill registry (load skills from disk)

**Files:** Create: `src/skills/registry.ts`

- [ ] **Step 1: Write skill registry**

```typescript
// src/skills/registry.ts

import path from 'path';
import fs from 'fs';
import { SkillDefinition } from './types';

const BUILT_IN_DIR = path.join(process.cwd(), 'src/skills/built-in');
const USER_SKILLS_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '/tmp',
  'mrwrite',
  'skills'
);

function parseSkillMd(content: string): Partial<SkillDefinition> {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter) return {};

  const meta: Record<string, any> = {};
  frontmatter[1].split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      meta[key.trim()] = rest.join(':').trim();
    }
  });

  return {
    name: meta.name,
    version: meta.version || '0.1.0',
    description: meta.description || '',
    author: meta.author,
    phase: meta.phase as SkillDefinition['phase'],
    mode: meta.mode as SkillDefinition['mode'],
    tags: meta.tags ? meta.tags.split(',').map((t: string) => t.trim()) : [],
    config: meta.config ? JSON.parse(meta.config) : {},
  };
}

export function loadSkills(): SkillDefinition[] {
  const skills: SkillDefinition[] = [];

  const dirs = [BUILT_IN_DIR, USER_SKILLS_DIR];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;

    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      if (!entry.isDirectory()) return;

      const skillDir = path.join(dir, entry.name);
      const skillMdPath = path.join(skillDir, 'SKILL.md');

      if (!fs.existsSync(skillMdPath)) return;

      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const meta = parseSkillMd(content);

      skills.push({
        name: entry.name,
        version: '0.1.0',
        description: '',
        phase: 'editing',
        mode: 'prompt',
        tags: [],
        config: {},
        path: skillDir,
        ...meta,
      });
    });
  });

  return skills;
}

export function getSkill(name: string): SkillDefinition | undefined {
  return loadSkills().find((s) => s.name === name);
}

export function loadSkillPrompt(name: string): string {
  const skill = getSkill(name);
  if (!skill) throw new Error(`Skill "${name}" not found`);

  const skillMdPath = path.join(skill.path, 'SKILL.md');
  const content = fs.readFileSync(skillMdPath, 'utf-8');

  // Strip frontmatter, return the instruction body
  return content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/skills/registry.ts && git commit -m "feat: add skill registry for loading skills from disk"
```

---

### Task 8: Skill execution engine

**Files:** Create: `src/skills/engine.ts`

- [ ] **Step 1: Write skill engine**

```typescript
// src/skills/engine.ts

import { SkillExecuteRequest, SkillExecuteResult } from './types';
import { getSkill, loadSkillPrompt } from './registry';
import { streamChat, chat } from '@/lib/llm';

export async function executeSkill(
  req: SkillExecuteRequest
): Promise<SkillExecuteResult> {
  const skill = getSkill(req.skillName);
  if (!skill) {
    return { output: '', warnings: [`Skill "${req.skillName}" not found`] };
  }

  // Code-mode skills: load and run their script
  if (skill.mode === 'code') {
    return executeCodeSkill(skill, req);
  }

  // Prompt-mode skills: build prompt from SKILL.md and send to LLM
  return executePromptSkill(skill, req);
}

async function executeCodeSkill(
  skill: import('./types').SkillDefinition,
  req: SkillExecuteRequest
): Promise<SkillExecuteResult> {
  try {
    const mod = await import(`${skill.path}/index.ts`);
    if (mod?.default?.execute) {
      return mod.default.execute(req);
    }
    return { output: '', warnings: ['Skill has no execute function'] };
  } catch (err: any) {
    // Fall back to prompt mode if code execution fails
    return executePromptSkill(skill, req);
  }
}

async function executePromptSkill(
  skill: import('./types').SkillDefinition,
  req: SkillExecuteRequest
): Promise<SkillExecuteResult> {
  const systemPrompt = loadSkillPrompt(skill.name);

  const userPrompt = buildUserPrompt(req);

  try {
    const output = await chat(systemPrompt, userPrompt, req.model);
    const score = evaluateOutput(output, skill.name);
    return { output, score };
  } catch (err: any) {
    return { output: '', warnings: [err.message] };
  }
}

function buildUserPrompt(req: SkillExecuteRequest): string {
  let prompt = '';

  if (req.context) {
    prompt += `## 全文上下文\n\n${req.context}\n\n`;
  }

  prompt += `## 待处理的文本\n\n${req.input}\n\n`;

  if (req.params) {
    prompt += `## 参数\n\n${JSON.stringify(req.params, null, 2)}\n`;
  }

  return prompt;
}

function evaluateOutput(output: string, skillName: string): number {
  // Simple heuristics for quality scoring
  let score = 70;

  if (output.length < 10) score -= 30;
  if (output.length > 100) score += 10;
  if (output.includes('\n')) score += 5;

  return Math.min(100, Math.max(0, score));
}

export async function executeSkillStream(
  req: SkillExecuteRequest,
  callbacks: {
    onChunk: (chunk: string) => void;
    onDone: (result: SkillExecuteResult) => void;
    onError: (err: Error) => void;
  }
) {
  const skill = getSkill(req.skillName);
  if (!skill) {
    callbacks.onError(new Error(`Skill "${req.skillName}" not found`));
    return;
  }

  const systemPrompt = loadSkillPrompt(skill.name);
  const userPrompt = buildUserPrompt(req);

  let fullOutput = '';

  streamChat({
    systemPrompt,
    userMessage: userPrompt,
    onChunk: (chunk) => {
      fullOutput += chunk;
      callbacks.onChunk(chunk);
    },
    onDone: () => {
      const score = evaluateOutput(fullOutput, req.skillName);
      callbacks.onDone({ output: fullOutput, score });
    },
    onError: callbacks.onError,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/skills/engine.ts && git commit -m "feat: add skill execution engine with streaming"
```

---

### Task 9: First built-in skill — Humanizer

**Files:** Create: `src/skills/built-in/humanizer/SKILL.md`, `src/skills/built-in/humanizer/patterns.json`, `src/skills/built-in/humanizer/index.ts`

- [ ] **Step 1: Create humanizer SKILL.md**

```markdown
---
name: humanizer
version: 1.0.0
description: 去除 AI 写作痕迹，让文字更自然、更有「人味」
phase: polishing
mode: hybrid
tags: de-ai, editing, polish, natural
---

# Humanizer — 去 AI 味写作技能

## 角色

你是一位专业的文字编辑，擅长将 AI 生成的文字改写成自然、有温度的人类写作风格。

## 核心原则

1. **消除 AI 痕迹**：去除以下典型 AI 写作模式
   - 过度使用「首先、其次、最后、总之、此外」等过渡词
   - 每段都以主题句开头 + 解释 + 例子的机械结构
   - 「值得注意的是」「不可否认」「毋庸置疑」等空话
   - 过于完美的对称结构和对仗
   - 缺乏具体的、个人化的细节
   - 使用了过多的形容词堆砌
   - 每句话长度几乎相同的「机器人节奏」
   - 缺乏情感温度和观点态度

2. **增强人味**
   - 加入适当的个人观点和态度
   - 使用不完美的、自然的句式
   - 适当使用口语化表达
   - 加入具体的而非泛泛的例子
   - 允许适当的「瑕疵」（口语化转折、短句、感叹）

3. **保持原文**
   - 不改动核心内容和观点
   - 保持原文的整体风格方向
   - 保留专业术语和必要的事实陈述

## 输出要求

直接输出改写后的文本，不要解释你做了什么改动，不要说「这是改写后的版本」。
```

- [ ] **Step 2: Create humanizer patterns.json**

```json
{
  "patterns": [
    { "name": "mechanical-transitions", "pattern": "(首先|其次|然后|最后|总之|此外|另外|同时|因此|所以|然而|但是|不过|尽管|虽然|一方面|另一方面)", "weight": 3 },
    { "name": "filler-phrases", "pattern": "(值得注意的是|不可否认|毋庸置疑|众所周知|毫无疑问|显而易见|不言而喻|可以说|应该说)", "weight": 4 },
    { "name": "ai-cliches", "pattern": "(在当今|随着.*的发展|在这个.*的时代|.*是一个.*的问题|.*发挥着.*的作用|.*不仅.*而且|.*既.*又)", "weight": 5 },
    { "name": "adjective-piling", "pattern": "(深刻|深入|全面|系统|科学|合理|有效|积极|重要|关键|核心|本质|根本).{0,2}(深刻|深入|全面|系统|科学|合理|有效|积极|重要|关键|核心|本质|根本)", "weight": 2 },
    { "name": "uniform-sentences", "pattern": "^.{30,60}$", "weight": 1 },
    { "name": "passive-voice", "pattern": "(被|受到|得到|遭到|获得|获得|遭到|为.*所|由.*所)", "weight": 1 },
    { "name": "formal-nominalization", "pattern": "(进行|做出|予以|加以|给予|实施|开展|推进|促进|推动|加强|提高|提升)", "weight": 2 }
  ],
  "scoring": {
    "threshold": 60,
    "maxRetries": 2
  }
}
```

- [ ] **Step 3: Create humanizer index.ts**

```typescript
// src/skills/built-in/humanizer/index.ts

import type { SkillExecuteRequest, SkillExecuteResult, SkillModule } from '../../types';
import patterns from './patterns.json';

function detectAIPatterns(text: string): { name: string; count: number }[] {
  const results: { name: string; count: number }[] = [];

  for (const p of patterns.patterns) {
    try {
      const matches = text.match(new RegExp(p.pattern, 'g'));
      if (matches && matches.length > 0) {
        results.push({ name: p.name, count: matches.length });
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

function calculateAIScore(text: string): number {
  const detections = detectAIPatterns(text);
  if (detections.length === 0) return 90;

  let penalty = 0;
  for (const d of detections) {
    const pattern = patterns.patterns.find((p) => p.name === d.name);
    penalty += d.count * (pattern?.weight || 1);
  }

  return Math.max(0, Math.min(100, 100 - penalty));
}

export default {
  execute: async (req: SkillExecuteRequest): Promise<SkillExecuteResult> => {
    const inputScore = calculateAIScore(req.input);
    const detections = detectAIPatterns(req.input);

    return {
      output: req.input,
      score: inputScore,
      warnings: detections.map(
        (d) => `检测到「${d.name}」模式 ${d.count} 次`
      ),
    };
  },
} satisfies SkillModule;
```

- [ ] **Step 4: Commit**

```bash
git add src/skills/built-in/ && git commit -m "feat: add humanizer skill with 7 AI pattern categories"
```

---

## Phase 4: API Routes

### Task 10: LLM proxy API

**Files:** Create: `src/app/api/llm/route.ts`

- [ ] **Step 1: Write LLM proxy endpoint**

```typescript
// src/app/api/llm/route.ts

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const { messages, model, temperature, maxTokens, stream } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }

  const openai = createClient();

  if (stream) {
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          const completion = await openai.chat.completions.create({
            model: model || process.env.LLM_MODEL || 'gpt-4o',
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens || 4096,
            stream: true,
          });

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: model || process.env.LLM_MODEL || 'gpt-4o',
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens || 4096,
    });

    return Response.json(completion.choices[0]?.message);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/llm/route.ts && git commit -m "feat: add LLM proxy endpoint with streaming support"
```

---

### Task 11: Skills API

**Files:** Create: `src/app/api/skills/route.ts`

- [ ] **Step 1: Write skills list + execute endpoint**

```typescript
// src/app/api/skills/route.ts

import { NextRequest } from 'next/server';
import { loadSkills } from '@/skills/registry';
import { executeSkillStream } from '@/skills/engine';

export async function GET() {
  const skills = loadSkills();
  return Response.json(skills.map((s) => ({
    name: s.name,
    version: s.version,
    description: s.description,
    phase: s.phase,
    mode: s.mode,
    tags: s.tags,
    config: s.config,
  })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { skillName, input, context, params } = body;

  if (!skillName || !input) {
    return Response.json({ error: 'skillName and input required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      await executeSkillStream(
        { skillName, input, context, params },
        {
          onChunk: (chunk) => {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          },
          onDone: (result) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ done: true, score: result.score, warnings: result.warnings })}\n\n`)
            );
            controller.close();
          },
          onError: (err) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
            controller.close();
          },
        }
      );
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/skills/route.ts && git commit -m "feat: add skills list and streaming execute API"
```

---

### Task 12: Documents API

**Files:** Create: `src/app/api/documents/route.ts`, `src/app/api/documents/[id]/route.ts`

- [ ] **Step 1: Write documents list/create endpoint**

```typescript
// src/app/api/documents/route.ts

import { NextRequest } from 'next/server';
import { listDocuments, upsertDocument } from '@/lib/db';
import { ensureDirs, writeDocument, readDocument, countWords } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const docs = listDocuments();
  return Response.json(docs);
}

export async function POST(req: NextRequest) {
  const { title, content } = await req.json();
  ensureDirs();

  const id = uuidv4();
  writeDocument(id, content || '');
  const words = countWords(content || '');

  upsertDocument({
    id,
    title: title || 'Untitled',
    path: `${id}.md`,
    word_count: words,
    tags: '[]',
  });

  return Response.json({ id, title: title || 'Untitled', word_count: words });
}
```

- [ ] **Step 2: Write single document CRUD endpoint**

```typescript
// src/app/api/documents/[id]/route.ts

import { NextRequest } from 'next/server';
import { getDocument, upsertDocument, deleteDocument } from '@/lib/db';
import { readDocument, writeDocument, deleteDocumentFile, countWords } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const meta = getDocument(params.id);
  const content = readDocument(params.id);

  if (!meta || content === null) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  return Response.json({ ...meta, content });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { title, content, tags } = await req.json();

  writeDocument(params.id, content);
  const words = countWords(content || '');

  upsertDocument({
    id: params.id,
    title: title || 'Untitled',
    path: `${params.id}.md`,
    word_count: words,
    tags: JSON.stringify(tags || []),
  });

  return Response.json({ id: params.id, word_count: words });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  deleteDocument(params.id);
  deleteDocumentFile(params.id);
  return Response.json({ deleted: true });
}
```

- [ ] **Step 3: Install uuid and commit**

```bash
npm install uuid && npm install -D @types/uuid
git add src/app/api/documents/ && git commit -m "feat: add document CRUD API endpoints"
```

---

### Task 13: Export API

**Files:** Create: `src/app/api/export/route.ts`

- [ ] **Step 1: Write export endpoint**

```typescript
// src/app/api/export/route.ts

import { NextRequest } from 'next/server';
import { exportDocument, checkPandoc, ExportFormat } from '@/lib/pandoc';
import { readDocument } from '@/lib/storage';
import { exportToHTML } from '@/lib/pandoc';

export async function POST(req: NextRequest) {
  const { docId, format } = await req.json();

  if (!docId || !format) {
    return Response.json({ error: 'docId and format required' }, { status: 400 });
  }

  const content = readDocument(docId);
  if (content === null) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  // Client-side formats (no Pandoc needed)
  if (format === 'txt') {
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${docId}.txt"`,
      },
    });
  }

  if (format === 'html') {
    const html = exportToHTML(content, docId);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${docId}.html"`,
      },
    });
  }

  // Pandoc-dependent formats
  const hasPandoc = await checkPandoc();
  if (!hasPandoc) {
    return Response.json({
      error: 'Pandoc is required for DOCX/PDF/EPUB export. Install from https://pandoc.org/installing.html',
    }, { status: 400 });
  }

  try {
    const outputPath = await exportDocument(docId, format as ExportFormat);
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(outputPath);

    const mimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      epub: 'application/epub+zip',
    };

    return new Response(fileBuffer, {
      headers: {
        'Content-Type': mimeTypes[format] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${docId}.${format}"`,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/export/route.ts && git commit -m "feat: add document export API (HTML/TXT/DOCX/PDF/EPUB)"
```

---

## Phase 5: Frontend — Editor

### Task 14: Three-panel layout component

**Files:** Create: `src/components/layout/ThreePanelLayout.tsx`, `src/components/layout/ResizeHandle.tsx`

- [ ] **Step 1: Write ResizeHandle**

```tsx
// src/components/layout/ResizeHandle.tsx

'use client';
import { useCallback, useRef } from 'react';

interface ResizeHandleProps {
  onResize: (delta: number) => void;
  direction: 'horizontal' | 'vertical';
}

export function ResizeHandle({ onResize, direction }: ResizeHandleProps) {
  const startPos = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;

    const onMouseMove = (e: MouseEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      onResize(current - startPos.current);
      startPos.current = current;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onResize, direction]);

  return (
    <div
      className={`
        ${direction === 'horizontal' ? 'w-1 cursor-col-resize hover:bg-accent/50' : 'h-1 cursor-row-resize hover:bg-accent/50'}
        bg-border transition-colors shrink-0
      `}
      onMouseDown={onMouseDown}
    />
  );
}
```

- [ ] **Step 2: Write ThreePanelLayout**

```tsx
// src/components/layout/ThreePanelLayout.tsx

'use client';
import { useState } from 'react';
import { ResizeHandle } from './ResizeHandle';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function ThreePanelLayout({ leftPanel, centerPanel, rightPanel }: ThreePanelLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(52);
  const [rightWidth, setRightWidth] = useState(360);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden">
      {!leftCollapsed && (
        <>
          <div style={{ width: leftWidth }} className="shrink-0 overflow-y-auto bg-surface border-r border-border">
            {leftPanel}
          </div>
          <ResizeHandle direction="horizontal" onResize={(d) => setLeftWidth((w) => Math.max(48, Math.min(300, w + d)))} />
        </>
      )}

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="h-10 bg-surface border-b border-border flex items-center px-3 gap-2 shrink-0">
          <button
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            className="p-1 hover:bg-bg rounded text-gray-400 text-xs"
            title={leftCollapsed ? 'Show skills' : 'Hide skills'}
          >
            {leftCollapsed ? '☰' : '✕'}
          </button>
          <span className="text-sm text-gray-400">MrWrite</span>
          <div className="flex-1" />
          <button
            onClick={() => setRightCollapsed(!rightCollapsed)}
            className="p-1 hover:bg-bg rounded text-gray-400 text-xs"
            title={rightCollapsed ? 'Show AI' : 'Hide AI'}
          >
            {rightCollapsed ? '◀' : '▶'}
          </button>
        </div>
        {centerPanel}
      </div>

      {!rightCollapsed && (
        <>
          <ResizeHandle direction="horizontal" onResize={(d) => setRightWidth((w) => Math.max(280, Math.min(600, w + d)))} />
          <div style={{ width: rightWidth }} className="shrink-0 overflow-y-auto bg-surface border-l border-border">
            {rightPanel}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/ && git commit -m "feat: add three-panel resizable layout"
```

---

### Task 15: Writing editor (TipTap)

**Files:** Create: `src/components/editor/WritingEditor.tsx`, `src/components/editor/EditorToolbar.tsx`

- [ ] **Step 1: Write EditorToolbar**

```tsx
// src/components/editor/EditorToolbar.tsx

'use client';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded ${active ? 'bg-accent text-white' : 'hover:bg-bg text-gray-400'}`;

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-surface shrink-0 flex-wrap">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold (Ctrl+B)"><Bold size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic (Ctrl+I)"><Italic size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Code"><Code size={16} /></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><span className="text-xs font-bold">H1</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><span className="text-xs font-bold">H2</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3"><span className="text-xs font-bold">H3</span></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List"><List size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote"><Quote size={16} /></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded hover:bg-bg text-gray-400" title="Undo"><Undo size={16} /></button>
      <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded hover:bg-bg text-gray-400" title="Redo"><Redo size={16} /></button>
    </div>
  );
}
```

- [ ] **Step 2: Write WritingEditor**

```tsx
// src/components/editor/WritingEditor.tsx

'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { useEffect, useCallback } from 'react';

interface WritingEditorProps {
  content?: string;
  onUpdate?: (html: string, text: string) => void;
  placeholder?: string;
  onSelectionChange?: (selectedText: string) => void;
}

export function WritingEditor({
  content = '',
  onUpdate,
  placeholder = '开始写作...',
  onSelectionChange,
}: WritingEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Highlight,
      Typography,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor.getHTML(), editor.getText());
      }
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        onSelectionChange(selectedText);
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto bg-bg">
        <div className="max-w-[720px] mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="h-8 flex items-center justify-end px-4 text-xs text-gray-600 border-t border-border bg-surface shrink-0">
        {editor && `${editor.storage.characterCount.words()} words`}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Install TipTap dependencies and commit**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-character-count @tiptap/extension-highlight @tiptap/extension-typography
git add src/components/editor/ && git commit -m "feat: add TipTap writing editor with toolbar"
```

---

### Task 16: Main page — wire everything together

**Files:** Create: `src/app/page.tsx`

- [ ] **Step 1: Write main page**

```tsx
// src/app/page.tsx

'use client';
import { useState, useCallback } from 'react';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { WritingEditor } from '@/components/editor/WritingEditor';
import { SkillBar } from '@/components/sidebar/SkillBar';
import { ChatPanel } from '@/components/agent/ChatPanel';

export default function Home() {
  const [selectedText, setSelectedText] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);

  const handleSkillSelect = useCallback((skillName: string) => {
    // Will trigger skill execution via the chat panel or direct API
    window.dispatchEvent(new CustomEvent('execute-skill', {
      detail: { skillName, selectedText, documentContent, docId: currentDocId },
    }));
  }, [selectedText, documentContent, currentDocId]);

  return (
    <ThreePanelLayout
      leftPanel={
        <SkillBar
          onSkillSelect={handleSkillSelect}
          selectedText={selectedText}
        />
      }
      centerPanel={
        <WritingEditor
          content={documentContent}
          onUpdate={(html) => setDocumentContent(html)}
          onSelectionChange={setSelectedText}
          placeholder="开始你的创作..."
        />
      }
      rightPanel={
        <ChatPanel
          selectedText={selectedText}
          documentContent={documentContent}
          currentDocId={currentDocId}
        />
      }
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/page.tsx && git commit -m "feat: wire up main editor page with three-panel layout"
```

---

### Task 17: Skill bar (left panel)

**Files:** Create: `src/components/sidebar/SkillBar.tsx`

- [ ] **Step 1: Write SkillBar**

```tsx
// src/components/sidebar/SkillBar.tsx

'use client';
import { useEffect, useState } from 'react';
import { PenLine, Wand2, Sparkles, FileText, CheckCircle, GitBranch } from 'lucide-react';

interface SkillInfo {
  name: string;
  description: string;
  phase: string;
  tags: string[];
}

interface SkillBarProps {
  onSkillSelect: (skillName: string) => void;
  selectedText: string;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  humanizer: <Sparkles size={20} />,
  'outline-generator': <GitBranch size={20} />,
  'chapter-manager': <FileText size={20} />,
  'style-transfer': <Wand2 size={20} />,
  'continuity-checker': <CheckCircle size={20} />,
  'quality-gate': <PenLine size={20} />,
};

export function SkillBar({ onSkillSelect, selectedText }: SkillBarProps) {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {
        // Default skills if API not ready
        setSkills([
          { name: 'humanizer', description: '去 AI 味', phase: 'polishing', tags: ['de-ai'] },
          { name: 'outline-generator', description: '生成大纲', phase: 'pre-writing', tags: ['planning'] },
        ]);
      });
  }, []);

  const grouped = skills.reduce<Record<string, SkillInfo[]>>((acc, skill) => {
    const phase = skill.phase || 'other';
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(skill);
    return acc;
  }, {});

  const phaseLabels: Record<string, string> = {
    'pre-writing': '构思',
    drafting: '写作',
    editing: '编辑',
    polishing: '润色',
    export: '导出',
    other: '其他',
  };

  return (
    <div className="flex flex-col h-full py-2">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
        技能
      </div>
      {Object.entries(grouped).map(([phase, phaseSkills]) => (
        <div key={phase} className="mb-3">
          <div className="px-3 py-1 text-[10px] text-gray-600 uppercase">
            {phaseLabels[phase] || phase}
          </div>
          {phaseSkills.map((skill) => (
            <button
              key={skill.name}
              onClick={() => {
                setActiveSkill(skill.name);
                onSkillSelect(skill.name);
              }}
              disabled={!selectedText}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left
                transition-colors text-sm
                ${activeSkill === skill.name ? 'bg-accent/20 text-accent border-r-2 border-accent' : 'text-gray-400 hover:bg-bg hover:text-gray-200'}
                ${!selectedText ? 'opacity-40 cursor-not-allowed' : ''}
              `}
              title={skill.description}
            >
              <span className="shrink-0">
                {SKILL_ICONS[skill.name] || <Wand2 size={20} />}
              </span>
              <div className="overflow-hidden">
                <div className="font-medium truncate">{skill.name}</div>
                <div className="text-[10px] text-gray-600 truncate">{skill.description}</div>
              </div>
            </button>
          ))}
        </div>
      ))}
      {!selectedText && (
        <div className="px-3 py-2 mt-2 text-[11px] text-gray-600 text-center">
          选中文字以使用技能
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/SkillBar.tsx && git commit -m "feat: add skill bar with phase-grouped skill icons"
```

---

### Task 18: AI chat panel (right panel)

**Files:** Create: `src/components/agent/ChatPanel.tsx`, `src/components/agent/ChatMessage.tsx`

- [ ] **Step 1: Write ChatMessage**

```tsx
// src/components/agent/ChatMessage.tsx

import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`flex gap-2 px-3 py-2 ${role === 'user' ? 'bg-bg/50' : ''}`}>
      <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${role === 'user' ? 'bg-accent' : 'bg-surface border border-border'}`}>
        {role === 'user' ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-500 mb-1">
          {role === 'user' ? '你' : 'MrWrite'}
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write ChatPanel**

```tsx
// src/components/agent/ChatPanel.tsx

'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, ChevronDown } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface ChatPanelProps {
  selectedText: string;
  documentContent: string;
  currentDocId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ selectedText, documentContent, currentDocId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [skills, setSkills] = useState<{ name: string; description: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/skills')
      .then((r) => r.json())
      .then(setSkills)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.skillName) {
        executeSkill(detail.skillName, detail.selectedText, detail.documentContent);
      }
    };
    window.addEventListener('execute-skill', handler);
    return () => window.removeEventListener('execute-skill', handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const executeSkill = async (skillName: string, text: string, context: string) => {
    setActiveSkill(skillName);
    setLoading(true);

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName, input: text, context }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      let fullContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
              if (parsed.done && parsed.score !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent + `\n\n> 人味评分: ${parsed.score}/100`,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setActiveSkill(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    setLoading(true);
    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `你是一位专业的写作助手。用户正在写文章。${selectedText ? `当前选中文字: "${selectedText}"` : ''} 用中文回复，简洁有力。`,
            },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');

      let fullContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium">AI 写作助手</h3>
        <p className="text-[10px] text-gray-500 mt-0.5">
          {selectedText ? `已选中 ${selectedText.length} 字` : '选中文字后可使用技能'}
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-600">
            <p className="mb-3">选择左边技能或直接对话</p>
            {skills.slice(0, 6).map((s) => (
              <button
                key={s.name}
                onClick={() => {
                  if (selectedText) executeSkill(s.name, selectedText, documentContent);
                }}
                disabled={!selectedText}
                className="inline-block px-2 py-1 m-0.5 rounded bg-surface border border-border text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />
            {activeSkill ? `执行 ${activeSkill}...` : '思考中...'}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={selectedText ? '让 AI 帮你处理选中的文字...' : '输入写作指令...'}
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 p-2 bg-accent text-white rounded-lg disabled:opacity-40 hover:bg-accent/80 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/agent/ && git commit -m "feat: add AI chat panel with skill execution and streaming"
```

---

### Task 19: Document management sidebar

**Files:** Create: `src/components/sidebar/DocumentList.tsx`

(Stub — will be integrated into the left panel alongside SkillBar)

- [ ] **Step 1: Write DocumentList**

```tsx
// src/components/sidebar/DocumentList.tsx

'use client';
import { useEffect, useState } from 'react';
import { FileText, Plus, Download, Trash2, Loader2 } from 'lucide-react';

interface DocInfo {
  id: string;
  title: string;
  word_count: number;
  updated_at: string;
}

interface DocumentListProps {
  onSelect: (id: string, title: string) => void;
  activeId: string | null;
}

export function DocumentList({ onSelect, activeId }: DocumentListProps) {
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (Array.isArray(data)) setDocs(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadDocs(); }, []);

  const createDoc = async () => {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '未命名文档', content: '' }),
    });
    const doc = await res.json();
    setDocs((prev) => [doc, ...prev]);
    onSelect(doc.id, doc.title);
  };

  const handleExport = async (docId: string, format: string) => {
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docId, format }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docId}.${format}`;
      a.click();
    }
  };

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">作品</span>
        <button onClick={createDoc} className="p-1 hover:bg-bg rounded text-gray-400" title="新建">
          <Plus size={14} />
        </button>
      </div>

      {loading && (
        <div className="px-3 py-2 text-gray-600 text-xs flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> 加载中...
        </div>
      )}

      {docs.map((doc) => (
        <div
          key={doc.id}
          onClick={() => onSelect(doc.id, doc.title)}
          className={`
            group px-3 py-2 cursor-pointer text-xs flex items-center gap-2
            ${doc.id === activeId ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-bg hover:text-gray-200'}
          `}
        >
          <FileText size={14} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="truncate">{doc.title}</div>
            <div className="text-[10px] text-gray-600">
              {doc.word_count} 字 · {doc.updated_at?.slice(0, 10)}
            </div>
          </div>
          <div className="hidden group-hover:flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleExport(doc.id, 'docx'); }} title="导出 DOCX">
              <Download size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} className="text-red-400" title="删除">
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}

      {!loading && docs.length === 0 && (
        <div className="px-3 py-4 text-center text-[11px] text-gray-600">
          点击 + 创建第一篇作品
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sidebar/DocumentList.tsx && git commit -m "feat: add document list with create/export/delete"
```

---

### Task 20: Settings dialog (API key config)

**Files:** Create: `src/components/settings/SettingsDialog.tsx`

- [ ] **Step 1: Write settings dialog**

```tsx
// src/components/settings/SettingsDialog.tsx

'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(localStorage.getItem('mrwrite_api_key') || '');
    setBaseUrl(localStorage.getItem('mrwrite_base_url') || 'https://api.openai.com/v1');
    setModel(localStorage.getItem('mrwrite_model') || 'gpt-4o');
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    localStorage.setItem('mrwrite_api_key', apiKey);
    localStorage.setItem('mrwrite_base_url', baseUrl);
    localStorage.setItem('mrwrite_model', model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-[480px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">设置</h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded text-gray-400"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <p className="text-[10px] text-gray-500 mt-1">支持 OpenAI / Claude / DeepSeek 等兼容 API</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">默认模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <p className="text-[11px] text-gray-600">
            API Key 仅存储在浏览器本地，不上传任何服务器
          </p>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/80 transition-colors"
          >
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/ && git commit -m "feat: add settings dialog for API key configuration"
```

---

## Phase 6: CLI Launcher

### Task 21: CLI launcher script

**Files:** Create: `cli/mrwrite.js`, update: `package.json`

- [ ] **Step 1: Write CLI launcher**

```javascript
#!/usr/bin/env node
// cli/mrwrite.js

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const PROJECT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PROJECT_DIR, '.env');

// Check .env exists
if (!fs.existsSync(ENV_FILE)) {
  const exampleContent = fs.readFileSync(path.join(PROJECT_DIR, '.env.example'), 'utf-8');
  fs.writeFileSync(ENV_FILE, exampleContent);
  console.log('Created .env from .env.example');
  console.log('Please edit .env to add your LLM API key');
}

// Ensure data directories exist
const os = require('os');
const homeDir = os.homedir();
const dataDir = path.join(homeDir, 'mrwrite');
const dirs = [dataDir, path.join(dataDir, 'workspace'), path.join(dataDir, 'exports'), path.join(dataDir, 'skills')];
dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

console.log(`\n  MrWrite — AI Writing Studio`);
console.log(`  Starting at http://localhost:${PORT}\n`);

// Start Next.js dev server
const nextProcess = spawn('npx', ['next', 'dev', '-p', PORT], {
  cwd: PROJECT_DIR,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: String(PORT) },
});

// Open browser after a short delay
const openBrowser = () => {
  const url = `http://localhost:${PORT}`;
  console.log(`  Opening ${url} in your browser...`);

  const platform = process.platform;
  let openCmd;
  if (platform === 'win32') openCmd = `start "" "${url}"`;
  else if (platform === 'darwin') openCmd = `open "${url}"`;
  else openCmd = `xdg-open "${url}"`;

  exec(openCmd);
};

setTimeout(openBrowser, 2000);

// Handle exit
process.on('SIGINT', () => {
  console.log('\n  Shutting down MrWrite...');
  nextProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  nextProcess.kill();
  process.exit(0);
});
```

- [ ] **Step 2: Update package.json scripts**

Add to `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "mrwrite": "node cli/mrwrite.js"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cli/ package.json && git commit -m "feat: add CLI launcher (mrwrite command)"
```

---

## Phase 7: Polish & Integration

### Task 22: Add remaining built-in skill stubs

**Files:** Create: `src/skills/built-in/outline-generator/SKILL.md`, `src/skills/built-in/chapter-manager/SKILL.md`, etc.

- [ ] **Step 1: Create outline-generator skill**

```markdown
---
name: outline-generator
version: 0.1.0
description: 根据主题或已有内容自动生成层级化写作大纲
phase: pre-writing
mode: prompt
tags: planning, structure, outline
---

# Outline Generator — 大纲生成器

## 角色
你是一位专业的写作策划师，擅长为各类文章构建清晰、有吸引力的大纲结构。

## 任务
根据用户输入的主题或已有内容片段，生成一个层级化大纲：
- 二级标题格式（## 标题）
- 每个小节附带 1-2 句话说明要写什么
- 考虑到目标读者的阅读体验
- 结构要有起伏和节奏感

## 输出格式
直接输出 Markdown 格式的大纲，不要多余解释。
```

- [ ] **Step 2: Create chapter-manager, style-transfer, continuity-checker, quality-gate stubs**

Same pattern as above — each gets a SKILL.md with appropriate prompt instructions.

- [ ] **Step 3: Commit**

```bash
git add src/skills/built-in/ && git commit -m "feat: add skill stubs for outline, chapter, style, continuity, quality-gate"
```

---

### Task 23: Update .gitignore with additional entries

- [ ] **Step 1: Ensure .gitignore covers everything**

Read current `.gitignore` and verify it covers:
```
node_modules/
.next/
.env
.claude/
.superpowers/
__pycache__/
*.pyc
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore && git commit -m "chore: update .gitignore"
```

---

### Task 24: Final integration test and push

- [ ] **Step 1: Start dev server and verify**

```bash
npm run mrwrite
```

Verify:
- Server starts on port 3000
- Browser opens to editor
- Left panel shows skills
- Editor accepts typing
- Right panel shows AI chat

- [ ] **Step 2: Final push**

```bash
git add -A && git commit -m "feat: complete MrWrite MVP with skill system and editor" && git push
```

---

## Verification Checklist

After implementation, verify end-to-end:

1. `npm run mrwrite` starts server and opens browser
2. Editor: type, format (bold, italic, headings, lists), select text
3. Skills: left bar shows skills, selecting text enables them
4. AI Chat: send message, receive streaming response
5. Humanizer: select AI-generated text, run humanizer, see result with score
6. Documents: create new, open existing, auto-save
7. Export: export to HTML/TXT (client-side), DOCX/PDF (with Pandoc)
8. Settings: configure API key in settings dialog
9. CLI: custom port `mrwrite --port 3001` works
