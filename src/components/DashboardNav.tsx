'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Copy, LogOut, Settings, FileText, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/lib/ThemeToggle';

interface SidebarProps {
  handleLogout: (formData: FormData) => void;
}

export function Sidebar({ handleLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/dashboard/quizzes', icon: Copy, label: 'Meus Quizzes' },
    { href: '/dashboard/pages', icon: FileText, label: 'Páginas' },
    { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
  ];

  return (
    <>
      {/* Botão Mobile */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[40] lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-[50] w-64 bg-slate-900 flex flex-col border-r border-slate-700 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white tracking-tight">⚡ SnapFunnel</h1>
          <p className="text-slate-400 text-xs mt-1">Painel Administrativo</p>
        </div>

        <nav className="mt-4 px-3 flex-1 overflow-y-auto">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 mb-2">Menu</p>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center space-x-3 text-slate-300 hover:text-white p-3 rounded-xl hover:bg-slate-800 transition-all"
                >
                  <item.icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
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
    </>
  );
}

export function Header() {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300">
      <div className="flex items-center gap-3 ml-12 lg:ml-0">
        <div className="w-8 h-8 lg:w-9 lg:h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg lg:rounded-xl flex items-center justify-center shadow-md">
          <span className="text-white text-base lg:text-lg">⚡</span>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-base lg:text-lg font-bold text-slate-800 dark:text-white tracking-tight leading-tight">SnapFunnel</h1>
          <p className="text-[10px] lg:text-xs text-slate-400 dark:text-slate-400 -mt-0.5">Painel de Controle</p>
        </div>
      </div>
      <div className="flex items-center gap-2 lg:gap-4">
        <ThemeToggle />
        <span className="inline-flex items-center px-2 py-0.5 lg:px-2.5 lg:py-1 rounded-full text-[10px] lg:text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          ● Online
        </span>
      </div>
    </header>
  );
}
