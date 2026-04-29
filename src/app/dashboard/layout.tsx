import Link from 'next/link';
import { LayoutDashboard, Copy, LogOut, Settings } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function handleLogout() {
  'use server';
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
  redirect('/login');
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white tracking-tight">⚡ Quiz Cloner</h1>
          <p className="text-slate-400 text-xs mt-1">Painel Administrativo</p>
        </div>

        <nav className="mt-4 px-3 flex-1">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Menu</p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-all"
              >
                <LayoutDashboard size={18} />
                <span className="font-medium">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/quizzes"
                className="flex items-center space-x-3 text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-all"
              >
                <Copy size={18} />
                <span className="font-medium">Meus Quizzes</span>
              </Link>
            </li>
            <li>
              <Link
                href="/dashboard/settings"
                className="flex items-center space-x-3 text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-all"
              >
                <Settings size={18} />
                <span className="font-medium">Configurações</span>
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-700">
          <form action={handleLogout}>
            <button
              type="submit"
              className="w-full flex items-center space-x-3 text-slate-400 hover:text-red-400 p-3 rounded-xl hover:bg-slate-800 transition-all"
            >
              <LogOut size={18} />
              <span className="font-medium">Sair</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
