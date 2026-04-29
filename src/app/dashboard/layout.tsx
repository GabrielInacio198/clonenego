import Link from 'next/link';
import { LayoutDashboard, Copy, Users, Settings } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600 tracking-tight">QuizCloner</h1>
        </div>
        <nav className="mt-6 px-4">
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <LayoutDashboard size={20} />
                <span className="font-medium">Dashboard</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/quizzes" className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Copy size={20} />
                <span className="font-medium">Meus Quizzes</span>
              </Link>
            </li>
            <li>
              <Link href="/dashboard/leads" className="flex items-center space-x-3 text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Users size={20} />
                <span className="font-medium">Leads Capturados</span>
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-end">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Admin</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
