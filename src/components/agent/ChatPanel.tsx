'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, Wifi, WifiOff, Plus, MessageSquare, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface ChatPanelProps {
  selectedText: string;
  documentContent: string;
  currentDocId: string | null;
  autoSkills?: string[];
  onSkillApply?: (skillName: string, output: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Credentials {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

interface Conversation {
  id: string;
  title: string;
  document_id: string | null;
  created_at: string;
  updated_at: string;
}

const SKILL_LABELS: Record<string, string> = {
  humanizer: '去 AI 味',
  'outline-generator': '生成大纲',
  'chapter-manager': '章节管理',
  'style-transfer': '风格迁移',
  'continuity-checker': '一致性检查',
  'quality-gate': '质量门禁',
};

const SKILL_DESCRIPTIONS: Record<string, string> = {
  humanizer: '检测并去除 AI 写作痕迹',
  'outline-generator': '生成层级化写作大纲',
  'chapter-manager': '管理章节结构与一致性',
  'style-transfer': '模仿指定写作文风',
  'continuity-checker': '审计跨章节一致性',
  'quality-gate': '多维度写作质量评估',
};

function estimateTokens(text: string): number {
  let tokens = 0;
  for (const ch of text) {
    if (/[一-鿿]/.test(ch)) tokens += 0.6;
    else if (/[a-zA-Z0-9]/.test(ch)) tokens += 0.3;
    else tokens += 0.2;
  }
  return Math.ceil(tokens);
}

export function ChatPanel({ selectedText, documentContent, currentDocId, autoSkills = [], onSkillApply }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [skills, setSkills] = useState<{ name: string; description: string }[]>([]);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [convListOpen, setConvListOpen] = useState(false);

  // Skill execution detail
  const [skillProgress, setSkillProgress] = useState<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then(setSkills).catch(() => {});
    loadConversations();
  }, []);

  useEffect(() => {
    const creds = getCredentials();
    if (!creds.apiKey) { setConnectionOk(false); return; }
    testConnection(creds).then(setConnectionOk).catch(() => setConnectionOk(false));
  }, []);

  // Auto-scroll on new messages or streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Aggressive scroll during streaming
  useEffect(() => {
    if (loading && scrollRef.current) {
      const el = scrollRef.current;
      const raf = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [messages, loading]);

  const getCredentials = (): Credentials => {
    if (typeof window === 'undefined') return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096 };
    return {
      apiKey: localStorage.getItem('mrwrite_api_key') || '',
      baseUrl: localStorage.getItem('mrwrite_base_url') || 'https://api.openai.com/v1',
      model: localStorage.getItem('mrwrite_model') || 'gpt-4o',
      temperature: parseFloat(localStorage.getItem('mrwrite_temperature') || '0.7'),
      maxTokens: parseInt(localStorage.getItem('mrwrite_max_tokens') || '4096', 10),
    };
  };

  const testConnection = async (creds: Credentials): Promise<boolean> => {
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      });
      const data = await res.json();
      return data.ok === true;
    } catch { return false; }
  };

  // Conversation management
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch {}
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setConvListOpen(false);
  };

  const switchConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })));
      }
      setConversationId(convId);
    } catch {}
    setConvListOpen(false);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (conversationId === convId) {
      setMessages([]);
      setConversationId(null);
    }
  };

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    try {
      const firstMsg = messages.length > 0 ? messages[0].content.slice(0, 30) : '新对话';
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: firstMsg + '...', documentId: currentDocId }),
      });
      const data = await res.json();
      setConversationId(data.id);
      setConversations((prev) => [{ id: data.id, title: data.title, document_id: currentDocId, created_at: '', updated_at: '' }, ...prev]);
      return data.id;
    } catch { return ''; }
  };

  const handleApplyToEditor = (content: string) => {
    if (!content) return;
    // Convert plain text to HTML paragraphs for the editor
    const html = content
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    window.dispatchEvent(new CustomEvent('insert-to-editor', {
      detail: { html, mode: selectedText ? 'replace' : 'append' },
    }));
  };

  const persistMessage = async (convId: string, role: 'user' | 'assistant' | 'system', content: string) => {
    if (!convId) return;
    try {
      await fetch(`/api/conversations/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content }),
      });
    } catch {}
  };

  // Skill execution listener
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.skillName) {
        const creds = getCredentials();
        executeSkill(detail.skillName, detail.selectedText || selectedText, detail.documentContent || documentContent, creds);
      }
    };
    window.addEventListener('execute-skill', handler);
    return () => window.removeEventListener('execute-skill', handler);
  }, [selectedText, documentContent]);

  const buildSystemPrompt = (): string => {
    const title = currentDocId || '未命名文档';
    const maxContentLen = 5000;
    const truncated = documentContent.length > maxContentLen
      ? documentContent.slice(0, maxContentLen) + '\n...(内容过长，已截取前5000字)'
      : documentContent;

    return `你是一位专业的 AI 写作助手，运行在 MrWrite 写作工作台中。

## 你的能力
- 你可以看到用户正在写的文章全文
- 你可以讨论写作思路、提供建议
- 你可以根据用户要求生成内容
- 你可以修改、润色、重写选中的文字
- 你可以调用写作技能（去AI味、生成大纲、风格迁移等）

## 当前文档
标题: ${title}
内容:
\`\`\`
${truncated}
\`\`\`

## 当前选中文字
${selectedText ? `"${selectedText}"` : '（未选中文字）'}

## 工作方式
1. 理解用户的需求
2. 如果需要生成新内容，直接在聊天中输出
3. 如果用户确认，可以说「我将把这些内容写入编辑器」
4. 对选中的文字，可以直接给出修改后的版本

请用中文回复，专业、有温度。`;
  };

  const readStreamToMessages = async (
    response: Response,
    onError: (msg: string) => void,
    convId: string
  ): Promise<string> => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No stream available');

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
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullContent + `\n\n> 人味评分: ${parsed.score}/100`,
                };
                return updated;
              });
            }
            if (parsed.error) {
              onError(parsed.error);
              return fullContent;
            }
          } catch {}
        }
      }
    }
    await persistMessage(convId, 'assistant', fullContent);
    return fullContent;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    const creds = getCredentials();
    if (!creds.apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '请先在设置中配置 API Key（点击右上角齿轮图标）' },
      ]);
      return;
    }

    const convId = await ensureConversation();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    if (convId) await persistMessage(convId, 'user', userMessage);
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt();
      const response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: creds.apiKey,
          baseUrl: creds.baseUrl,
          model: creds.model,
          temperature: creds.temperature,
          maxTokens: creds.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `连接失败: ${errData.error || 'Unknown error'}` },
        ]);
        setLoading(false);
        return;
      }

      await readStreamToMessages(response, (errMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `错误: ${errMsg}` },
        ]);
      }, convId);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `网络错误: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const executeSkill = async (skillName: string, text: string, context: string, credsArg?: Credentials) => {
    const creds = credsArg || getCredentials();
    if (!creds.apiKey) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '请先在设置中配置 API Key' },
      ]);
      return;
    }

    const label = SKILL_LABELS[skillName] || skillName;
    const desc = SKILL_DESCRIPTIONS[skillName] || '';
    setActiveSkill(skillName);
    setSkillProgress(`正在加载技能: ${label}`);
    setLoading(true);

    const convId = await ensureConversation();
    // Add a system message about skill invocation
    if (convId) {
      await persistMessage(convId, 'system', `调用技能: ${label} (${desc})`);
    }

    try {
      setSkillProgress(`执行中: ${label} — ${desc}`);

      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName,
          input: text,
          context,
          apiKey: creds.apiKey,
          baseUrl: creds.baseUrl,
          model: creds.model,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `技能执行失败: ${errData.error || 'Unknown error'}` },
        ]);
        setLoading(false);
        setActiveSkill(null);
        setSkillProgress('');
        return;
      }

      setSkillProgress(`接收结果: ${label}`);
      const resultContent = await readStreamToMessages(response, (errMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `错误: ${errMsg}` },
        ]);
      }, convId);

      // Auto-apply rewrite-type skills to editor
      const autoApplySkills = ['humanizer', 'style-transfer'];
      if (autoApplySkills.includes(skillName) && resultContent && selectedText) {
        handleApplyToEditor(resultContent);
        if (onSkillApply) onSkillApply(skillName, resultContent);
      }

      setSkillProgress(`${label} — 完成`);
      setTimeout(() => setSkillProgress(''), 2000);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `错误: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setActiveSkill(null);
    }
  };

  const [clientCreds, setClientCreds] = useState<Credentials>({
    apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o', temperature: 0.7, maxTokens: 4096,
  });

  // Sync credentials from localStorage on client only
  useEffect(() => {
    setClientCreds(getCredentials());
  }, []);

  // Context usage calculation — uses client-side state to avoid hydration mismatch
  const systemPrompt = buildSystemPrompt();
  const allText = systemPrompt + messages.map((m) => m.content).join('');
  const usedTokens = estimateTokens(allText);
  const maxTokens = clientCreds.maxTokens || 4096;
  const usagePercent = Math.min(100, Math.round((usedTokens / maxTokens) * 100));
  const usageColor = usagePercent > 80 ? '#ef4444' : usagePercent > 50 ? '#f59e0b' : '#22c55e';

  return (
    <div className="flex flex-col flex-1">
      {/* Conversation header */}
      <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0">
        <button
          onClick={startNewConversation}
          className="btn-ghost p-1.5 shrink-0"
          title="新对话"
        >
          <Plus size={14} />
        </button>
        <div className="relative flex-1">
          <button
            onClick={() => setConvListOpen(!convListOpen)}
            className="flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-md hover:bg-surface-hover transition-all"
          >
            <MessageSquare size={12} className="text-text-muted shrink-0" />
            <span className="text-[12px] text-text-secondary truncate flex-1">
              {conversationId
                ? conversations.find((c) => c.id === conversationId)?.title || '对话'
                : messages.length > 0
                  ? '新对话 (未保存)'
                  : '新对话'}
            </span>
            {convListOpen ? <ChevronUp size={12} className="text-text-muted shrink-0" /> : <ChevronDown size={12} className="text-text-muted shrink-0" />}
          </button>
          {convListOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-xl z-30 max-h-48 overflow-y-auto">
              <div className="p-1">
                <button
                  onClick={startNewConversation}
                  className="flex items-center gap-2 w-full px-3 py-2 text-[12px] text-accent hover:bg-accent-subtle rounded-md transition-all"
                >
                  <Plus size={12} /> 新建对话
                </button>
                {conversations.length === 0 && (
                  <p className="px-3 py-2 text-[11px] text-text-muted">暂无历史对话</p>
                )}
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => switchConversation(c.id)}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-[12px] rounded-md cursor-pointer transition-all group ${
                      c.id === conversationId ? 'bg-accent-subtle text-accent' : 'text-text-secondary hover:bg-surface-hover'
                    }`}
                  >
                    <MessageSquare size={12} className="shrink-0" />
                    <span className="flex-1 truncate">{c.title}</span>
                    <button
                      onClick={(e) => deleteConversation(c.id, e)}
                      className="hidden group-hover:block p-0.5 hover:text-error shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* Connection status mini */}
        <div className="shrink-0">
          {connectionOk === true && <Wifi size={11} className="text-green-500" />}
          {connectionOk === false && <WifiOff size={11} className="text-red-400" />}
        </div>
      </div>

      {/* Auto-skill banner */}
      {autoSkills.length > 0 && (
        <div className="px-4 py-2 bg-accent-subtle border-b border-accent/20 shrink-0">
          <p className="text-[11px] text-accent font-medium mb-1.5 flex items-center gap-1.5">
            <Zap size={11} /> AI 建议使用的技能
          </p>
          <div className="flex flex-wrap gap-1.5">
            {autoSkills.map((skillName) => (
              <button
                key={skillName}
                onClick={() => {
                  const creds = getCredentials();
                  executeSkill(skillName, selectedText || documentContent, '', creds);
                }}
                className="px-2.5 py-1 text-[11px] rounded-full bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20 transition-all"
              >
                {SKILL_LABELS[skillName] || skillName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Skill execution status */}
      {skillProgress && (
        <div className="px-4 py-2 bg-accent/5 border-b border-accent/20 shrink-0">
          <div className="flex items-center gap-2 text-[12px] text-accent">
            <Loader2 size={12} className="animate-spin" />
            <span>{skillProgress}</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && (
          <div className="p-6 text-center text-sm text-text-muted">
            <div className="w-10 h-10 rounded-xl bg-accent-subtle flex items-center justify-center mx-auto mb-3">
              <Zap size={18} className="text-accent" />
            </div>
            <p className="mb-3 text-text-secondary">选择左侧技能或直接对话</p>
            {skills.slice(0, 6).map((s) => (
              <button
                key={s.name}
                onClick={() => {
                  if (selectedText) {
                    const creds = getCredentials();
                    executeSkill(s.name, selectedText, documentContent, creds);
                  }
                }}
                disabled={!selectedText}
                className="inline-block px-3 py-1.5 m-1 rounded-lg bg-surface border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {SKILL_LABELS[s.name] || s.name}
              </button>
            ))}
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} onApplyToEditor={handleApplyToEditor} />
        ))}
        {loading && !activeSkill && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            思考中...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Context usage bar */}
      <div className="shrink-0 px-4 py-1.5 border-t border-border bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted shrink-0">上下文</span>
          <div className="flex-1 h-1.5 bg-bg-editor rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${usagePercent}%`, backgroundColor: usageColor }}
            />
          </div>
          <span className="text-[10px] text-text-muted shrink-0" style={{ color: usageColor }}>
            {usedTokens}/{maxTokens} ({usagePercent}%)
          </span>
        </div>
      </div>

      {/* Selection info */}
      <div className="px-4 py-1.5 border-t border-border flex items-center justify-between shrink-0">
        <p className="text-[10px] text-text-muted">
          {selectedText
            ? `已选中 ${selectedText.length} 字`
            : '选中文字后可使用技能'}
        </p>
        <span className="text-[10px] text-text-muted">
          {messages.length > 0 ? `${messages.length} 条消息` : ''}
        </span>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={selectedText ? '让 AI 帮你处理选中文字...' : '输入写作指令...'}
            className="flex-1 bg-bg-editor border border-border rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all"
            rows={2}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="shrink-0 p-2.5 bg-accent text-black rounded-lg disabled:opacity-40 hover:bg-accent-hover transition-all self-end"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
