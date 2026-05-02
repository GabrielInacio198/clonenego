'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Globe, CreditCard, Code, ExternalLink, Download, CheckCircle, Copy, CheckCheck } from 'lucide-react';
import Link from 'next/link';

interface PageConfig {
  checkout_url?: string;
  pixel_script?: string;
  head_scripts?: string;
  body_scripts?: string;
  custom_domain?: string;
}

interface ClonedPage {
  id: string;
  name: string;
  original_url: string;
  html_content: string;
  config: PageConfig;
  created_at: string;
}

export default function PageConfigEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [page, setPage] = useState<ClonedPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Config fields
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [pixelScript, setPixelScript] = useState('');
  const [headScripts, setHeadScripts] = useState('');
  const [bodyScripts, setBodyScripts] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  useEffect(() => {
    fetchPage();
  }, [id]);

  const fetchPage = async () => {
    try {
      // Buscar via list e filtrar (API simples)
      const res = await fetch('/api/pages/list');
      const data = await res.json();
      const found = data.pages?.find((p: any) => p.id === id);
      if (!found) throw new Error('Página não encontrada');
      
      setPage(found);
      const config = found.config || {};
      setCheckoutUrl(config.checkout_url || '');
      setPixelScript(config.pixel_script || '');
      setHeadScripts(config.head_scripts || '');
      setBodyScripts(config.body_scripts || '');
      setCustomDomain(config.custom_domain || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const config: PageConfig = {
        checkout_url: checkoutUrl.trim() || undefined,
        pixel_script: pixelScript.trim() || undefined,
        head_scripts: headScripts.trim() || undefined,
        body_scripts: bodyScripts.trim() || undefined,
        custom_domain: customDomain.trim() || undefined,
      };

      const res = await fetch('/api/pages/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: id, config }),
      });

      if (!res.ok) throw new Error('Erro ao salvar');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = page?.config?.custom_domain
    ? `https://${page.config.custom_domain}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
      <Loader2 size={32} className="animate-spin mr-3" />
      <span className="text-lg">Carregando configurações...</span>
    </div>
  );

  if (error && !page) return (
    <div className="text-center py-20">
      <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
      <Link href="/dashboard/pages" className="text-purple-600 dark:text-purple-400 hover:underline">← Voltar para Páginas</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/pages" className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{page?.name}</h1>
            <p className="text-sm text-gray-400 dark:text-slate-500 truncate max-w-lg">Original: {page?.original_url}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/api/pages/download?id=${id}`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors"
          >
            <Download size={16} />
            Baixar ZIP
          </a>
          <a
            href={publicUrl}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            <ExternalLink size={16} />
            Visualizar
          </a>
        </div>
      </div>

      {/* URL Pública */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-3 transition-colors">
        <Globe size={18} className="text-purple-500 shrink-0" />
        <code className="flex-1 text-sm text-gray-700 dark:text-slate-300 truncate">{publicUrl}</code>
        <button onClick={handleCopyUrl} className="p-2 text-gray-400 dark:text-slate-500 hover:text-purple-500 rounded-lg transition-colors">
          {copied ? <CheckCheck size={18} className="text-green-500" /> : <Copy size={18} />}
        </button>
      </div>

      {/* Configurações */}
      <div className="grid gap-6">
        {/* Domínio Personalizado */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Globe size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Domínio Personalizado</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Configure o CNAME do domínio para apontar ao seu deploy Vercel</p>
            </div>
          </div>
          <div className="p-6">
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="www.meusite.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* URL de Checkout */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">URL de Checkout</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Todos os botões/links de compra serão redirecionados para esta URL</p>
            </div>
          </div>
          <div className="p-6">
            <input
              type="url"
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
              placeholder="https://pay.kiwify.com.br/seu-produto"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 outline-none"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">UTMs serão preservadas automaticamente na URL de checkout.</p>
          </div>
        </div>

        {/* Pixel / Scripts */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Code size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Scripts e Pixel</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Adicione Facebook Pixel, Google Analytics, Utmify, etc.</p>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Pixel / Head Scripts</label>
              <textarea
                value={pixelScript}
                onChange={(e) => setPixelScript(e.target.value)}
                placeholder="<!-- Cole seu pixel do Facebook, Google Analytics, etc. -->"
                rows={4}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Scripts do &lt;head&gt;</label>
              <textarea
                value={headScripts}
                onChange={(e) => setHeadScripts(e.target.value)}
                placeholder="<script>...</script> ou <link>..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Scripts do &lt;body&gt; (antes de fechar)</label>
              <textarea
                value={bodyScripts}
                onChange={(e) => setBodyScripts(e.target.value)}
                placeholder="<script src='https://utmify.com.br/...'></script>"
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Barra de ações */}
      <div className="sticky bottom-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center justify-between shadow-lg transition-colors">
        {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
        {saved && (
          <p className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
            <CheckCircle size={16} /> Configurações salvas com sucesso!
          </p>
        )}
        {!error && !saved && <div />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
