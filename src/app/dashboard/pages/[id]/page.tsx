'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Globe, CreditCard, Code, ExternalLink, Download, CheckCircle, Copy, CheckCheck, MonitorSmartphone } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

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
      
      // Refresh iframe
      const iframe = document.getElementById('preview-iframe') as HTMLIFrameElement;
      if (iframe) {
         // Pequeno truque para forçar o reload do iframe e aplicar as novas tags/links
         const currentSrc = iframe.src;
         iframe.src = 'about:blank';
         setTimeout(() => { iframe.src = currentSrc; }, 50);
      }
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
    <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-gray-50 text-gray-400">
      <Loader2 size={32} className="animate-spin mr-3" />
      <span className="text-lg">Carregando editor de página...</span>
    </div>
  );

  if (error && !page) return (
    <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-red-500 mb-4 text-lg">{error}</p>
        <Link href="/dashboard/pages" className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Voltar para Páginas</Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-gray-50 -mt-6 -mx-8 sm:-mx-6 lg:-mx-8" style={{ width: 'calc(100% + 4rem)' }}>
      
      {/* SIDEBAR ESQUERDA (Configurações) */}
      <div className="w-[450px] bg-white border-r border-gray-200 flex flex-col h-full z-10 shrink-0 shadow-xl">
        
        {/* Header da Sidebar */}
        <div className="p-5 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/dashboard/pages" className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Voltar">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{page?.name}</h1>
            <a
              href={`/api/pages/download?id=${id}`}
              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Baixar ZIP HTML"
            >
              <Download size={20} />
            </a>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200 shadow-inner">
            <Globe size={16} className="text-indigo-500 shrink-0" />
            <code className="text-[12px] text-gray-600 truncate flex-1">{publicUrl}</code>
            <button onClick={handleCopyUrl} className="text-gray-400 hover:text-indigo-600 p-1 transition-colors" title="Copiar URL">
              {copied ? <CheckCheck size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-indigo-600 p-1 transition-colors" title="Abrir em nova aba">
              <ExternalLink size={16} />
            </a>
          </div>
        </div>

        {/* Scrollable Configs */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50">
          
          {/* Domínio Personalizado */}
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-5 shadow-lg border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-indigo-500 rounded-lg shadow-md shadow-indigo-500/40">
                <Globe size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Domínio</h3>
            </div>
            <p className="text-[11px] text-indigo-200/80 mb-4 leading-relaxed">
              Configure o seu domínio no painel da Vercel apontando o CNAME para <code className="bg-black/30 px-1 py-0.5 rounded text-indigo-100">cname.vercel-dns.com</code> e depois digite-o aqui.
            </p>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="ex: paginas.seudominio.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-indigo-100 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-medium"
            />
          </div>

          {/* URL de Checkout */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 rounded-2xl p-5 shadow-lg border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-emerald-500 rounded-lg shadow-md shadow-emerald-500/40">
                <CreditCard size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Checkout Global</h3>
            </div>
            <p className="text-[11px] text-emerald-200/80 mb-4 leading-relaxed">
              O Proxy reverso substituirá <strong>automaticamente</strong> todos os botões de compra da página original por este link.
            </p>
            <input
              type="url"
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
              placeholder="https://pay.kiwify.com.br/..."
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-emerald-100 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-medium"
            />
          </div>

          {/* Scripts / Pixel */}
          <div className="bg-gradient-to-br from-slate-900 to-gray-800 rounded-2xl p-5 shadow-lg border border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-slate-600 rounded-lg shadow-md shadow-slate-900/50">
                <Code size={16} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pixels e Scripts</h3>
            </div>
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">
              Cole códigos do Facebook Pixel, Google Analytics, Utmify ou Dropify.
            </p>

            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-2 uppercase tracking-wide">HEAD Scripts</label>
                <textarea
                  value={headScripts}
                  onChange={(e) => setHeadScripts(e.target.value)}
                  placeholder="<script>...</script> (Facebook Pixel, Analytics)"
                  className="w-full h-24 bg-black/40 border border-gray-600 rounded-xl px-4 py-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono custom-scrollbar"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-300 block mb-2 uppercase tracking-wide">BODY Scripts</label>
                <textarea
                  value={bodyScripts}
                  onChange={(e) => setBodyScripts(e.target.value)}
                  placeholder="<script src='...'></script> (Utmify, Dropify)"
                  className="w-full h-24 bg-black/40 border border-gray-600 rounded-xl px-4 py-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono custom-scrollbar"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Sidebar (Salvar) */}
        <div className="p-5 border-t border-gray-200 bg-white">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20 ${
               saving ? 'bg-indigo-400 cursor-not-allowed' :
               saved ? 'bg-green-500 hover:bg-green-600 shadow-green-500/20' : 
               'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'
            }`}
          >
            {saving ? <Loader2 size={20} className="animate-spin" /> : (saved ? <CheckCircle size={20} /> : <Save size={20} />)}
            <span>{saving ? 'Salvando Configurações...' : (saved ? 'Salvo com sucesso!' : 'Salvar Alterações')}</span>
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL (Preview Iframe) */}
      <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden relative">
        
        {/* Header Preview */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3 text-gray-600">
            <span className="text-[11px] font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md uppercase tracking-wide">Live Preview</span>
            <span className="text-xs text-gray-500">Visualizando a página original com o proxy reverso</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded-md flex flex-col items-center justify-center transition-all ${viewMode === 'desktop' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200/50' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visão Desktop"
            >
              <MonitorSmartphone size={18} />
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`p-1.5 rounded-md flex flex-col items-center justify-center transition-all ${viewMode === 'mobile' ? 'bg-white shadow-sm text-indigo-600 border border-slate-200/50' : 'text-gray-400 hover:text-gray-600'}`}
              title="Visão Mobile"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Workspace do Iframe */}
        <div className="flex-1 overflow-auto bg-[#eef2f6] flex justify-center items-start p-4 md:p-8">
           <div 
             className={`bg-white shadow-2xl rounded-xl overflow-hidden transition-all duration-500 ease-in-out ${viewMode === 'mobile' ? 'w-[375px] h-[812px] shrink-0 border-[8px] border-slate-800 rounded-[2.5rem]' : 'w-full h-full border border-gray-200'}`}
           >
             <iframe
               id="preview-iframe"
               src={publicUrl}
               className="w-full h-full border-none bg-white"
               title="Preview da Página"
               sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
             />
           </div>
        </div>

      </div>

    </div>
  );
}
