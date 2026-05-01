import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const adminSecret = process.env.ADMIN_SECRET || 'admin123';

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
  }

  // 1. Buscar o administrador pelo e-mail
  const { data: admin, error } = await supabaseAdmin
    .from('authorized_admins')
    .select('email, password')
    .eq('email', email.toLowerCase().trim())
    .single();

  // 2. Se não encontrar no banco, tentamos o fallback da Senha Mestre (apenas para o e-mail do dono se configurado)
  // Isso evita que você fique trancado fora do sistema se a tabela estiver vazia.
  if (error || !admin) {
    // Fallback de emergência caso você ainda não tenha cadastrado no banco
    if (password === adminSecret) {
      return grantAccess(adminSecret);
    }
    return NextResponse.json({ error: 'Acesso não autorizado ou e-mail inválido' }, { status: 403 });
  }

  // 3. Comparar a senha digitada com a senha criptografada no banco
  const passwordMatch = await bcrypt.compare(password, admin.password);

  if (!passwordMatch && password !== adminSecret) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  return grantAccess(adminSecret);
}

// Função auxiliar para gerar o cookie e dar acesso
function grantAccess(secret: string) {
  const response = NextResponse.json({ success: true });
  response.cookies.set('admin_auth', secret, {
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
