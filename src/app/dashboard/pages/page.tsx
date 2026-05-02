'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Trash2, Plus, ExternalLink, Copy, CheckCheck, Globe, AlertCircle, Loader2, Download, Pencil, Check, Settings2 } from 'lucide-react';

interface ClonedPage {
  id: string;
  name: string;
  original_url: string;
  created_at: string;
  config?: {
    custom_domain?: string;
    checkout_url?: string;
    pixel_script?: string;
  };
}

export default function PagesList() {
  const [pages, setPages] = useState<ClonedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fetchPages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pages/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPages(data.pages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, []);

  const getPublicUrl = (page: ClonedPage) => {
    const domain = page.config?.custom_domain;
    if (domain) return `https://${domain}`;
    return `${window.location.origin}/p/${page.id}`;
  };

  const copyUrl = (page: ClonedPage) => {
    navigator.clipboard.writeText(getPublicUrl(page));
    setCopiedId(page.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadZip = async (pageId: string) => {
    setDownloadingId(pageId);
    try {
      const res = await fetch(`/api/pages/download?id=${pageId}`);
      if (!res.ok) throw new Error('Erro ao gerar ZIP');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pagina_${pageId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRename = async (pageId: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch('/api/pages/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, name: renameValue.trim() })
      });
      if (!res.ok) throw new Error('Erro ao renomear');
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, name: renameValue.trim() } : p));
      setRenamingId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (pageId: string, pageName: string) => {
    const confirmText = window.prompt(`CUIDADO: Isso vai excluir a página "${pageName}" e todos os assets.\n\nDigite DELETAR para confirmar:`);
    if (confirmText !== 'DELETAR') {
      if (confirmText !== null) alert('Ação cancelada.');
      return;
    }

    setDeletingId(pageId);
    try {
      const res = await fetch('/api/pages/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId })
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      setPages(prev => prev.filter(p => p.id !== pageId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
      <Loader2 size={32} className="animate-spin mr-3" />
      <span className="text-lg">Carregando páginas clonadas...</span>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Páginas Clonadas</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Clone qualquer página da web com todos os assets. Baixe como ZIP ou hospede em seu domínio.</p>
        </div>
        <Link
          href="/dashboard/pages/new"
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Clonar Página</span>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-6 border border-transparent dark:border-red-800">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {pages.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-16 flex flex-col items-center justify-center transition-colors">
          <FileText size={48} className="mb-4 text-gray-300 dark:text-slate-600" />
          <p className="text-lg font-medium mb-2 text-gray-700 dark:text-slate-300">Nenhuma página clonada ainda</p>
          <p className="text-sm mb-6 text-gray-400 dark:text-slate-500">Clique em &quot;Clonar Página&quot; para começar</p>
          <Link
            href="/dashboard/pages/new"
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
          >
            Clonar Minha Primeira Página
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pages.map((page) => (
            <div key={page.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm p-5 flex items-center gap-5 hover:border-purple-300 dark:hover:border-purple-600 transition-all">
              
              {/* Ícone */}
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center shrink-0">
                <FileText size={22} className="text-purple-600 dark:text-purple-400" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                {renamingId === page.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRename(page.id)}
                      className="flex-1 px-3 py-1 border border-purple-300 dark:border-purple-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white dark:bg-slate-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <button onClick={() => handleRename(page.id)} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={18} /></button>
                    <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs">✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base">{page.name}</h3>
                    <button
                      onClick={() => { setRenamingId(page.id); setRenameValue(page.name); }}
                      className="p-1 text-gray-300 dark:text-slate-600 hover:text-purple-500 dark:hover:text-purple-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Renomear"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
                <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">Original: {page.original_url}</p>
                
                {/* URL e configs */}
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded border border-transparent dark:border-purple-800/30">
                    {page.config?.custom_domain ? '🌐 Domínio Próprio' : '🔗 URL do Sistema'}
                  </span>
                  <code className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-sm">
                    {page.config?.custom_domain ? `https://${page.config.custom_domain}` : `/p/${page.id}`}
                  </code>
                  {page.config?.checkout_url && (
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                      💰 Checkout Ativo
                    </span>
                  )}
                  {page.config?.pixel_script && (
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                      📊 Pixel Ativo
                    </span>
                  )}
                </div>
              </div>

              {/* Data */}
              <div className="text-xs text-gray-400 dark:text-slate-500 text-right shrink-0 hidden md:block">
                <p>Clonada em</p>
                <p className="font-medium text-gray-600 dark:text-slate-300">{new Date(page.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyUrl(page)}
                  title="Copiar URL"
                  className="p-2 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                >
                  {copiedId === page.id ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
                <a
                  href={getPublicUrl(page)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Visualizar"
                  className="p-2 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
                <button
                  onClick={() => handleDownloadZip(page.id)}
                  disabled={downloadingId === page.id}
                  title="Baixar ZIP"
                  className="p-2 text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {downloadingId === page.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </button>
                <Link
                  href={`/dashboard/pages/${page.id}`}
                  title="Configurar"
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
                >
                  <Settings2 size={16} />
                  Configurar
                </Link>
                <button
                  onClick={() => handleDelete(page.id, page.name)}
                  disabled={deletingId === page.id}
                  title="Deletar"
                  className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === page.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
