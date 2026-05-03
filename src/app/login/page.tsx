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

  const playClickSound = () => {
    try {
      const AudioContext = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContext();
      
      // Gerador de ruído branco para um "click" mecânico real
      const bufferSize = audioCtx.sampleRate * 0.05;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      noise.start();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  };

  const toggleLamp = () => {
    const newState = !isLampOn;
    setIsLampOn(newState);
    playClickSound();
  };

  const handlePullStart = () => setIsPulling(true);
  const handlePullEnd = () => {
    if (isPulling) {
      toggleLamp();
      setIsPulling(false);
    }
  };

  return (
    <div 
      className="min-h-screen transition-all duration-1000 flex flex-col items-center justify-center p-4 overflow-hidden relative"
      style={{
        background: isLampOn 
          ? 'radial-gradient(circle at 50% 35%, #1e222b 0%, #050608 100%)' 
          : '#050608'
      }}
    >
      
      {/* Lamp Area */}
      <div className="relative mb-8 flex flex-col items-center">
        {/* Lamp Base & Shade */}
        <div className="relative z-20">
          {/* Light Glow - Efeito Encantador */}
          <AnimatePresence>
            {isLampOn && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[400px] bg-gradient-to-b from-yellow-400/10 to-transparent blur-[60px] rounded-full pointer-events-none"
                />
              </>
            )}
          </AnimatePresence>

          <svg width="220" height="260" viewBox="0 0 200 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl overflow-visible">
            {/* Haste central */}
            <rect x="99" y="40" width="2" height="170" fill={isLampOn ? "#475569" : "#0f172a"} />
            
            {/* Base inferior */}
            <rect x="75" y="210" width="50" height="4" rx="2" fill={isLampOn ? "#334155" : "#1e293b"} />
            
            {/* Cúpula da Luminária */}
            <defs>
              <linearGradient id="shadeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isLampOn ? "#ffffff" : "#1e293b"} />
                <stop offset="60%" stopColor={isLampOn ? "#fffbeb" : "#0f172a"} />
                <stop offset="100%" stopColor={isLampOn ? "#fde68a" : "#020617"} />
              </linearGradient>
              <filter id="lampGlow">
                <feGaussianBlur stdDeviation="4" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
            
            <path 
              d="M30 100C30 60 65.8172 40 100 40C134.183 40 170 60 170 100H30Z" 
              fill="url(#shadeGradient)"
              filter={isLampOn ? "url(#lampGlow)" : "none"}
              className="transition-all duration-500"
            />
            
            {/* Bocal interno para a corda (Esconde a conexão) */}
            <rect x="116" y="95" width="8" height="10" rx="1" fill={isLampOn ? "#92400e" : "#020617"} />

            {/* Cordinha Interativa (Física de Alta Precisão) */}
            <motion.g 
              onPointerDown={handlePullStart}
              onPointerUp={handlePullEnd}
              onPointerLeave={() => isPulling && setIsPulling(false)}
              animate={{ 
                rotate: isPulling ? [0, 1, -1, 0] : [0, -0.5, 0.5, -0.2, 0.2, 0],
              }}
              transition={{
                rotate: { 
                  duration: isPulling ? 0.2 : 6, 
                  repeat: isPulling ? 0 : Infinity, 
                  ease: "easeInOut" 
                }
              }}
              style={{ originX: "120px", originY: "95px" }}
              className="cursor-pointer"
            >
              {/* Fio de Nylon/Seda */}
              <motion.line 
                x1="120" 
                y1="95" 
                x2="120" 
                animate={{ 
                  y2: isPulling ? 190 : 155 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 700, 
                  damping: 35 
                }}
                stroke={isLampOn ? "#fbbf24" : "#475569"} 
                strokeWidth="1.5" 
                strokeLinecap="round"
              />
              
              {/* Puxador de Latão/Ouro */}
              <motion.circle 
                cx="120" 
                animate={{ 
                  cy: isPulling ? 195 : 160 
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 700, 
                  damping: 35 
                }}
                r="7" 
                fill={isLampOn ? "#fbbf24" : "#64748b"} 
                className="hover:fill-yellow-400 transition-all shadow-2xl"
                style={{ filter: isLampOn ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' : 'none' }}
              />

              {!isLampOn && (
                <motion.text 
                  x="135" y="165" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.5, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="fill-white/30 text-[9px] font-bold pointer-events-none uppercase tracking-[0.3em]"
                >
                  Clique
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
