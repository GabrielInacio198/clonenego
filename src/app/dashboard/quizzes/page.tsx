'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, Trash2, Plus, ExternalLink, Copy, CheckCheck, Globe, AlertCircle, Loader2, CopyPlus, Pencil, Check, Eye } from 'lucide-react';

interface Quiz {
  id: string;
  name: string;
  original_url: string;
  created_at: string;
  theme_config?: { custom_domain?: string; replacements?: Record<string, string> };
  views?: number;
}

export default function QuizzesList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'single' | 'batch', quizId?: string, quizName?: string }>({ isOpen: false, type: 'single' });
  const [deleteInput, setDeleteInput] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quiz/list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuizzes(data.quizzes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const getPublicUrl = (quiz: Quiz) => {
    const domain = quiz.theme_config?.custom_domain;
    if (domain) return `https://${domain}`;
    return `${window.location.origin}/q/${quiz.id}`;
  };

  const copyUrl = (quiz: Quiz) => {
    navigator.clipboard.writeText(getPublicUrl(quiz));
    setCopiedId(quiz.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDuplicate = async (quizId: string) => {
    setDuplicatingId(quizId);
    try {
      const res = await fetch('/api/quiz/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quizId })
      });
      if (!res.ok) throw new Error('Erro ao duplicar');
      await fetchQuizzes(); // Recarregar a lista
      showToast('Quiz duplicado com sucesso!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleRename = async (quizId: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch('/api/quiz/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId, name: renameValue.trim() })
      });
      if (!res.ok) throw new Error('Erro ao renomear');
      setQuizzes(prev => prev.map(q => q.id === quizId ? { ...q, name: renameValue.trim() } : q));
      setRenamingId(null);
      showToast('Nome atualizado com sucesso!');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === quizzes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(quizzes.map(q => q.id));
    }
  };

  const confirmDelete = async () => {
    if (deleteInput !== 'DELETAR') {
      showToast('A palavra digitada não confere.', 'error');
      return;
    }

    const isBatch = deleteModal.type === 'batch';
    const idsToDelete = isBatch ? selectedIds : [deleteModal.quizId!];
    
    setDeletingId('deleting');
    try {
      const res = await fetch('/api/quiz/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizIds: idsToDelete })
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      
      setQuizzes(prev => prev.filter(q => !idsToDelete.includes(q.id)));
      if (isBatch) setSelectedIds([]);
      setDeleteModal({ isOpen: false, type: 'single' });
      setDeleteInput('');
      showToast(isBatch ? 'Quizzes excluídos com sucesso!' : 'Quiz excluído com sucesso!');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
      <Loader2 size={32} className="animate-spin mr-3" />
      <span className="text-lg">Carregando seus quizzes...</span>
    </div>
  );

  return (
    <div>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-top-2 fade-in duration-300 ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
           {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
           <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Meus Quizzes</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Gerencie seus funis clonados. Cada quiz tem uma URL pública única.</p>
        </div>
        <Link
          href="/dashboard/quizzes/new"
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Clonar Novo Quiz</span>
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg mb-6 border border-transparent dark:border-red-800">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-16 flex flex-col items-center justify-center text-gray-500 dark:text-slate-400 transition-colors">
          <Globe size={48} className="mb-4 text-gray-300 dark:text-slate-600" />
          <p className="text-lg font-medium mb-2 text-gray-700 dark:text-slate-300">Nenhum quiz clonado ainda</p>
          <p className="text-sm mb-6 text-gray-400 dark:text-slate-500">Clique em &quot;Clonar Novo Quiz&quot; para começar</p>
          <Link
            href="/dashboard/quizzes/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Clonar Meu Primeiro Quiz
          </Link>
        </div>
      ) : (
        <>
          {/* Top Actions Bar for Batch */}
          <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <label className="flex items-center gap-3 cursor-pointer pl-2">
              <input 
                type="checkbox" 
                checked={selectedIds.length === quizzes.length && quizzes.length > 0}
                onChange={toggleSelectAll}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Selecionar Todos ({quizzes.length})
              </span>
            </label>
            
            {selectedIds.length > 0 && (
              <button
                onClick={() => setDeleteModal({ isOpen: true, type: 'batch' })}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={16} />
                Excluir Selecionados ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className={`bg-white dark:bg-slate-800 rounded-xl border ${selectedIds.includes(quiz.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700'} shadow-sm p-5 flex items-center gap-5 transition-all`}>
                
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(quiz.id)}
                  onChange={() => toggleSelection(quiz.id)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />

                {/* Ícone */}
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Globe size={22} className="text-blue-600 dark:text-blue-400" />
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  {renamingId === quiz.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(quiz.id)}
                        className="flex-1 px-3 py-1 border border-blue-300 dark:border-blue-600 rounded-lg text-sm font-semibold text-gray-900 dark:text-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      <button onClick={() => handleRename(quiz.id)} className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={18} /></button>
                      <button onClick={() => setRenamingId(null)} className="p-1 text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-xs">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate text-base" onClick={() => toggleSelection(quiz.id)} style={{cursor: 'pointer'}}>{quiz.name}</h3>
                      <button
                        onClick={() => { setRenamingId(quiz.id); setRenameValue(quiz.name); }}
                        className="p-1 text-gray-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="Renomear"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">Original: {quiz.original_url}</p>
                  
                  {/* URL Pública & Acessos */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded border border-transparent dark:border-green-800/30">
                        {quiz.theme_config?.custom_domain ? '🌐 Domínio Próprio' : '🔗 URL do Sistema'}
                      </span>
                      <code className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-sm">
                        {quiz.theme_config?.custom_domain
                          ? `https://${quiz.theme_config.custom_domain}`
                          : `/q/${quiz.id}`}
                      </code>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-50 dark:bg-slate-700 px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                      <Eye size={14} className="text-blue-500 dark:text-blue-400" />
                      {quiz.views || 0} acessos
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="text-xs text-gray-400 dark:text-slate-500 text-right shrink-0 hidden md:block">
                  <p>Criado em</p>
                  <p className="font-medium text-gray-600 dark:text-slate-300">{new Date(quiz.created_at).toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyUrl(quiz)}
                    title="Copiar URL pública"
                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    {copiedId === quiz.id ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
                  </button>
                  <a
                    href={getPublicUrl(quiz)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir quiz"
                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    <ExternalLink size={18} />
                  </a>
                  <button
                    onClick={() => handleDuplicate(quiz.id)}
                    disabled={duplicatingId === quiz.id}
                    title="Duplicar este quiz"
                    className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {duplicatingId === quiz.id ? <Loader2 size={18} className="animate-spin" /> : <CopyPlus size={18} />}
                  </button>
                  <Link
                    href={`/dashboard/quiz/${quiz.id}`}
                    title="Editar"
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                  >
                    <FileEdit size={16} />
                    Editar
                  </Link>
                  <button
                    onClick={() => setDeleteModal({ isOpen: true, type: 'single', quizId: quiz.id, quizName: quiz.name })}
                    disabled={deletingId === quiz.id}
                    title="Deletar"
                    className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === quiz.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* MODAL DE DELEÇÃO */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {deleteModal.type === 'batch' ? 'Excluir Vários Funis' : 'Excluir Funil'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Ação irreversível.</p>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6 border border-red-100 dark:border-red-900/50">
              <p className="text-sm text-red-800 dark:text-red-300 font-medium">
                CUIDADO: Isso vai excluir {deleteModal.type === 'batch' ? <strong>{selectedIds.length} funis</strong> : <strong>"{deleteModal.quizName}"</strong>}.
                Todas as configurações serão apagadas e os usuários pararão de acessar imediatamente.
              </p>
            </div>

            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Para confirmar, digite a palavra <strong>DELETAR</strong> abaixo:
            </label>
            <input
              type="text"
              autoFocus
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETAR"
              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-mono tracking-widest text-center"
            />

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => { setDeleteModal({ isOpen: false, type: 'single' }); setDeleteInput(''); }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteInput !== 'DELETAR' || deletingId === 'deleting'}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingId === 'deleting' ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
