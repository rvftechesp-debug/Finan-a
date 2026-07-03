import { NextResponse } from 'next/server';
import { createSupabaseServer, supabaseAdmin } from '@/lib/supabase-server';

async function checkAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') throw new Error('Acesso negado');

  return supabase;
}

export async function GET() {
  try {
    await checkAdmin(); // só pra verificar permissão

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, plan, last_access, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}


export async function PUT(request: Request) {
  try {
    const supabase = await checkAdmin();
    const { id, plan, password } = await request.json();

    if (plan) {
      const { error } = await supabase
        .from('users')
        .update({ plan })
        .eq('id', id);

      if (error) throw error;
    }

    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password,
      });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await checkAdmin();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) throw new Error('ID obrigatório');

    await supabaseAdmin.auth.admin.deleteUser(id);

    const supabase = await createSupabaseServer();
    await supabase.from('users').delete().eq('id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
