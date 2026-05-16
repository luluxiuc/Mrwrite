// src/lib/llm.ts

import OpenAI from 'openai';

export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getEnvConfig(): LLMConfig {
  return {
    apiKey: process.env.LLM_API_KEY || '',
    baseURL: process.env.LLM_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-4o',
  };
}

export function createClient(config?: Partial<LLMConfig>) {
  const c = { ...getEnvConfig(), ...config };
  return new OpenAI({
    apiKey: c.apiKey,
    baseURL: c.baseURL,
  });
}

export interface StreamChatOptions {
  apiKey: string;
  baseURL: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(options: StreamChatOptions) {
  const openai = createClient({
    apiKey: options.apiKey || undefined,
    baseURL: options.baseURL || undefined,
    model: options.model || undefined,
  });

  try {
    const stream = await openai.chat.completions.create({
      model: options.model,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens || 4096,
      stream: true,
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...options.messages as any,
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

export async function chat(options: {
  apiKey: string;
  baseURL: string;
  model: string;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const openai = createClient({
    apiKey: options.apiKey || undefined,
    baseURL: options.baseURL || undefined,
    model: options.model || undefined,
  });

  const response = await openai.chat.completions.create({
    model: options.model,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 4096,
    messages: [
      { role: 'system', content: options.systemPrompt },
      ...options.messages as any,
    ],
  });

  return response.choices[0]?.message?.content || '';
}

export async function testConnection(config: LLMConfig): Promise<{ ok: boolean; error?: string; model?: string }> {
  try {
    const openai = createClient(config);
    const response = await openai.chat.completions.create({
      model: config.model,
      messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
      max_tokens: 10,
    });
    return { ok: true, model: response.model };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
