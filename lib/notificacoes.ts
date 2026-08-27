import { supabase } from '@/lib/supabase';

export async function getUserPlan(userId: string) {
  const { data } = await supabase
    .from('users')
    .select('plan')
    .eq('id', userId)
    .single();
  return data?.plan ?? null;
}

export async function checarNotificacoes(userId: string) {
  const plan = await getUserPlan(userId);
  if (!plan) return;

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .or(`target_plan.eq.${plan},target_plan.is.null`)
    .order('created_at', { ascending: false })
    .limit(1);

  const notif = data?.[0];
  if (!notif) return;

  const vistos = JSON.parse(localStorage.getItem('notifs_vistas') ?? '[]');
  if (vistos.includes(notif.id)) return;

  alert(`${notif.title}\n\n${notif.message}`); // pop-up simples
  localStorage.setItem('notifs_vistas', JSON.stringify([...vistos, notif.id]));
}
