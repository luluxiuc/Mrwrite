import { User, Bot, Zap } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
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

  return (
    <div className={`flex gap-3 px-4 py-3 ${role === 'user' ? 'bg-bg/40' : ''}`}>
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
        role === 'user'
          ? 'bg-accent/20 text-accent'
          : 'bg-surface border border-border text-text-secondary'
      }`}>
        {role === 'user' ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-text-muted mb-1 font-medium">{role === 'user' ? 'You' : 'MrWrite'}</div>
        <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words text-text-primary/90">{content}</div>
      </div>
    </div>
  );
}
