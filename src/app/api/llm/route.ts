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
