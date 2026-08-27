'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  title: string;
  message: string;
  target_plan: string;
  created_at: string;
  sender_name?: string | null;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel>;
  let isMounted = true;

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isMounted) return;
    setUserId(user.id);

      const { data: userData } = await supabase
        .from('users').select('plan').eq('id', user.id).single();
      const userPlan = userData?.plan ?? 'free';

      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);
      const readIds = new Set((reads ?? []).map((r) => r.notification_id));

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .in('target_plan', [userPlan, 'all'])
        .order('created_at', { ascending: false });

     if (data && isMounted) {
      setNotifications(data.filter((n) => !readIds.has(n.id)));
    }

    if (!isMounted) return;

      channel = supabase
      .channel(`notifications-feed-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const nova = payload.new as Notification;
          if (nova.target_plan === userPlan || nova.target_plan === 'all') {
            setNotifications((prev) => [nova, ...prev]);
          }
        }
      )
      .subscribe();
  };

  init();

  return () => {
    isMounted = false;
    if (channel) supabase.removeChannel(channel);
  };
}, []);

  const markAsRead = async (notificationId: string) => {
    if (!userId) return;
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

    const { error } = await supabase
      .from('notification_reads')
      .insert({ notification_id: notificationId, user_id: userId });

    if (error && error.code !== '23505') {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  return { notifications, markAsRead };
}
