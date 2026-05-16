'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { useEffect } from 'react';

interface WritingEditorProps {
  content?: string;
  onUpdate?: (html: string, text: string) => void;
  placeholder?: string;
  onSelectionChange?: (selectedText: string) => void;
}

export function WritingEditor({ content = '', onUpdate, placeholder = '开始写作...', onSelectionChange }: WritingEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      CharacterCount,
      Highlight,
      Typography,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) onUpdate(editor.getHTML(), editor.getText());
    },
    onSelectionUpdate: ({ editor }) => {
      if (onSelectionChange) {
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to);
        onSelectionChange(selectedText);
      }
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="flex flex-col h-full bg-bg-editor">
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>
      <div className="h-9 flex items-center justify-end px-5 text-xs text-text-muted border-t border-border bg-surface/50 shrink-0">
        {editor && (
          <span className="flex items-center gap-3">
            <span>{editor.storage.characterCount.characters()} chars</span>
            <span className="w-px h-3 bg-border" />
            <span>{editor.storage.characterCount.words()} words</span>
          </span>
        )}
      </div>
    </div>
  );
}
