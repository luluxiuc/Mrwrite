'use client';
import { useEffect, useState } from 'react';
import { FileText, Plus, Download, Trash2, Loader2, MoreHorizontal } from 'lucide-react';

interface DocInfo { id: string; title: string; word_count: number; updated_at: string; }
interface DocumentListProps { onSelect: (id: string, title: string) => void; activeId: string | null; }

export function DocumentList({ onSelect, activeId }: DocumentListProps) {
  const [docs, setDocs] = useState<DocInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents').then(r => r.json()).then(d => { if (Array.isArray(d)) setDocs(d); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const createDoc = async () => {
    const res = await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '未命名文档', content: '' }) });
    const doc = await res.json(); setDocs(prev => [doc, ...prev]); onSelect(doc.id, doc.title);
  };

  const handleExport = async (docId: string, format: string) => {
    const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ docId, format }) });
    if (res.ok) { const blob = await res.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${docId}.${format}`; a.click(); }
  };

  const deleteDoc = async (docId: string) => {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days} 天前`;
    return d.slice(0, 10);
  };

  return (
    <div className="flex flex-col py-3">
      <div className="flex items-center justify-between px-4 mb-2">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Documents</span>
        <button onClick={createDoc} className="btn-ghost p-1" title="New document"><Plus size={15} /></button>
      </div>
      {loading && <div className="px-4 py-4 text-center"><Loader2 size={14} className="animate-spin text-text-muted mx-auto" /></div>}
      {docs.map(doc => (
        <div key={doc.id}
          onClick={() => onSelect(doc.id, doc.title)}
          className={`group px-4 py-2.5 cursor-pointer transition-all mx-2 rounded-lg ${
            doc.id === activeId
              ? 'bg-accent-subtle text-accent'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FileText size={14} className={`shrink-0 ${doc.id === activeId ? 'text-accent' : 'text-text-muted'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate">{doc.title}</div>
              <div className="text-[10px] text-text-muted mt-0.5">
                {doc.word_count} 字 · {formatDate(doc.updated_at)}
              </div>
            </div>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button onClick={(e) => { e.stopPropagation(); handleExport(doc.id, 'docx'); }} className="btn-ghost p-1" title="Export DOCX">
                <Download size={12} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc.id); }} className="btn-ghost p-1 hover:text-error" title="Delete">
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      ))}
      {!loading && docs.length === 0 && (
        <div className="px-4 py-8 text-center text-[12px] text-text-muted">
          <FileText size={24} className="mx-auto mb-2 opacity-30" />
          <p>No documents yet</p>
          <button onClick={createDoc} className="text-accent hover:text-accent-hover mt-1 font-medium text-[12px]">Create your first piece</button>
        </div>
      )}
    </div>
  );
}
