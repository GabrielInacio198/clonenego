'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Settings, Code, MonitorSmartphone, Type, X, Link as LinkIcon, Image, Trash2, Globe, Copy, Upload, Palette, Smile } from 'lucide-react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

// Helper: RGB to Hex
function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#000000';
  return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

export default function QuizEditorClient({ initialQuiz }: { initialQuiz: any }) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('mobile');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'advanced'>('visual');
  const [replacements, setReplacements] = useState<Record<string, string>>(initialQuiz.theme_config?.replacements || {});
  const [editingText, setEditingText] = useState<{ original: string, current: string, type: string, cssSelector?: string, currentStyles?: any } | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [styleValues, setStyleValues] = useState({ backgroundColor: '#ffffff', color: '#000000', borderRadius: '0' });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const router = useRouter();

  // Sincronizar mudança de modo com o iframe
  useEffect(() => {
     const win = iframeRef.current?.contentWindow;
     if (win) {
        win.postMessage({ type: 'SET_MODE', isEditMode }, '*');
     }
  }, [isEditMode]);

  // Ativar modo de edição assim que o iframe carregar
  const handleIframeLoad = () => {
    try {
      const win = iframeRef.current?.contentWindow;
      const doc = iframeRef.current?.contentDocument;
      if (win && doc && doc.body) {
        
        // Inicializar variável de controle de modo no iframe
        (win as any).isEditMode = true;

        // Passar os replacements atuais para o iframe
        win.postMessage({ type: 'SYNC_REPLACEMENTS', replacements }, '*');

        // Injetar CSS para destacar elementos
        const style = doc.createElement('style');
        style.id = 'quiz-cloner-styles';
        style.innerHTML = `
          .quiz-editor-hover:hover {
            outline: 2px dashed #3B82F6 !important;
            cursor: pointer !important;
          }
        `;
        doc.head.appendChild(style);

        // Adicionar listener de clique para edição
        doc.body.addEventListener('mouseover', (e: any) => {
           if ((win as any).isEditMode && e.target && e.target.nodeType === 1) e.target.classList.add('quiz-editor-hover');
        });
        doc.body.addEventListener('mouseout', (e: any) => {
           if (e.target && e.target.nodeType === 1) e.target.classList.remove('quiz-editor-hover');
        });

        // Gerar CSS path para um elemento
        const generateCSSPath = (el: any): string => {
          const path: string[] = [];
          let current = el;
          while (current && current !== doc.body && current !== doc.documentElement) {
            let segment = current.tagName.toLowerCase();
            if (current.id) { path.unshift('#' + current.id); break; }
            const parent = current.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter((s: any) => s.tagName === current.tagName);
              if (siblings.length > 1) {
                segment += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
              }
            }
            path.unshift(segment);
            current = current.parentElement;
          }
          return path.join(' > ');
        };

        doc.body.addEventListener('click', (e: any) => {
          if (!(win as any).isEditMode) return;

          e.preventDefault();
          e.stopPropagation();
          
          // Tentar elementos interativos primeiro
          let target = e.target.closest('a, button, img, [role="button"], .btn, .button');
          
          // Fallback: elementos de texto
          if (!target) {
            target = e.target.closest('h1, h2, h3, h4, h5, h6, p, span, li, label, td, th, div, section, header, footer');
          }
          // Último recurso: o próprio elemento clicado
          if (!target) {
            target = e.target;
          }
          if (!target || target === doc.body || target === doc.documentElement) return;

          let originalValue = '';
          let type = 'TEXT';
          const cssSelector = generateCSSPath(target);
          
          // Capturar estilos computados
          const computed = doc.defaultView?.getComputedStyle(target);
          const currentStyles = {
            backgroundColor: computed?.backgroundColor,
            color: computed?.color,
            borderRadius: computed?.borderRadius
          };

          // Se for botão ou link, tratamos como LINK para permitir checkout
          if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.getAttribute('role') === 'button' || target.classList.contains('btn')) {
             originalValue = target.getAttribute('href') || target.textContent?.trim() || 'Botão sem link';
             type = 'LINK';
          } 
          else if (target.tagName === 'IMG') {
             originalValue = target.getAttribute('src') || '';
             type = 'IMAGE';
          } 
          else {
            let textNode = Array.from(target.childNodes).find((n: any) => n.nodeType === 3 && n.nodeValue?.trim() !== '');
            originalValue = textNode ? (textNode as any).nodeValue.trim() : target.textContent.trim();
          }

          if (originalValue) {
             window.parent.postMessage({ 
                type: 'EDIT_ELEMENT', 
                originalValue, 
                elementType: type,
                cssSelector,
                currentStyles
             }, '*');
          }
        }, true);

        // Listener para receber as mudanças de modo de edição
        win.addEventListener('message', (e: MessageEvent) => {
           if (e.data && typeof e.data.isEditMode !== 'undefined') {
              (win as any).isEditMode = e.data.isEditMode;
           }
        });
      }
    } catch (err) {
      console.error('Erro ao acessar o iframe:', err);
    }
  };

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'EDIT_ELEMENT') {
         const sel = e.data.cssSelector || '';
         const styles = e.data.currentStyles || {};
         setEditingText({
            original: e.data.originalValue,
            current: replacements[e.data.originalValue] || e.data.originalValue,
            type: e.data.elementType,
            cssSelector: sel,
            currentStyles: styles
         });
         // Carregar estilos existentes (se já foram editados antes) ou usar os computados
         const existingStyle = sel ? replacements[`__STYLE__::${sel}`] : '';
         if (existingStyle) {
           const parsed: any = { backgroundColor: '#ffffff', color: '#000000', borderRadius: '0' };
           existingStyle.split(';').forEach((s: string) => {
             const [k, v] = s.split(':').map(x => x.trim());
             if (k === 'background-color') parsed.backgroundColor = v;
             if (k === 'color') parsed.color = v;
             if (k === 'border-radius') parsed.borderRadius = parseInt(v) || 0;
           });
           setStyleValues(parsed);
         } else {
           setStyleValues({
             backgroundColor: rgbToHex(styles.backgroundColor || ''),
             color: rgbToHex(styles.color || ''),
             borderRadius: (parseInt(styles.borderRadius) || 0).toString()
           });
         }
         setShowEmojiPicker(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [replacements]);

  const applyTextChange = () => {
     if (!editingText) return;
     const newReplacements = { ...replacements, [editingText.original]: editingText.current };
     
     // Se o texto estiver vazio, remove a substituição
     if (!editingText.current || editingText.current.trim() === '') {
         delete newReplacements[editingText.original];
     }

     // Salvar estilos se existirem alterações
     if (editingText.cssSelector) {
       const cssString = `background-color:${styleValues.backgroundColor};color:${styleValues.color};border-radius:${styleValues.borderRadius}px`;
       newReplacements[`__STYLE__::${editingText.cssSelector}`] = cssString;
     }

     setReplacements(newReplacements);
     setEditingText(null);
     setShowEmojiPicker(false);
     
     // Sincronizar com o iframe
     const win = iframeRef.current?.contentWindow;
     if (win) {
       win.postMessage({ type: 'SYNC_REPLACEMENTS', replacements: newReplacements }, '*');
     }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingText) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('quizId', initialQuiz.id);
      const res = await fetch('/api/quiz/upload-image', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingText({ ...editingText, current: data.url });
    } catch (err: any) {
      alert('Erro no upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const [customDomain, setCustomDomain] = useState<string>(initialQuiz.theme_config?.custom_domain || '');
  const [headScripts, setHeadScripts] = useState<string>(initialQuiz.theme_config?.head_scripts || '');
  const [bodyScripts, setBodyScripts] = useState<string>(initialQuiz.theme_config?.body_scripts || '');
  const [quizName, setQuizName] = useState(initialQuiz.name);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/quiz/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: initialQuiz.id,
          name: quizName,
          theme_config: {
            ...initialQuiz.theme_config,
            replacements,
            custom_domain: customDomain.trim() || undefined,
            head_scripts: headScripts,
            body_scripts: bodyScripts
          }
        })
      });

      if (!res.ok) throw new Error('Falha ao salvar');
      alert('Alterações salvas com sucesso! ✅');
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar de Ferramentas */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-gray-200">
          <input 
            type="text"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            className="text-xl font-bold text-gray-900 w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 -ml-1"
            placeholder="Nome do Quiz"
          />
          <p className="text-sm text-gray-500 mt-1 truncate">
            {initialQuiz.original_url}
          </p>
        </div>

        <div className="flex border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('visual')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'visual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <MonitorSmartphone size={16} /> Textos & Links
          </button>
          <button 
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'advanced' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Code size={16} /> Scripts
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {activeTab === 'visual' && (
            <div className="space-y-4">

              {/* Domínio Próprio e Link Final */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm mb-4">
                <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Globe size={16} /> Seu Domínio Personalizado
                </h3>
                <p className="text-xs text-blue-700 mb-3">
                  Qual domínio você apontou para a Vercel? Ex: <b>secajejum.com.br</b>
                </p>
                <div className="flex flex-col gap-2">
                  <input 
                    type="text"
                    placeholder="ex: seudominio.com.br"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value.trim().replace(/^https?:\/\//, ''))}
                    className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg text-sm bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                  
                  {/* Copy Link Button */}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      const base = customDomain ? `https://${customDomain}` : window.location.origin;
                      const link = `${base}/q/${initialQuiz.id}`;
                      navigator.clipboard.writeText(link);
                      const btn = e.currentTarget;
                      const originalText = btn.innerHTML;
                      btn.innerHTML = '✅ Link Copiado!';
                      btn.classList.add('bg-green-100', 'text-green-700', 'border-green-300');
                      setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.classList.remove('bg-green-100', 'text-green-700', 'border-green-300');
                      }, 2000);
                    }}
                    className="mt-1 flex items-center justify-center gap-2 w-full py-2 bg-white border border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 text-sm font-semibold rounded-lg transition-colors"
                  >
                    <Copy size={14} /> Copiar Link do Funil
                  </button>
                </div>
              </div>

              {/* Checkout Global Quick Access */}
              <div className="bg-slate-900 rounded-2xl p-4 shadow-xl border border-white/10 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-blue-500 rounded-lg">
                    <LinkIcon size={14} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Link de Checkout Global</h3>
                </div>
                <input 
                   type="text"
                   placeholder="🔗 Cole seu link Kirvano/PerfectPay..."
                   className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-blue-200 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                   value={replacements['__CHECKOUT_URL__'] || ''}
                   onChange={(e) => setReplacements({ ...replacements, '__CHECKOUT_URL__': e.target.value })}
                />
                <p className="text-[10px] text-slate-400 mt-2">
                  * Usado quando não há checkout individual por plano.
                </p>
              </div>

              {/* Multi-Checkout por Plano */}
              <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-2xl p-4 shadow-xl border border-emerald-500/20 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-emerald-500 rounded-lg">
                    <LinkIcon size={14} className="text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Checkouts por Plano</h3>
                </div>
                <p className="text-[10px] text-emerald-300/70 mb-3">Se o funil tem vários planos com preços diferentes, cole cada link abaixo:</p>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-emerald-300 font-bold block mb-1">💰 PLANO 1 (ex: 1 Mês)</label>
                    <input 
                      type="text"
                      placeholder="Link do checkout do Plano 1..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-emerald-200 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                      value={replacements['__CHECKOUT_PLAN_1__'] || ''}
                      onChange={(e) => setReplacements({ ...replacements, '__CHECKOUT_PLAN_1__': e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-300 font-bold block mb-1">💎 PLANO 2 (ex: 3 Meses)</label>
                    <input 
                      type="text"
                      placeholder="Link do checkout do Plano 2..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-emerald-200 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                      value={replacements['__CHECKOUT_PLAN_2__'] || ''}
                      onChange={(e) => setReplacements({ ...replacements, '__CHECKOUT_PLAN_2__': e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-emerald-300 font-bold block mb-1">🏆 PLANO 3 (ex: Anual)</label>
                    <input 
                      type="text"
                      placeholder="Link do checkout do Plano 3..."
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs text-emerald-200 placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
                      value={replacements['__CHECKOUT_PLAN_3__'] || ''}
                      onChange={(e) => setReplacements({ ...replacements, '__CHECKOUT_PLAN_3__': e.target.value })}
                    />
                  </div>
                </div>
              </div>
              
              {/* Toggle de Modo */}
              <div className="flex bg-gray-200 rounded-lg p-1">
                 <button 
                   onClick={() => setIsEditMode(false)}
                   className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${!isEditMode ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Navegar (Funil)
                 </button>
                 <button 
                   onClick={() => setIsEditMode(true)}
                   className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${isEditMode ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                   Editar (God Mode)
                 </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                   {isEditMode ? 'Modo de Edição Ativo' : 'Modo de Navegação Ativo'}
                </h3>
                <ul className="text-sm text-blue-800 space-y-2 list-disc pl-4">
                  {isEditMode ? (
                     <>
                        <li><strong>Clique em qualquer texto</strong> no celular para editá-lo.</li>
                        <li>Navegação desativada temporariamente para você poder clicar nos botões sem mudar de página.</li>
                     </>
                  ) : (
                     <>
                        <li><strong>O funil está livre.</strong> Clique nos botões do celular para ir para a próxima página do quiz.</li>
                        <li>Volte para o modo de edição quando chegar na página que deseja alterar.</li>
                     </>
                  )}
                </ul>
              </div>

              {editingText ? (
                <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4 overflow-visible relative z-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {editingText.type === 'LINK' ? (
                        <><LinkIcon size={16} className="text-green-500"/> Link Detectado</>
                      ) : editingText.type === 'IMAGE' ? (
                        <><Image size={16} className="text-purple-500"/> Imagem Detectada</>
                      ) : (
                        <><Type size={16} className="text-blue-500"/> Editando Texto</>
                      )}
                    </h3>
                    <button onClick={() => { setEditingText(null); setShowEmojiPicker(false); }} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  
                  {/* Visual Preview / Original Value */}
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Valor Original:
                    </label>
                    {editingText.type === 'IMAGE' ? (
                      <div className="relative h-24 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                        <img src={editingText.original} alt="Original" className="h-full w-full object-contain" />
                      </div>
                    ) : (
                      <div className="p-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-600 break-words line-clamp-2 italic">
                        {editingText.original}
                      </div>
                    )}
                  </div>

                  {/* Editing Controls */}
                  <div className="space-y-4">
                    {/* Image Upload / URL */}
                    {editingText.type === 'IMAGE' && (
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                          🖼️ Alterar Imagem
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                           <button 
                             onClick={() => document.getElementById('image-upload')?.click()}
                             disabled={isUploading}
                             className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-purple-600 gap-1"
                           >
                             <Upload size={20} />
                             <span className="text-[10px] font-bold">{isUploading ? 'Enviando...' : 'Fazer Upload'}</span>
                           </button>
                           <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                           
                           <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center">
                              <span className="text-[10px] text-gray-400 uppercase">Dica:</span>
                              <span className="text-[9px] text-gray-500 leading-tight">Envie imagens leves (WebP/PNG)</span>
                           </div>
                        </div>
                        <input 
                          type="text"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs"
                          placeholder="Ou cole uma URL externa aqui..."
                          value={editingText.current}
                          onChange={(e) => setEditingText({...editingText, current: e.target.value})}
                        />
                      </div>
                    )}

                    {/* Text Editing + Emoji Picker */}
                    {editingText.type !== 'IMAGE' && (
                      <div className="space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                            {editingText.type === 'LINK' ? '🔗 Link / Checkout' : '✍️ Editar Texto'}
                          </label>
                          <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="p-1.5 text-gray-500 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-all"
                            title="Inserir Emoji"
                          >
                            <Smile size={18} />
                          </button>
                        </div>
                        
                        <textarea 
                          autoFocus
                          className="w-full px-4 py-3 bg-white border-2 border-blue-100 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-base text-black font-medium shadow-inner"
                          rows={editingText.type === 'TEXT' ? 4 : 2}
                          value={editingText.current}
                          onChange={(e) => setEditingText({...editingText, current: e.target.value})}
                          placeholder={editingText.type === 'LINK' ? 'https://pay.kirvano.com/...' : 'Escreva aqui...'}
                        />

                        {showEmojiPicker && (
                          <div className="absolute bottom-full left-0 mb-2 z-[60] shadow-2xl rounded-2xl overflow-hidden">
                            <EmojiPicker 
                              onEmojiClick={(emojiData) => {
                                setEditingText({ ...editingText, current: editingText.current + emojiData.emoji });
                                setShowEmojiPicker(false);
                              }}
                              width={280}
                              height={350}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Style Editor (Colors & Border Radius) */}
                    {editingText.cssSelector && (
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                          <Palette size={14} className="text-pink-500" /> Estilo do Elemento
                        </label>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">FUNDO:</span>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                              <input 
                                type="color" 
                                value={styleValues.backgroundColor}
                                onChange={(e) => setStyleValues({...styleValues, backgroundColor: e.target.value})}
                                className="h-6 w-10 rounded cursor-pointer"
                              />
                              <span className="text-[10px] font-mono uppercase">{styleValues.backgroundColor}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-1">TEXTO:</span>
                            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                              <input 
                                type="color" 
                                value={styleValues.color}
                                onChange={(e) => setStyleValues({...styleValues, color: e.target.value})}
                                className="h-6 w-10 rounded cursor-pointer"
                              />
                              <span className="text-[10px] font-mono uppercase">{styleValues.color}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] text-gray-400 uppercase">ARREDONDAMENTO:</span>
                            <span className="text-[10px] font-bold text-blue-600">{styleValues.borderRadius}px</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            value={styleValues.borderRadius}
                            onChange={(e) => setStyleValues({...styleValues, borderRadius: e.target.value})}
                            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={applyTextChange}
                    className="w-full mt-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-base transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    Salvar Alterações
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Textos Editados ({Object.keys(replacements).length})</h3>
                  {Object.keys(replacements).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum texto editado ainda. Clique no celular ao lado para começar.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(replacements).map(([orig, curr], i) => {
                        if (orig === '__CHECKOUT_URL__') return null;
                        return (
                          <div key={i} className="group relative">
                            <div 
                              className="p-3 bg-white border border-gray-200 rounded-lg text-xs flex justify-between items-start cursor-pointer hover:border-blue-300" 
                              onClick={() => setEditingText({original: orig, current: curr, type: orig.startsWith('http') ? 'LINK' : 'TEXT'})}
                            >
                              <div className="flex-1 pr-6 truncate">
                                <span className="font-semibold text-gray-700 block truncate">{curr}</span>
                                <span className="text-gray-400 block truncate">Orig: {orig}</span>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newRepls = { ...replacements };
                                delete newRepls[orig];
                                setReplacements(newRepls);
                                // Corrigir tipagem TS
                                if (editingText && (editingText as any).original === orig) {
                                  setEditingText(null);
                                }
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              title="Remover esta alteração"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                 <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <MonitorSmartphone size={16} className="text-blue-500" /> 
                    Link de Checkout (Redirecionamento Final)
                 </h3>
                 <p className="text-xs text-gray-500 mb-3">
                    Cole abaixo o seu link de checkout (Kirvano, PerfectPay, etc). O God Mode vai interceptar o botão final do quiz e forçar o redirecionamento para este link.
                 </p>
                 <input 
                    type="url"
                    placeholder="https://pay.kirvano.com/..."
                    value={replacements['__CHECKOUT_URL__'] || ''}
                    onChange={(e) => {
                       const val = e.target.value.trim();
                       const newReps = { ...replacements };
                       if (val) newReps['__CHECKOUT_URL__'] = val;
                       else delete newReps['__CHECKOUT_URL__'];
                       setReplacements(newReps);
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                 />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scripts do Head (Cabeçalho)
                </label>
                <textarea 
                  className="w-full rounded-lg border-gray-300 border-2 p-3 text-sm h-32 bg-gray-50 text-gray-900 placeholder-gray-500 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all"
                  placeholder="<script>... Código do Pixel ou Utmify ...</script>"
                  value={headScripts}
                  onChange={(e) => setHeadScripts(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1 mb-4">
                  Injetado diretamente dentro da tag &lt;head&gt;. Ideal para Utmify, Facebook Pixel, etc.
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scripts do Body (Rodapé)
                </label>
                <textarea 
                  className="w-full rounded-lg border-gray-300 border-2 p-3 text-sm h-32 bg-gray-50 text-gray-900 placeholder-gray-500 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all"
                  placeholder="<script>... Scripts que carregam no final ...</script>"
                  value={bodyScripts}
                  onChange={(e) => setBodyScripts(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Injetado no final da tag &lt;body&gt;.
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  🌐 Domínio Personalizado
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Após hospedar na Vercel, adicione o seu domínio lá e cole-o aqui (sem https://). 
                  A URL pública exibida na lista de quizzes será atualizada automaticamente.
                </p>
                <input 
                  type="text"
                  placeholder="Ex: quiz.seudominio.com.br"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-500 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono transition-all"
                />
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <strong>Como configurar:</strong>
                  <ol className="list-decimal pl-4 mt-1 space-y-1">
                    <li>Publique este projeto no <strong>Vercel</strong> (gratuito)</li>
                    <li>No painel da Vercel → Settings → Domains → adicione seu domínio</li>
                    <li>No seu provedor de domínio (ex: NameSilo), adicione um <strong>CNAME</strong> apontando para <code>cname.vercel-dns.com</code></li>
                    <li>Cole o domínio aqui e clique em <strong>Salvar</strong></li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center justify-center space-x-2"
          >
            <Save size={20} />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>

      {/* Área Central (Mockup de Preview/Edição) */}
      <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
        
        {/* Barra de Controle de Visualização */}
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2 text-gray-600">
            <Settings size={18} className="animate-spin-slow text-blue-500" />
            <span className="text-xs font-medium">Modo God Mode Ativado. Edite em tempo real.</span>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('mobile')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <MonitorSmartphone size={14} /> CELULAR
            </button>
            <button 
              onClick={() => setViewMode('desktop')}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Globe size={14} /> DESKTOP
            </button>
          </div>

          <div className="w-40"></div> {/* Spacer to center the toggle */}
        </div>

        {/* Mockup / Preview Container */}
        <div className="flex-1 overflow-auto p-8 flex justify-center items-start">
          <div 
            className={`bg-white shadow-2xl transition-all duration-300 ease-in-out relative origin-top ${
              viewMode === 'mobile' 
                ? 'w-[375px] h-[812px] rounded-[3rem] border-[12px] border-gray-900 overflow-hidden mt-4 mb-12 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]' 
                : 'w-full max-w-5xl h-full rounded-xl border border-gray-200'
            }`}
          >
            {/* Notch do Celular (Apenas em mobile) */}
            {viewMode === 'mobile' && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-gray-900 rounded-b-3xl z-50"></div>
            )}

            <iframe
              ref={iframeRef}
              src={`/q/${initialQuiz.id}`}
              className="w-full h-full border-none"
              onLoad={handleIframeLoad}
              title="Quiz Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
