'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Loader2, ArrowRight } from 'lucide-react';

export default function NewQuizPage() {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');

    try {
      // Usando um userId mockado para teste local (substituir depois por auth real)
      const userId = '11111111-1111-1111-1111-111111111111'; // UUID genérico de teste ou pegue do context
      
      const response = await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao clonar quiz');
      }

      // Redireciona para o Editor Visual do quiz recém criado
      router.push(`/dashboard/quiz/${data.quiz.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 mb-6">
          <Copy size={28} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clonar Novo Quiz</h2>
        </div>
        
        <p className="text-gray-600 dark:text-slate-300 mb-8">
          Cole a URL do quiz que você deseja copiar. Nosso motor inteligente fará a leitura 
          da estrutura, textos e design para você editar e lançar em poucos minutos.
        </p>

        <form onSubmit={handleClone} className="space-y-6">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              URL do Quiz Alvo
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://exemplo.com/quiz-emagrecimento"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-transparent dark:border-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !url}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Clonando Estrutura...</span>
              </>
            ) : (
              <>
                <span>Iniciar Clonagem Inteligente</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
