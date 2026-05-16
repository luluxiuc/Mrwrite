import { NextRequest } from 'next/server';
import { listDocuments, upsertDocument } from '@/lib/db';
import { ensureDirs, writeDocument, countWords } from '@/lib/storage';

export async function GET() {
  const docs = await listDocuments();
  return Response.json(docs);
}

export async function POST(req: NextRequest) {
  const { title, content } = await req.json();
  ensureDirs();

  const id = crypto.randomUUID();
  writeDocument(id, content || '');
  const words = countWords(content || '');

  await upsertDocument({
    id,
    title: title || 'Untitled',
    path: `${id}.md`,
    word_count: words,
    tags: '[]',
  });

  return Response.json({ id, title: title || 'Untitled', word_count: words });
}
