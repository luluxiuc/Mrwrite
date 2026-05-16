import { NextRequest } from 'next/server';
import { testConnection } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const { apiKey, baseUrl, model } = await req.json();

  const resolvedKey = apiKey || process.env.LLM_API_KEY || '';
  const resolvedUrl = baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const resolvedModel = model || process.env.LLM_MODEL || 'gpt-4o';

  if (!resolvedKey) {
    return Response.json({ ok: false, error: 'API Key not configured' }, { status: 401 });
  }

  const result = await testConnection({
    apiKey: resolvedKey,
    baseURL: resolvedUrl,
    model: resolvedModel,
  });

  return Response.json(result);
}
