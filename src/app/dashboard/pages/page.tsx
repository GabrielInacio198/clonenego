'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FileText, Trash2, Plus, ExternalLink, Copy, CheckCheck, 
  Globe, AlertCircle, Loader2, Download, Pencil, Check, 
  Settings2, Search, Filter, MoreHorizontal, ChevronRight,
  CheckSquare, Square
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  
  // UI State
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modal state
  const [modal, setModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  }>({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    onConfirm: () => {},
    type: 'info'
  });

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

  const filteredPages = useMemo(() => {
    return pages.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.original_url.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [pages, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPages.map(p => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

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

  const showModal = (config: typeof modal) => setModal(config);
  const closeModal = () => setModal(prev => ({ ...prev, show: false }));

  const handleDelete = async (ids: string[]) => {
    setIsDeleting(true);
    try {
      for (const pageId of ids) {
        const res = await fetch('/api/pages/delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pageId })
        });
        if (!res.ok) throw new Error('Erro ao deletar página');
      }
      setPages(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedIds([]);
      closeModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (ids: string[]) => {
    const isMultiple = ids.length > 1;
    showModal({
      show: true,
      title: isMultiple ? `Excluir ${ids.length} páginas?` : 'Excluir página?',
      message: `Esta ação não pode ser desfeita. Todos os arquivos e configurações serão removidos permanentemente.`,
      confirmText: isMultiple ? 'Sim, excluir todas' : 'Sim, excluir',
      type: 'danger',
      onConfirm: () => handleDelete(ids)
    });
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
      a.click();
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

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-400">
      <Loader2 size={32} className="animate-spin mr-3 text-purple-500" />
      <span className="text-lg font-medium">Carregando páginas...</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header com Busca e Ações em Lote */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Páginas
            <span className="text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg">
              {pages.length}
            </span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm md:text-base">Gerencie suas clonagens de alta performance.</p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => confirmDelete(selectedIds)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-bold text-sm shadow-sm border border-red-200 dark:border-red-800/50"
            >
              <Trash2 size={18} />
              <span className="hidden xs:inline">Excluir ({selectedIds.length})</span>
              <span className="xs:hidden">({selectedIds.length})</span>
            </button>
          )}
          <Link
            href="/dashboard/pages/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl transition-all font-bold text-sm shadow-lg shadow-purple-500/20 active:scale-95"
          >
            <Plus size={20} />
            <span>Clonar</span>
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 shadow-sm transition-colors">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all"
          />
        </div>
        <button 
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          {selectedIds.length === filteredPages.length && filteredPages.length > 0 ? (
            <CheckSquare size={18} className="text-purple-600" />
          ) : (
            <Square size={18} />
          )}
          Selecionar Tudo
        </button>
      </div>

      {/* Listagem */}
      {filteredPages.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-20 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
            <FileText size={40} className="text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nenhuma página encontrada</h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-xs mb-8">
            {searchTerm ? 'Nenhum resultado para sua busca.' : 'Comece clonando sua primeira página agora mesmo.'}
          </p>
          <Link
            href="/dashboard/pages/new"
            className="px-8 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 font-bold transition-all shadow-xl shadow-purple-500/25 active:scale-95"
          >
            Clonar Página
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPages.map((page) => (
            <div 
              key={page.id} 
              className={`group bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 p-4 ${
                selectedIds.includes(page.id) 
                  ? 'border-purple-500 ring-2 ring-purple-500/10 bg-purple-50/30 dark:bg-purple-900/10' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {/* Checkbox */}
                <button 
                  onClick={() => toggleSelect(page.id)}
                  className={`shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    selectedIds.includes(page.id)
                      ? 'bg-purple-600 border-purple-600 text-white'
                      : 'border-slate-200 dark:border-slate-600 hover:border-purple-400'
                  }`}
                >
                  {selectedIds.includes(page.id) && <Check size={16} strokeWidth={3} />}
                </button>
  
                {/* Preview/Icon */}
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0">
                  <FileText size={22} className="md:size-[26px]" />
                </div>
  
                {/* Info */}
                <div className="flex-1 min-w-0">
                  {renamingId === page.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(page.id)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border-2 border-purple-500 rounded-xl text-sm font-bold dark:text-white outline-none"
                      />
                      <button onClick={() => handleRename(page.id)} className="p-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"><Check size={20} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate text-base md:text-lg">{page.name}</h3>
                      <button
                        onClick={() => { setRenamingId(page.id); setRenameValue(page.name); }}
                        className="sm:opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-purple-500 transition-all"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    <Globe size={12} className="shrink-0" />
                    <span className="truncate max-w-[150px] xs:max-w-[200px] md:max-w-md">{page.original_url}</span>
                  </div>
  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                      ID: {page.id.slice(0, 6)}
                    </span>
                    {page.config?.checkout_url && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                        Checkout
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/50">
                <div className="flex flex-col items-start sm:items-end sm:mr-4 text-left sm:text-right">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Criado em</span>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{new Date(page.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyUrl(page)}
                    className="p-2 text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all"
                    title="Copiar Link"
                  >
                    {copiedId === page.id ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  
                  <Link
                    href={`/dashboard/pages/${page.id}`}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 transition-all shadow-sm"
                  >
                    <Settings2 size={16} />
                    <span>Configurar</span>
                  </Link>
  
                  <button
                    onClick={() => confirmDelete([page.id])}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Profissional Customizado */}
      {modal.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={closeModal}></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                modal.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
              }`}>
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3">{modal.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">{modal.message}</p>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row gap-3">
              <button
                onClick={closeModal}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={modal.onConfirm}
                disabled={isDeleting}
                className={`flex-1 px-6 py-3 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
                  modal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/25' : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25'
                }`}
              >
                {isDeleting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  modal.confirmText
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
