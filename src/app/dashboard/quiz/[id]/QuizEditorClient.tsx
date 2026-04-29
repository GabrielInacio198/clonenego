'use client';

import { useState, useRef, useEffect } from 'react';
import { Save, Settings, Code, MonitorSmartphone, Type, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuizEditorClient({ initialQuiz }: { initialQuiz: any }) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'visual' | 'advanced'>('visual');
  const [replacements, setReplacements] = useState<Record<string, string>>(initialQuiz.theme_config?.replacements || {});
  const [editingText, setEditingText] = useState<{original: string, current: string} | null>(null);
  const [isEditMode, setIsEditMode] = useState(true);
  
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

        doc.body.addEventListener('click', (e: any) => {
          if (!(win as any).isEditMode) return; // Se for navegação, deixa o React lidar normal!

          e.preventDefault();
          e.stopPropagation();
          
          let target = e.target;
          let originalText = '';
          
          if (target.tagName === 'IMG') {
             originalText = target.getAttribute('src');
             if (originalText) window.parent.postMessage({ type: 'EDIT_TEXT', originalText, isImage: true }, '*');
             return;
          }

          // Pegar o textNode direto
          let textNode = Array.from(target.childNodes).find((n: any) => n.nodeType === 3 && n.nodeValue.trim() !== '');
          if (textNode) {
             originalText = (textNode as any).nodeValue.trim();
          } else if (target.textContent) {
             originalText = target.textContent.trim();
          }

          if (originalText) {
             window.parent.postMessage({ type: 'EDIT_TEXT', originalText, isImage: false }, '*');
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
      if (e.data?.type === 'EDIT_TEXT') {
         setEditingText({
            original: e.data.originalText,
            current: replacements[e.data.originalText] || e.data.originalText
         });
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

     setReplacements(newReplacements);
     setEditingText(null);
     
     // Sincronizar com o iframe
     const win = iframeRef.current?.contentWindow;
     if (win) {
       win.postMessage({ type: 'SYNC_REPLACEMENTS', replacements: newReplacements }, '*');
     }
  };

  const [customDomain, setCustomDomain] = useState<string>(initialQuiz.theme_config?.custom_domain || '');
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
            custom_domain: customDomain.trim() || undefined
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
                <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-top-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Type size={16} className="text-blue-500"/> Editando Texto
                    </h3>
                    <button onClick={() => setEditingText(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Texto Original (Alvo)</label>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100 text-sm text-gray-600 break-words line-clamp-3">
                      {editingText.original}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Novo Texto</label>
                    <textarea 
                      autoFocus
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                      rows={4}
                      value={editingText.current}
                      onChange={(e) => setEditingText({...editingText, current: e.target.value})}
                    />
                  </div>

                  <button 
                    onClick={applyTextChange}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                  >
                    Aplicar Troca
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 text-sm">Textos Editados ({Object.keys(replacements).length})</h3>
                  {Object.keys(replacements).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">Nenhum texto editado ainda. Clique no celular ao lado para começar.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(replacements).map(([orig, curr], i) => (
                        <div key={i} className="p-3 bg-white border border-gray-200 rounded-lg text-xs flex justify-between items-start cursor-pointer hover:border-blue-300" onClick={() => setEditingText({original: orig, current: curr})}>
                          <div className="flex-1 pr-2 truncate">
                            <span className="font-semibold text-gray-700 block truncate">{curr}</span>
                            <span className="text-gray-400 block truncate">Orig: {orig}</span>
                          </div>
                        </div>
                      ))}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                 />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pixel do Facebook / Scripts
                </label>
                <textarea 
                  className="w-full rounded-lg border-gray-300 border p-3 text-sm h-32"
                  placeholder="Cole seu script do pixel aqui..."
                  value={replacements['__PIXEL_SCRIPT__'] || ''}
                  onChange={(e) => {
                       const val = e.target.value;
                       const newReps = { ...replacements };
                       if (val) newReps['__PIXEL_SCRIPT__'] = val;
                       else delete newReps['__PIXEL_SCRIPT__'];
                       setReplacements(newReps);
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este script será injetado invisivelmente no cabeçalho do quiz.
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 p-8 overflow-y-auto">
        
        {/* Aviso */}
        <div className="mb-6 flex items-center gap-2 text-gray-600 bg-white px-4 py-2 rounded-full shadow-sm">
          <Settings size={18} className="animate-spin-slow text-blue-500" />
          <span className="text-sm font-medium">Modo God Mode ativado. A lógica original do quiz está 100% preservada.</span>
        </div>

        {/* Mockup do Celular */}
        <div className="relative w-[375px] h-[812px] bg-white rounded-[3rem] shadow-2xl overflow-hidden border-[8px] border-slate-900 shrink-0">
          
          {/* Notch do Celular */}
          <div className="absolute top-0 inset-x-0 h-6 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20"></div>

          {/* Iframe que carrega o HTML clonado */}
          <iframe 
            ref={iframeRef}
            src={`/q/${initialQuiz.id}`}
            className="w-full h-full border-0 absolute inset-0 z-10"
            onLoad={handleIframeLoad}
            title="Quiz Player Preview"
          />
        </div>

      </div>
    </div>
  );
}
