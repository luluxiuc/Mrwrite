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
  input: string;
  context?: string;
  params?: Record<string, unknown>;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface SkillExecuteResult {
  output: string;
  score?: number;
  warnings?: string[];
  diff?: string;
}

export interface SkillModule {
  default: {
    execute: (req: SkillExecuteRequest) => Promise<SkillExecuteResult>;
  };
}
