import Link from 'next/link';
import { Plus } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';

export default async function DashboardHome() {
  const { count: quizzesCount } = await supabaseAdmin
    .from('quizzes')
    .select('*', { count: 'exact', head: true });

  const { count: leadsCount } = await supabaseAdmin
    .from('leads')
    .select('*', { count: 'exact', head: true });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Visão Geral</h2>
          <p className="text-gray-500 mt-1">Bem-vindo ao seu painel de controle de quizzes clonados.</p>
        </div>
        <Link 
          href="/dashboard/quizzes/new" 
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>Clonar Novo Quiz</span>
        </Link>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Quizzes Ativos</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{quizzesCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Leads Coletados</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{leadsCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-gray-500 text-sm font-medium">Taxa Média de Conversão</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{(quizzesCount && leadsCount) ? Math.round((leadsCount / quizzesCount) * 100) : 0}%</p>
        </div>
      </div>
    </div>
  );
}
