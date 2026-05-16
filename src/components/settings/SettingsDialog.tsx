'use client';
import { useState, useEffect } from 'react';
import { X, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface SettingsDialogProps { open: boolean; onClose: () => void; }

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [saved, setSaved] = useState(false);

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string; model?: string } | null>(null);

  useEffect(() => {
    if (open) {
      setApiKey(localStorage.getItem('mrwrite_api_key') || '');
      setBaseUrl(localStorage.getItem('mrwrite_base_url') || 'https://api.openai.com/v1');
      setModel(localStorage.getItem('mrwrite_model') || 'gpt-4o');
      setTemperature(parseFloat(localStorage.getItem('mrwrite_temperature') || '0.7'));
      setMaxTokens(parseInt(localStorage.getItem('mrwrite_max_tokens') || '4096', 10));
      setTestResult(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    localStorage.setItem('mrwrite_api_key', apiKey);
    localStorage.setItem('mrwrite_base_url', baseUrl);
    localStorage.setItem('mrwrite_model', model);
    localStorage.setItem('mrwrite_temperature', temperature.toString());
    localStorage.setItem('mrwrite_max_tokens', maxTokens.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/llm/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseUrl, model }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="glass-surface rounded-xl w-[520px] max-h-[85vh] overflow-y-auto p-6 shadow-dialog"
        onClick={(e) => e.stopPropagation()}
      >
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
          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all"
            />
            <p className="text-[10px] text-text-muted mt-1.5">
              支持 OpenAI / Claude / DeepSeek 等兼容 API
            </p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">默认模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o, claude-sonnet-4, deepseek-chat, ..."
              className="w-full bg-bg border border-border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-text-muted transition-all"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              温度 / Temperature: <span className="text-accent font-mono">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>精确 (0)</span>
              <span>平衡 (0.7)</span>
              <span>创意 (2.0)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              最大 Token 数: <span className="text-accent font-mono">{maxTokens}</span>
            </label>
            <input
              type="range"
              min="512"
              max="32768"
              step="512"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>512</span>
              <span>4096</span>
              <span>32768</span>
            </div>
          </div>
        </div>

        {/* Test connection result */}
        {testResult && (
          <div className={`mt-4 p-3 rounded-lg text-sm flex items-start gap-2.5 ${
            testResult.ok
              ? 'bg-green-500/10 border border-green-500/20 text-green-600'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {testResult.ok ? (
              <>
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">连接成功</p>
                  {testResult.model && (
                    <p className="text-xs mt-0.5 opacity-80">模型: {testResult.model}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">连接失败</p>
                  <p className="text-xs mt-0.5 opacity-80">{testResult.error || '未知错误'}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            onClick={handleTest}
            disabled={testing || !apiKey}
            className="px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-surface-hover disabled:opacity-40 transition-all flex items-center gap-2"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            {testing ? '测试中...' : '测试连接'}
          </button>

          <div className="flex items-center gap-3">
            <p className="text-[11px] text-text-muted">API Key 仅存储在浏览器本地</p>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent-hover transition-all"
            >
              {saved ? '已保存' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
