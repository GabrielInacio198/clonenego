import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';

  // 1. Validar Senha
  if (password !== adminSecret) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  // 2. Validar se o E-mail está autorizado no banco
  if (!email) {
    return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 });
  }

  const { data: authorized, error } = await supabaseAdmin
    .from('authorized_admins')
    .select('email')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !authorized) {
    console.error('Tentativa de login não autorizada:', email);
    return NextResponse.json({ error: 'Este e-mail não tem permissão de acesso' }, { status: 403 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_auth', adminSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: '/',
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_auth');
  return response;
}
