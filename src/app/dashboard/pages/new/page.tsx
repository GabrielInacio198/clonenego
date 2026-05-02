'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, ArrowRight, CheckCircle, AlertTriangle, Download, Globe } from 'lucide-react';

export default function NewPageClone() {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  const router = useRouter();

  const handleClone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError('');
    setProgress('Iniciando clonagem... Isso pode levar alguns segundos.');

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

      setProgress(`✅ Sucesso! ${data.stats?.assetsDownloaded || 0} assets baixados.`);
      
      // Redirecionar para configuração
      setTimeout(() => {
        router.push(`/dashboard/pages/${data.page.id}`);
      }, 1500);

    } catch (err: any) {
      setError(err.message);
      setProgress('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
        <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400 mb-6">
          <FileText size={28} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clonar Página Completa</h2>
        </div>
        
        <p className="text-gray-600 dark:text-slate-300 mb-4">
          Cole a URL de qualquer página que deseja clonar. O motor irá baixar o <strong>HTML completo</strong> com 
          todos os assets (CSS, JavaScript, imagens, fontes) para que funcione 100% offline ou em seu próprio domínio.
        </p>

        {/* Features badges */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Download size={12} /> Baixar como ZIP
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <Globe size={12} /> Hospedar no domínio
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800">
            <CheckCircle size={12} /> Editar checkout & pixel
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
              Nome da Página <span className="text-gray-400 dark:text-slate-500">(opcional)</span>
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

          {/* Aviso */}
          <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl text-amber-800 dark:text-amber-300 text-sm">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              Páginas muito complexas (SPAs com React/Angular) podem não clonar 100% do conteúdo dinâmico. 
              Páginas estáticas e WordPress funcionam perfeitamente.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm border border-transparent dark:border-red-800">
              {error}
            </div>
          )}

          {progress && !error && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-lg text-sm border border-transparent dark:border-blue-800 flex items-center gap-2">
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {progress}
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
                <span>Clonando página e baixando assets...</span>
              </>
            ) : (
              <>
                <span>Iniciar Clonagem Completa</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
