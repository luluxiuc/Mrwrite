'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Zap, Wifi, WifiOff } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface ChatPanelProps {
  selectedText: string;
  documentContent: string;
  currentDocId: string | null;
  autoSkills?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Credentials {
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SKILL_LABELS: Record<string, string> = {
  humanizer: '去 AI 味',
  'outline-generator': '生成大纲',
  'chapter-manager': '章节管理',
  'style-transfer': '风格迁移',
  'continuity-checker': '一致性检查',
  'quality-gate': '质量门禁',
};

export function ChatPanel({ selectedText, documentContent, currentDocId, autoSkills = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [skills, setSkills] = useState<{ name: string; description: string }[]>([]);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/skills').then((r) => r.json()).then(setSkills).catch(() => {});
  }, []);

  // Check connection status on mount
  useEffect(() => {
    const creds = getCredentials();
    if (!creds.apiKey) {
      setConnectionOk(false);
      return;
    }
    // Don't block UI — just show status
    testConnection(creds).then(setConnectionOk).catch(() => setConnectionOk(false));
  }, []);

  const getCredentials = (): Credentials => {
    if (typeof window === 'undefined') return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' };
    return {
      apiKey: localStorage.getItem('mrwrite_api_key') || '',
      baseUrl: localStorage.getItem('mrwrite_base_url') || 'https://api.openai.com/v1',
      model: localStorage.getItem('mrwrite_model') || 'gpt-4o',
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
    } catch {
      return false;
    }
  };

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

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

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
    onError: (msg: string) => void
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
        { role: 'assistant', content: '⚠️ 请先在设置中配置 API Key（点击右上角齿轮图标）' },
      ]);
      return;
    }

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
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
          { role: 'assistant', content: `❌ 连接失败: ${errData.error || 'Unknown error'}` },
        ]);
        setLoading(false);
        return;
      }

      await readStreamToMessages(response, (errMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `❌ 错误: ${errMsg}` },
        ]);
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ 网络错误: ${err.message}` },
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
        { role: 'assistant', content: '⚠️ 请先在设置中配置 API Key' },
      ]);
      return;
    }

    setActiveSkill(skillName);
    setLoading(true);

    try {
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
          { role: 'assistant', content: `❌ 技能执行失败: ${errData.error || 'Unknown error'}` },
        ]);
        setLoading(false);
        setActiveSkill(null);
        return;
      }

      await readStreamToMessages(response, (errMsg) => {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `❌ 错误: ${errMsg}` },
        ]);
      });
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ 错误: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
      setActiveSkill(null);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Connection status and Auto-skill banner */}
      {autoSkills.length > 0 && (
        <div className="px-4 py-2 bg-accent-subtle border-b border-accent/20">
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

      {/* Selection info + Connection status */}
      <div className="px-4 py-2 border-b border-border flex items-center justify-between">
        <p className="text-[11px] text-text-muted">
          {selectedText
            ? `已选中 ${selectedText.length} 字`
            : '选中文字后可使用技能'}
        </p>
        {connectionOk === true && (
          <span className="flex items-center gap-1 text-[10px] text-green-500">
            <Wifi size={10} /> API 已连接
          </span>
        )}
        {connectionOk === false && (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <WifiOff size={10} /> API 未配置
          </span>
        )}
      </div>

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
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-muted">
            <Loader2 size={14} className="animate-spin" />
            {activeSkill
              ? `执行 ${SKILL_LABELS[activeSkill] || activeSkill}...`
              : '思考中...'}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
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
