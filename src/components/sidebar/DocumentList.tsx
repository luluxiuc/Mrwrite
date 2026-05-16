'use client';
import { useEffect, useState } from 'react';
import { FileText, Plus, Download, Trash2, Loader2 } from 'lucide-react';

interface DocInfo { id: string; title: string; word_count: number; updated_at: string; }
interface DocumentListProps { onSelect: (id: string, title: string) => void; activeId: string | null; }

export function DocumentList({ onSelect, activeId }: DocumentListProps) {
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocs = async () => {
    try { const res = await fetch('/api/documents'); const data = await res.json(); if (Array.isArray(data)) setDocs(data); } catch {}
    setLoading(false);
  };
  useEffect(() => { loadDocs(); }, []);

  const createDoc = async () => {
    const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '未命名文档', content: '' }) });
    const doc = await res.json(); setDocs((prev) => [doc, ...prev]); onSelect(doc.id, doc.title);
  };

  const handleExport = async (docId: string, format: string) => {
    const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId, format }) });
    if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${docId}.${format}`; a.click(); }
  };

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">作品</span>
        <button onClick={createDoc} className="p-1 hover:bg-bg rounded text-gray-400" title="新建"><Plus size={14} /></button>
      </div>
      {loading && <div className="px-3 py-2 text-gray-600 text-xs flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> 加载中...</div>}
      {docs.map((doc) => (
        <div key={doc.id} onClick={() => onSelect(doc.id, doc.title)}
          className={`group px-3 py-2 cursor-pointer text-xs flex items-center gap-2 ${doc.id === activeId ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-bg hover:text-gray-200'}`}>
          <FileText size={14} className="shrink-0" />
          <div className="flex-1 min-w-0"><div className="truncate">{doc.title}</div><div className="text-[10px] text-gray-600">{doc.word_count} 字 · {doc.updated_at?.slice(0, 10)}</div></div>
          <div className="hidden group-hover:flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); handleExport(doc.id, 'docx'); }} title="导出 DOCX"><Download size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} className="text-red-400" title="删除"><Trash2 size={12} /></button>
          </div>
        </div>
      ))}
      {!loading && docs.length === 0 && <div className="px-3 py-4 text-center text-[11px] text-gray-600">点击 + 创建第一篇作品</div>}
    </div>
  );
}
