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
  const { skillName, input, context, params, apiKey, baseUrl, model } = body;

  if (!skillName || !input) {
    return Response.json({ error: 'skillName and input required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      await executeSkillStream(
        { skillName, input, context, params, apiKey, baseUrl, model },
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
