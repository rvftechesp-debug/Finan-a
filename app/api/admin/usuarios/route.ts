import { NextResponse } from 'next/server';
import { createSupabaseServer, supabaseAdmin } from '@/lib/supabase-server';

async function checkAdmin() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Não autenticado');

  const { data: profile } = await supabase
    .from('users')
    .select('blocked')
    .eq('id', user.id)
    .single();

  if (profile?.blocked) {
    await supabase.auth.signOut();
    throw new Error('Usuário bloqueado');
  }

  return supabase;
}


export async function GET() {
  try {
    await checkAdmin();

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, username, email, plan, role, created_at, last_access, subscription_status, subscription_end, last_payment_at, payment_amount, blocked')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

export async function PUT(request: Request) {
  try {
    await checkAdmin();
    const { id, plan, password, action, amount, blocked } = await request.json();

    // Alterar plano
    if (plan) {
      const { error } = await supabaseAdmin
        .from('users').update({ plan }).eq('id', id);
      if (error) throw error;
    }

    // Confirmar pagamento + renovar (ex: +30 dias)
    if (action === 'confirm_payment') {
      const now = new Date();
      const end = new Date(now);
      end.setDate(end.getDate() + 30);

      const { error } = await supabaseAdmin.from('users').update({
        subscription_status: 'active',
        subscription_start: now.toISOString(),
        subscription_end: end.toISOString(),
        last_payment_at: now.toISOString(),
        payment_amount: amount ?? null,
      }).eq('id', id);
      if (error) throw error;

      await supabaseAdmin.from('payments').insert({
        user_id: id, amount: amount ?? 0, plan: plan ?? 'unknown',
        period_start: now.toISOString(), period_end: end.toISOString(),
      });
    }

    // Cancelar assinatura
    if (action === 'cancel') {
      const { error } = await supabaseAdmin.from('users')
        .update({ subscription_status: 'canceled' }).eq('id', id);
      if (error) throw error;
    }

    // Bloquear / Desbloquear usuário
    if (action === 'toggle_block') {
      const { error } = await supabaseAdmin
        .from('users')
        .update({ blocked })
        .eq('id', id);
      if (error) throw error;
    }

    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
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
    await supabaseAdmin.from('users').delete().eq('id', id);  // ✅ era supabase

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

