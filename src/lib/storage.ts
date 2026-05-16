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
