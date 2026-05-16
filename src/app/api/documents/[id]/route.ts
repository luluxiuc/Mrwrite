import { NextRequest } from 'next/server';
import { getDocument, upsertDocument, deleteDocument } from '@/lib/db';
import { readDocument, writeDocument, deleteDocumentFile, countWords } from '@/lib/storage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const meta = await getDocument(params.id);
  const content = readDocument(params.id);

  if (!meta || content === null) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }

  return Response.json({ ...meta, content });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { title, content, tags } = await req.json();

  writeDocument(params.id, content);
  const words = countWords(content || '');

  await upsertDocument({
    id: params.id,
    title: title || 'Untitled',
    path: `${params.id}.md`,
    word_count: words,
    tags: JSON.stringify(tags || []),
  });

  return Response.json({ id: params.id, word_count: words });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteDocument(params.id);
  deleteDocumentFile(params.id);
  return Response.json({ deleted: true });
}
