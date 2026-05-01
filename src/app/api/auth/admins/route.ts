import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

// Listar Admins
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('authorized_admins')
    .select('id, email, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Adicionar Admin
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    const { error } = await supabaseAdmin
      .from('authorized_admins')
      .insert([{ 
        email: email.toLowerCase().trim(), 
        password: hashedPassword 
      }]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao processar requisição' }, { status: 500 });
  }
}

// Remover Admin
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'ID não fornecido' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('authorized_admins')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
