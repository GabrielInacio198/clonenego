'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLampOn, setIsLampOn] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(from);
        router.refresh();
      } else {
        setError(data.error || 'Acesso negado. Verifique suas credenciais.');
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLamp = () => {
    setIsPulling(true);
    setTimeout(() => {
      setIsLampOn(!isLampOn);
      setIsPulling(false);
    }, 150);
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 flex flex-col items-center justify-center p-4 overflow-hidden ${isLampOn ? 'bg-[#1c1f24]' : 'bg-[#0f1115]'}`}>
      
      {/* Lamp Area */}
      <div className="relative mb-8 flex flex-col items-center">
        {/* Lamp Base & Shade */}
        <div className="relative z-20">
          {/* Light Glow */}
          <AnimatePresence>
            {isLampOn && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-400/20 blur-[80px] rounded-full pointer-events-none"
              />
            )}
          </AnimatePresence>

          <svg width="180" height="220" viewBox="0 0 180 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
            {/* Base */}
            <rect x="60" y="190" width="60" height="8" rx="4" fill={isLampOn ? "#e2e8f0" : "#334155"} />
            <rect x="86" y="100" width="8" height="90" fill={isLampOn ? "#cbd5e1" : "#1e293b"} />
            
            {/* Shade */}
            <path d="M20 100C20 60 55.8172 40 90 40C124.183 40 160 60 160 100H20Z" fill={isLampOn ? "#f8fafc" : "#0f172a"} />
            
            {/* Cordinha Interativa (Física e Balanço) */}
            <motion.g 
              drag="y"
              dragConstraints={{ top: 0, bottom: 40 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > 20) {
                  toggleLamp();
                }
              }}
              animate={{ 
                rotate: [0, -2, 0, 2, 0],
                x: [0, -1, 0, 1, 0]
              }}
              transition={{
                rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                x: { duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
              style={{ originX: "105px", originY: "100px" }}
              className="cursor-grab active:cursor-grabbing group"
            >
              <line x1="105" y1="100" x2="105" y2="150" stroke={isLampOn ? "#94a3b8" : "#475569"} strokeWidth="2" />
              <circle cx="105" cy="155" r="7" fill={isLampOn ? "#f59e0b" : "#475569"} className="group-hover:fill-yellow-500 transition-colors shadow-xl" />
              
              {/* Tooltip discreto */}
              {!isLampOn && (
                <motion.text 
                  x="120" y="160" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="fill-white/20 text-[10px] font-bold pointer-events-none"
                >
                  PUXE
                </motion.text>
              )}
            </motion.g>
          </svg>
        </div>

        <motion.h1 
          animate={{ opacity: isLampOn ? 1 : 0.3 }}
          className="text-white text-3xl font-light tracking-[0.2em] mt-4 uppercase"
        >
          SnapFunnel
        </motion.h1>
      </div>

      {/* Login Form Container */}
      <div className="relative w-full max-w-md h-[450px]">
        <AnimatePresence>
          {isLampOn && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 120 }}
              className="absolute inset-0"
            >
              <div className="bg-[#2a2e35]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-3 mb-8">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                      <ShieldCheck className="text-blue-400" size={24} />
                    </div>
                    <h2 className="text-xl font-medium text-white/90">Bem-vindo de volta</h2>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1">Usuário</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/40 uppercase tracking-widest px-1">Senha</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                          type={showPwd ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                        >
                          {showPwd ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    
                    {error && (
                      <motion.p 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-red-400 text-sm px-1"
                      >
                        {error}
                      </motion.p>
                    )}
                  </form>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading || !password || !email}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 hover:from-yellow-300 hover:to-yellow-400 text-slate-900 font-bold rounded-2xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 mt-4"
                >
                  {loading ? (
                    <><Loader2 size={20} className="animate-spin" /> Verificando...</>
                  ) : (
                    <span>Acessar Painel</span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placeholder when lamp is off */}
        <AnimatePresence>
          {!isLampOn && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <p className="text-white/10 text-sm uppercase tracking-[0.4em] animate-pulse">Puxe para iniciar</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-8 text-white/10 text-[10px] uppercase tracking-[0.5em] pointer-events-none">
        SnapFunnel © 2026 • Secure Access Layer
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f1115] flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={48} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
