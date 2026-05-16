import { User, Bot, Zap, ArrowLeftToLine } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  onApplyToEditor?: (content: string) => void;
}

function extractApplyContent(fullContent: string): { display: string; apply: string } {
  // Try to extract a markdown code block or the whole content
  const codeBlock = fullContent.match(/```[\w]*\n?([\s\S]*?)```/);
  if (codeBlock) {
    return { display: fullContent, apply: codeBlock[1].trim() };
  }
  return { display: fullContent, apply: fullContent };
}

export function ChatMessage({ role, content, onApplyToEditor }: ChatMessageProps) {
  if (role === 'system') {
    return (
      <div className="px-4 py-1.5 text-center">
        <span className="text-[10px] text-text-muted bg-surface border border-border rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
          <Zap size={10} className="text-accent" />
          {content}
        </span>
      </div>
    );
  }

  const { apply } = extractApplyContent(content);

  return (
    <div className={`flex gap-3 px-4 py-3 group/msg ${role === 'user' ? 'bg-bg/40' : ''}`}>
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
        role === 'user'
          ? 'bg-accent/20 text-accent'
          : 'bg-surface border border-border text-text-secondary'
      }`}>
        {role === 'user' ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-text-muted mb-1 font-medium flex items-center gap-2">
          <span>{role === 'user' ? 'You' : 'MrWrite'}</span>
          {role === 'assistant' && onApplyToEditor && content.trim() && (
            <button
              onClick={() => onApplyToEditor(apply)}
              className="hidden group-hover/msg:inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/20 px-2 py-0.5 rounded-full transition-all"
              title="应用到编辑器"
            >
              <ArrowLeftToLine size={10} />
              应用到编辑器
            </button>
          )}
        </div>
        <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-text-primary/90">{content}</div>
      </div>
    </div>
  );
}
