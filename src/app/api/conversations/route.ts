import { NextRequest } from 'next/server';
import { listConversations, createConversation } from '@/lib/db';

export async function GET() {
  const conversations = await listConversations();
  return Response.json(conversations);
}

export async function POST(req: NextRequest) {
  const { title, documentId } = await req.json();
  const id = crypto.randomUUID();
  await createConversation(id, title || '新对话', documentId);
  return Response.json({ id, title: title || '新对话' });
}
