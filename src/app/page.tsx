import { redirect } from 'next/navigation';

export default function Home() {
  // Por enquanto, redireciona para o login ou dashboard
  redirect('/dashboard');
}
