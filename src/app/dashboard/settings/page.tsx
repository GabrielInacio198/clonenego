'use client';

import { Shield, Lock, Save, AlertCircle } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-gray-500">Gerencie a segurança e acessos do seu clonador.</p>
      </div>

      <div className="grid gap-6">
        {/* Card Segurança */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
            <Shield className="text-blue-600" size={24} />
            <div>
              <h2 className="font-semibold text-gray-900">Segurança do Painel</h2>
              <p className="text-xs text-gray-500">Altere a senha de acesso ao dashboard</p>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <p className="text-sm text-amber-800">
                Para alterar a senha mestre (ADMIN_SECRET), você deve atualizar a variável de ambiente diretamente no painel da <strong>Vercel</strong> e fazer um novo deploy.
              </p>
            </div>

            <div className="pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
              <div className="relative">
                <input 
                  type="password" 
                  disabled 
                  value="••••••••••••" 
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <a 
              href="https://vercel.com" 
              target="_blank" 
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-all"
            >
              Ir para Vercel <Save size={18} />
            </a>
          </div>
        </div>

        {/* Card Status */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Status do Sistema</h3>
              <p className="text-sm text-gray-500">Todas as APIs estão operacionais e conectadas ao Supabase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
