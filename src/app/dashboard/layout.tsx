import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ThemeProvider } from '@/lib/ThemeProvider';
import { Sidebar, Header } from '@/components/DashboardNav';

async function handleLogout() {
  'use server';
  const cookieStore = await cookies();
  cookieStore.delete('admin_auth');
  redirect('/login');
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';

  if (!authCookie || authCookie.value !== adminSecret) {
    redirect('/login');
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
        {/* Sidebar Responsiva */}
        <Sidebar handleLogout={handleLogout} />

        {/* Conteúdo Principal */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header Responsivo */}
          <Header />

          {/* Área de Scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
