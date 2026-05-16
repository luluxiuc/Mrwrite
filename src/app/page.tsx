'use client';
import { useState, useCallback } from 'react';
import { ThreePanelLayout } from '@/components/layout/ThreePanelLayout';
import { WritingEditor } from '@/components/editor/WritingEditor';
import { SkillBar } from '@/components/sidebar/SkillBar';
import { DocumentList } from '@/components/sidebar/DocumentList';
import { ChatPanel } from '@/components/agent/ChatPanel';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { Settings } from 'lucide-react';

export default function Home() {
  const [selectedText, setSelectedText] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSkillSelect = useCallback((skillName: string) => {
    window.dispatchEvent(new CustomEvent('execute-skill', {
      detail: { skillName, selectedText, documentContent, docId: currentDocId },
    }));
  }, [selectedText, documentContent, currentDocId]);

  const handleDocSelect = async (id: string) => {
    setCurrentDocId(id);
    const res = await fetch(`/api/documents/${id}`);
    const doc = await res.json();
    if (doc.content) {
      setDocumentContent(doc.content);
    }
  };

  return (
    <>
      <ThreePanelLayout
        leftPanel={
          <div className="flex flex-col h-full">
            <DocumentList onSelect={handleDocSelect} activeId={currentDocId} />
            <div className="border-t border-border" />
            <SkillBar onSkillSelect={handleSkillSelect} selectedText={selectedText} />
          </div>
        }
        centerPanel={
          <WritingEditor
            content={documentContent}
            onUpdate={(html, text) => {
              setDocumentContent(html);
              if (currentDocId) {
                fetch(`/api/documents/${currentDocId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: html }),
                }).catch(() => {});
              }
            }}
            onSelectionChange={setSelectedText}
            placeholder="开始创作..."
          />
        }
        rightPanel={
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-2 border-b border-border">
              <span className="text-xs text-gray-500">AI 助手</span>
              <button onClick={() => setSettingsOpen(true)} className="p-1 hover:bg-bg rounded text-gray-400">
                <Settings size={14} />
              </button>
            </div>
            <ChatPanel selectedText={selectedText} documentContent={documentContent} currentDocId={currentDocId} />
          </div>
        }
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
