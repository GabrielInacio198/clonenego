'use client';

import { useState, useEffect } from 'react';
import { Save, Globe, Shield, Settings, Loader2, Users, Trash2, Plus, Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(true);
  
  // Form para novo admin
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  const router = useRouter();

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/auth/admins');
      const data = await res.json();
      if (Array.isArray(data)) setAdmins(data);
    } catch (err) {
      console.error('Erro ao buscar admins:', err);
    } finally {
      setIsLoadingAdmins(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingAdmin(true);
    setAdminError('');

    try {
      const res = await fetch('/api/auth/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewEmail('');
        setNewPassword('');
        fetchAdmins();
      } else {
        setAdminError(data.error || 'Erro ao adicionar administrador');
      }
    } catch (err) {
      setAdminError('Erro de conexão');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este administrador?')) return;

    try {
      const res = await fetch(`/api/auth/admins?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchAdmins();
      }
    } catch (err) {
      alert('Erro ao excluir administrador');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configurações do Sistema</h1>
      </div>

      <div className="grid gap-8">
        {/* Segurança do Painel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Segurança do Painel</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Altere a senha de acesso ao dashboard</p>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 flex gap-3 text-amber-800 dark:text-amber-300">
              <Settings className="shrink-0" size={20} />
              <p className="text-sm">
                Para alterar a senha mestre (<strong>ADMIN_SECRET</strong>), você deve atualizar a variável de ambiente diretamente no painel da <strong>Vercel</strong> e fazer um novo deploy.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Senha Atual</label>
              <input 
                type="password" 
                disabled 
                value="••••••••••••"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-400 dark:text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="p-6 bg-gray-50 dark:bg-slate-900/50 flex justify-end">
            <a 
              href="https://vercel.com" 
              target="_blank"
              className="px-6 py-2.5 bg-slate-900 dark:bg-slate-600 text-white font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 transition-all flex items-center gap-2"
            >
              Ir para Vercel <Save size={18} />
            </a>
          </div>
        </div>

        {/* Gerenciamento de Administradores */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-sm transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Gerenciar Administradores</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Adicione ou remova e-mails autorizados com senhas próprias</p>
            </div>
          </div>

          <div className="p-6">
            {/* Form para novo admin */}
            <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500" size={16} />
                <input 
                  type="email" 
                  placeholder="Novo e-mail"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm font-medium"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-500" size={16} />
                <input 
                  type="password" 
                  placeholder="Senha individual"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-500 focus:ring-2 focus:ring-purple-500 outline-none shadow-sm font-medium"
                />
              </div>
              <button 
                type="submit"
                disabled={isAddingAdmin}
                className="bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {isAddingAdmin ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Adicionar Admin
              </button>
              {adminError && <p className="col-span-full text-xs text-red-500 dark:text-red-400 mt-1">{adminError}</p>}
            </form>

            {/* Lista de admins */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-4">E-mail Autorizado</th>
                    <th className="pb-4">Criado em</th>
                    <th className="pb-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {isLoadingAdmins ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                        <Loader2 className="animate-spin inline mr-2" size={16} /> Carregando administradores...
                      </td>
                    </tr>
                  ) : admins.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400 dark:text-slate-500 text-sm">Nenhum administrador cadastrado.</td>
                    </tr>
                  ) : (
                    admins.map((admin) => (
                      <tr key={admin.id} className="text-sm">
                        <td className="py-4 font-medium text-gray-900 dark:text-white">{admin.email}</td>
                        <td className="py-4 text-gray-500 dark:text-slate-400">{new Date(admin.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => handleDeleteAdmin(admin.id)}
                            className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Remover"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Status do Sistema */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm flex items-center justify-between transition-colors">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                <Globe size={24} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">Status do Sistema</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">Todas as APIs estão operacionais e conectadas ao Supabase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
