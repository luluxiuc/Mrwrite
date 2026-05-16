'use client';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded ${active ? 'bg-accent text-white' : 'hover:bg-bg text-gray-400'}`;

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-surface shrink-0 flex-wrap">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold (Ctrl+B)"><Bold size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic (Ctrl+I)"><Italic size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Code"><Code size={16} /></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><span className="text-xs font-bold">H1</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><span className="text-xs font-bold">H2</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3"><span className="text-xs font-bold">H3</span></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List"><List size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={16} /></button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote"><Quote size={16} /></button>
      <span className="w-px h-5 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded hover:bg-bg text-gray-400" title="Undo"><Undo size={16} /></button>
      <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded hover:bg-bg text-gray-400" title="Redo"><Redo size={16} /></button>
    </div>
  );
}
