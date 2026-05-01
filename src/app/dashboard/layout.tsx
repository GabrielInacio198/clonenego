import Link from 'next/link';
import { LayoutDashboard, Copy, LogOut, Settings } from 'lucide-react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { ThemeToggle } from '@/lib/ThemeToggle';

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
    <ThemeProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 dark:bg-slate-900 flex flex-col border-r border-slate-700">
          <div className="p-6 border-b border-slate-700">
            <h1 className="text-xl font-bold text-white tracking-tight">⚡ SnapFunnel</h1>
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
          {/* Top Header */}
          <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white text-lg">⚡</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">SnapFunnel</h1>
                <p className="text-xs text-slate-400 dark:text-slate-400 -mt-0.5">Painel de Controle</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                ● Online
              </span>
            </div>
          </header>

          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
