'use client';
import { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Quote, Undo, Redo } from 'lucide-react';

export function EditorToolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded-md transition-all ${
      active
        ? 'bg-accent/20 text-accent shadow-panel'
        : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'
    }`;

  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-border bg-surface/80 shrink-0 flex-wrap backdrop-blur-sm">
      <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold (Ctrl+B)"><Bold size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic (Ctrl+I)"><Italic size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleStrike().run()} className={btnClass(editor.isActive('strike'))} title="Strikethrough"><Strikethrough size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleCode().run()} className={btnClass(editor.isActive('code'))} title="Code"><Code size={15} /></button>
      <span className="w-px h-4 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1"><span className="text-xs font-bold">H1</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2"><span className="text-xs font-bold">H2</span></button>
      <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))} title="Heading 3"><span className="text-xs font-bold">H3</span></button>
      <span className="w-px h-4 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List"><List size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Numbered List"><ListOrdered size={15} /></button>
      <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btnClass(editor.isActive('blockquote'))} title="Blockquote"><Quote size={15} /></button>
      <span className="w-px h-4 bg-border mx-1" />
      <button onClick={() => editor.chain().focus().undo().run()} className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all" title="Undo"><Undo size={15} /></button>
      <button onClick={() => editor.chain().focus().redo().run()} className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all" title="Redo"><Redo size={15} /></button>
    </div>
  );
}
