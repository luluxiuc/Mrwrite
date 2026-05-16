'use client';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-[480px] max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">设置</h2>
          <button onClick={onClose} className="p-1 hover:bg-bg rounded text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..."
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
            <p className="text-[10px] text-gray-500 mt-1">支持 OpenAI / Claude / DeepSeek 等兼容 API</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">API Base URL</label>
            <input type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">默认模型</label>
            <input type="text" value={model} onChange={(e) => setModel(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          <p className="text-[11px] text-gray-600">API Key 仅存储在浏览器本地，不上传任何服务器</p>
          <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/80 transition-colors">
            {saved ? '已保存' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
