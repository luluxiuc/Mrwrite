import { NextRequest } from 'next/server';
import { createClient } from '@/lib/llm';

export async function POST(req: NextRequest) {
  const { messages, apiKey, baseUrl, model, temperature, maxTokens } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return Response.json({ error: 'messages array required' }, { status: 400 });
  }

  // Use provided credentials, fall back to env
  const resolvedKey = apiKey || process.env.LLM_API_KEY || '';
  const resolvedUrl = baseUrl || process.env.LLM_BASE_URL || 'https://api.openai.com/v1';
  const resolvedModel = model || process.env.LLM_MODEL || 'gpt-4o';

  if (!resolvedKey) {
    return Response.json({ error: 'API Key not configured. Set it in Settings or .env' }, { status: 401 });
  }

  const openai = createClient({ apiKey: resolvedKey, baseURL: resolvedUrl, model: resolvedModel });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openai.chat.completions.create({
          model: resolvedModel,
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
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
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
