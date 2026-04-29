'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileEdit, Trash2, Plus, ExternalLink, Copy, CheckCheck, Globe, AlertCircle, Loader2 } from 'lucide-react';

interface Quiz {
  id: string;
  name: string;
  original_url: string;
  created_at: string;
  theme_config?: { custom_domain?: string; replacements?: Record<string, string> };
}

export default function QuizzesList() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (quizId: string) => {
    if (!confirm('Tem certeza? Isso vai deletar o quiz e todas as configurações salvas.')) return;
    setDeletingId(quizId);
    try {
      const res = await fetch('/api/quiz/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId })
      });
      if (!res.ok) throw new Error('Erro ao deletar');
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <Loader2 size={32} className="animate-spin mr-3" />
      <span className="text-lg">Carregando seus quizzes...</span>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Meus Quizzes</h2>
          <p className="text-gray-500 mt-1">Gerencie seus funis clonados. Cada quiz tem uma URL pública única.</p>
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
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-lg mb-6">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 flex flex-col items-center justify-center text-gray-500">
          <Globe size={48} className="mb-4 text-gray-300" />
          <p className="text-lg font-medium mb-2">Nenhum quiz clonado ainda</p>
          <p className="text-sm mb-6 text-gray-400">Clique em &quot;Clonar Novo Quiz&quot; para começar</p>
          <Link
            href="/dashboard/quizzes/new"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Clonar Meu Primeiro Quiz
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-5 hover:border-blue-300 transition-all">
              
              {/* Ícone */}
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                <Globe size={22} className="text-blue-600" />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate text-base">{quiz.name}</h3>
                <p className="text-xs text-gray-400 truncate mt-0.5">Original: {quiz.original_url}</p>
                
                {/* URL Pública */}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                    {quiz.theme_config?.custom_domain ? '🌐 Domínio Próprio' : '🔗 URL do Sistema'}
                  </span>
                  <code className="text-xs text-gray-500 truncate max-w-sm">
                    {quiz.theme_config?.custom_domain
                      ? `https://${quiz.theme_config.custom_domain}`
                      : `/q/${quiz.id}`}
                  </code>
                </div>
              </div>

              {/* Data */}
              <div className="text-xs text-gray-400 text-right shrink-0 hidden md:block">
                <p>Criado em</p>
                <p className="font-medium text-gray-600">{new Date(quiz.created_at).toLocaleDateString('pt-BR')}</p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyUrl(quiz)}
                  title="Copiar URL pública"
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {copiedId === quiz.id ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
                <a
                  href={`/q/${quiz.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir quiz"
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ExternalLink size={18} />
                </a>
                <Link
                  href={`/dashboard/quiz/${quiz.id}`}
                  title="Editar"
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <FileEdit size={16} />
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  disabled={deletingId === quiz.id}
                  title="Deletar"
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deletingId === quiz.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
