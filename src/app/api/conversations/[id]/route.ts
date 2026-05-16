import { NextRequest } from 'next/server';
import {
  getConversation,
  updateConversationTitle,
  deleteConversation,
  listMessages,
  saveMessage,
  deleteMessages,
} from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const conversation = await getConversation(params.id);
  if (!conversation) {
    return Response.json({ error: 'Conversation not found' }, { status: 404 });
  }
  const messages = await listMessages(params.id);
  return Response.json({ ...conversation, messages });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { title } = await req.json();
  await updateConversationTitle(params.id, title);
  return Response.json({ id: params.id, title });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await deleteConversation(params.id);
  return Response.json({ deleted: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { role, content } = await req.json();
  if (!role || content === undefined) {
    return Response.json({ error: 'role and content required' }, { status: 400 });
  }
  await saveMessage(params.id, role, content);
  return Response.json({ saved: true });
}
