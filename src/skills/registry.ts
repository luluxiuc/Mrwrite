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

  return content.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}
