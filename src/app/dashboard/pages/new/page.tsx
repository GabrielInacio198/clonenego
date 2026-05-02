'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, ArrowRight, Globe, CreditCard, Code } from 'lucide-react';

export default function NewPageClone() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/pages/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name: name.trim() || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao clonar página');
      }

      // Redirecionar para configuração
      router.push(`/dashboard/pages/${data.page.id}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400 mb-6">
          <FileText size={28} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clonar Página</h2>
        </div>
        
        <p className="text-gray-600 dark:text-slate-300 mb-4">
          Cole a URL de qualquer página que deseja clonar. O sistema utiliza <strong>proxy reverso inteligente</strong> 
          para servir a página em tempo real com seu domínio, link de checkout e pixel de rastreamento.
        </p>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Globe size={12} /> Funciona com qualquer site
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <CreditCard size={12} /> Trocar link de checkout
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Code size={12} /> Adicionar pixel e scripts
          </span>
        </div>

        <form onSubmit={handleClone} className="space-y-5">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              URL da Página
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.exemplo.com/pagina-de-vendas"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Nome da Página <span className="text-gray-400 dark:text-slate-500">(opcional — pega o título automaticamente)</span>
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Página de Vendas - Produto X"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-all"
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
            className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-md disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Verificando e clonando...</span>
              </>
            ) : (
              <>
                <span>Clonar Página</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
