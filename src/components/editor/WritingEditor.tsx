'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { EditorToolbar } from './EditorToolbar';
import { useEffect, useImperativeHandle, forwardRef } from 'react';

export interface EditorHandle {
  insertAtCursor: (html: string) => void;
  replaceSelection: (html: string) => void;
  appendContent: (html: string) => void;
  getHTML: () => string;
  getText: () => string;
  getSelection: () => { from: number; to: number; text: string };
}

interface WritingEditorProps {
  content?: string;
  onUpdate?: (html: string, text: string) => void;
  placeholder?: string;
  onSelectionChange?: (selectedText: string) => void;
}

export const WritingEditor = forwardRef<EditorHandle, WritingEditorProps>(
  function WritingEditor({ content = '', onUpdate, placeholder = '开始写作...', onSelectionChange }, ref) {
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
      onUpdate: ({ editor: ed }) => {
        if (onUpdate) onUpdate(ed.getHTML(), ed.getText());
      },
      onSelectionUpdate: ({ editor: ed }) => {
        if (onSelectionChange) {
          const { from, to } = ed.state.selection;
          const text = ed.state.doc.textBetween(from, to);
          onSelectionChange(text);
        }
      },
    });

    // Sync external content changes
    useEffect(() => {
      if (editor && content && content !== editor.getHTML()) {
        editor.commands.setContent(content);
      }
    }, [content, editor]);

    // Expose editor methods to parent
    useImperativeHandle(ref, () => ({
      insertAtCursor: (html: string) => {
        editor?.chain().focus().insertContent(html).run();
      },
      replaceSelection: (html: string) => {
        editor?.chain().focus().deleteSelection().insertContent(html).run();
      },
      appendContent: (html: string) => {
        editor?.chain().focus('end').insertContent(html).run();
      },
      getHTML: () => editor?.getHTML() || '',
      getText: () => editor?.getText() || '',
      getSelection: () => {
        if (!editor) return { from: 0, to: 0, text: '' };
        const { from, to } = editor.state.selection;
        return { from, to, text: editor.state.doc.textBetween(from, to) };
      },
    }), [editor]);

    // Listen for insert-to-editor events from ChatPanel
    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (!editor || !detail) return;

        const { html, mode } = detail;
        if (!html) return;

        if (mode === 'replace') {
          // Replace selected text, or insert at cursor if nothing selected
          const { from, to } = editor.state.selection;
          if (from !== to) {
            editor.chain().focus().deleteSelection().insertContent(html).run();
          } else {
            editor.chain().focus().insertContent(html).run();
          }
        } else if (mode === 'append') {
          editor.chain().focus('end').insertContent(html).run();
        } else {
          // default: insert at cursor
          editor.chain().focus().insertContent(html).run();
        }
      };
      window.addEventListener('insert-to-editor', handler);
      return () => window.removeEventListener('insert-to-editor', handler);
    }, [editor]);

    return (
      <div className="flex flex-col h-full bg-bg-editor min-h-0">
        <EditorToolbar editor={editor} />
        <div className="flex-1 overflow-y-auto min-h-0">
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
);
