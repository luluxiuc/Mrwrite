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
