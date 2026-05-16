'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { WritingEditor, EditorHandle } from '@/components/editor/WritingEditor';
import { SkillBar } from '@/components/sidebar/SkillBar';
import { DocumentList } from '@/components/sidebar/DocumentList';
import { ChatPanel } from '@/components/agent/ChatPanel';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Settings } from 'lucide-react';

export default function Home() {
  const [selectedText, setSelectedText] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoSkills, setAutoSkills] = useState<string[]>([]);
  const lastContentRef = useRef('');
  const editorRef = useRef<EditorHandle>(null);

  // Auto-detect which skills to apply
  useEffect(() => {
    const detectSkills = async () => {
      if (!documentText || documentText.length < 100) return;

      // Only detect when content meaningfully changes
      if (Math.abs(documentText.length - lastContentRef.current.length) < 50) return;
      lastContentRef.current = documentText;

      try {
        const res = await fetch('/api/skills/auto-detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: documentText.slice(0, 2000) }),
        });
        const data = await res.json();
        if (data.skills) setAutoSkills(data.skills);
      } catch {}
    };

    const timer = setTimeout(detectSkills, 2000);
    return () => clearTimeout(timer);
  }, [documentText]);

  const handleSkillSelect = useCallback((skillName: string) => {
    window.dispatchEvent(new CustomEvent('execute-skill', {
      detail: { skillName, selectedText, documentContent, docId: currentDocId, autoMode: false },
    }));
  }, [selectedText, documentContent, currentDocId]);

  const handleSkillApply = useCallback((skillName: string, output: string) => {
    // When a skill produces output, offer to insert into editor
    if (output && editorRef.current) {
      const sel = editorRef.current.getSelection();
      if (sel.from !== sel.to) {
        editorRef.current.replaceSelection(output);
      } else {
        editorRef.current.appendContent(output);
      }
    }
  }, []);

  const handleDocSelect = async (id: string, _title?: string) => {
    setCurrentDocId(id);
    try {
      const res = await fetch(`/api/documents/${id}`);
      const doc = await res.json();
      if (doc.content !== undefined) {
        setDocumentContent(doc.content);
      }
    } catch {}
  };

  return (
    <>
      <ThreePanelLayout
        leftPanel={
          <div className="flex flex-col h-full">
            <DocumentList onSelect={handleDocSelect} activeId={currentDocId} />
            <div className="mx-3 border-t border-border" />
            <SkillBar onSkillSelect={handleSkillSelect} selectedText={selectedText} autoSkills={autoSkills} />
          </div>
        }
        centerPanel={
          <WritingEditor
            ref={editorRef}
            content={documentContent}
            onUpdate={(html, text) => {
              setDocumentContent(html);
              setDocumentText(text);
              if (currentDocId) {
                fetch(`/api/documents/${currentDocId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: html }),
                }).catch(() => {});
              }
            }}
            onSelectionChange={setSelectedText}
            placeholder="开始写作..."
          />
        }
        rightPanel={
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">AI 写作助手</span>
              <button onClick={() => setSettingsOpen(true)} className="btn-ghost p-1.5">
                <Settings size={14} />
              </button>
            </div>
            <ChatPanel
              selectedText={selectedText}
              documentContent={documentContent}
              currentDocId={currentDocId}
              autoSkills={autoSkills}
              onSkillApply={handleSkillApply}
            />
          </div>
        }
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
