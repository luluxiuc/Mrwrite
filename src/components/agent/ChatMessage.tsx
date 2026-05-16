import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`flex gap-2 px-3 py-2 ${role === 'user' ? 'bg-bg/50' : ''}`}>
      <div className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${role === 'user' ? 'bg-accent' : 'bg-surface border border-border'}`}>
        {role === 'user' ? <User size={12} /> : <Bot size={12} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-gray-500 mb-1">{role === 'user' ? '你' : 'MrWrite'}</div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{content}</div>
      </div>
    </div>
  );
}
