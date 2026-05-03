import Link from 'next/link';
import { Plus, Layout, Zap, Users } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';

export default async function DashboardHome() {
  const { count: quizzesCount } = await supabaseAdmin
    .from('quizzes')
    .select('*', { count: 'exact', head: true });

  const { count: pagesCount } = await supabaseAdmin
    .from('cloned_pages')
    .select('*', { count: 'exact', head: true });

  const { count: leadsCount } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Visão Geral</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Bem-vindo ao seu painel de controle do SnapFunnel.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/pages/new" 
            className="flex items-center space-x-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-all shadow-lg active:scale-95"
          >
            <Plus size={18} />
            <span>Nova Página</span>
          </Link>
          <Link 
            href="/dashboard/quizzes/new" 
            className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg active:scale-95"
          >
            <Zap size={18} fill="currentColor" />
            <span>Novo Quiz</span>
          </Link>
        </div>
      </div>

      {/* Cards de métricas premium */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Zap size={24} fill="currentColor" />
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Quizzes Ativos</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">{quizzesCount || 0}</p>
        </div>

        <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Layout size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Páginas Clonadas</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">{pagesCount || 0}</p>
        </div>

        <div className="group bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Users size={24} />
            </div>
          </div>
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Total de Leads</h3>
          <p className="text-4xl font-black text-slate-900 dark:text-white mt-2">{leadsCount || 0}</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white overflow-hidden relative group">
        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2">Pronto para escalar?</h3>
          <p className="text-blue-100 mb-6 max-w-md">Continue criando funis de alta conversão. Seus links de checkout são substituídos automaticamente com o God Mode v6.0.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/dashboard/pages" className="bg-white text-blue-600 px-6 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-colors">
              Gerenciar Páginas
            </Link>
          </div>
        </div>
        <Zap size={200} className="absolute -right-10 -bottom-10 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" fill="currentColor" />
      </div>
    </div>
  );
}
