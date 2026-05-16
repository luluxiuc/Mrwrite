// src/skills/engine.ts

import { SkillExecuteRequest, SkillExecuteResult } from './types';
import { getSkill, loadSkillPrompt } from './registry';
import { streamChat, chat } from '@/lib/llm';

function getCredentials(req: SkillExecuteRequest) {
  return {
    apiKey: req.apiKey || process.env.LLM_API_KEY || '',
    baseURL: req.baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: req.model || process.env.LLM_MODEL || 'gpt-4o',
  };
}

export async function executeSkill(
  req: SkillExecuteRequest
): Promise<SkillExecuteResult> {
  const skill = getSkill(req.skillName);
  if (!skill) {
    return { output: '', warnings: [`Skill "${req.skillName}" not found`] };
  }

  if (skill.mode === 'code') {
    return executeCodeSkill(skill, req);
  }

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
    return executePromptSkill(skill, req);
  }
}

async function executePromptSkill(
  skill: import('./types').SkillDefinition,
  req: SkillExecuteRequest
): Promise<SkillExecuteResult> {
  const systemPrompt = loadSkillPrompt(skill.name);
  const userPrompt = buildUserPrompt(req);
  const creds = getCredentials(req);

  if (!creds.apiKey) {
    return { output: '', warnings: ['API Key not configured. Set it in Settings or .env'] };
  }

  try {
    const output = await chat({
      apiKey: creds.apiKey,
      baseURL: creds.baseURL,
      model: creds.model,
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
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
  const creds = getCredentials(req);

  if (!creds.apiKey) {
    callbacks.onError(new Error('API Key not configured. Set it in Settings or .env'));
    return;
  }

  let fullOutput = '';

  streamChat({
    apiKey: creds.apiKey,
    baseURL: creds.baseURL,
    model: creds.model,
    systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
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
