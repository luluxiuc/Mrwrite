'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface ChatPanelProps {
  selectedText: string;
  documentContent: string;
  currentDocId: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatPanel({ selectedText, documentContent, currentDocId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [skills, setSkills] = useState<{ name: string; description: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then(setSkills).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.skillName) executeSkill(detail.skillName, detail.selectedText, detail.documentContent);
    };
    window.addEventListener('execute-skill', handler);
    return () => window.removeEventListener('execute-skill', handler);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const executeSkill = async (skillName: string, text: string, context: string) => {
    setActiveSkill(skillName);
    setLoading(true);
    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillName, input: text, context }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      let fullContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              }
              if (parsed.done && parsed.score !== undefined) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent + `\n\n> 人味评分: ${parsed.score}/100` };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
      setActiveSkill(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: `你是一位专业的写作助手。用户正在写文章。${selectedText ? `当前选中文字: "${selectedText}"` : ''} 用中文回复，简洁有力。` },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          stream: true,
        }),
      });
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No stream');
      let fullContent = '';
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="p-3 border-b border-border">
        <p className="text-[10px] text-gray-500">{selectedText ? `已选中 ${selectedText.length} 字` : '选中文字后可使用技能'}</p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-600">
            <p className="mb-3">选择左边技能或直接对话</p>
            {skills.slice(0, 6).map((s) => (
              <button key={s.name} onClick={() => { if (selectedText) executeSkill(s.name, selectedText, documentContent); }} disabled={!selectedText}
                className="inline-block px-2 py-1 m-0.5 rounded bg-surface border border-border text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40">
                {s.name}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (<ChatMessage key={i} role={msg.role} content={msg.content} />))}
        {loading && (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" />{activeSkill ? `执行 ${activeSkill}...` : '思考中...'}
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={selectedText ? '让 AI 帮你处理选中文字...' : '输入写作指令...'}
            className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-accent" rows={2} />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            className="shrink-0 p-2 bg-accent text-white rounded-lg disabled:opacity-40 hover:bg-accent/80 transition-colors">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
