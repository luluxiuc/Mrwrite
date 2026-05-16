'use client';
import { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';

interface SettingsDialogProps { open: boolean; onClose: () => void; }

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem('mrwrite_api_key') || '');
      setBaseUrl(localStorage.getItem('mrwrite_base_url') || 'https://api.openai.com/v1');
      setModel(localStorage.getItem('mrwrite_model') || 'gpt-4o');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    localStorage.setItem('mrwrite_api_key', apiKey);
    localStorage.setItem('mrwrite_base_url', baseUrl);
    localStorage.setItem('mrwrite_model', model);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="glass-surface rounded-xl w-[480px] max-h-[80vh] overflow-y-auto p-6 shadow-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
              <Settings size={16} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">设置</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..."
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all" />
            <p className="text-[10px] text-text-muted mt-1.5">支持 OpenAI / Claude / DeepSeek 等兼容 API</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">API Base URL</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">默认模型</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <p className="text-[11px] text-text-muted">API Key 仅存储在浏览器本地，不上传任何服务器</p>
          <button onClick={handleSave} className="px-5 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent-hover transition-all">
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
