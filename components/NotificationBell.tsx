'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface Notif {
  id: string;
  title: string;
  message: string;
  target_plan: string | null;
  created_at: string;
  read: boolean;
}

export default function NotificationBell() {
  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.read).length;

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Notificações visíveis (RLS já filtra por plano/global)
    const { data: list } = await supabase
      .from('notifications')
      .select('id, title, message, target_plan, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Leituras do usuário
    const { data: reads } = await supabase
      .from('notification_reads')
      .select('notification_id')
      .eq('user_id', user.id);

    const readSet = new Set((reads || []).map(r => r.notification_id));
    setNotifs((list || []).map(n => ({ ...n, read: readSet.has(n.id) })));
  };

  const markAsRead = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('notification_reads')
      .upsert({ notification_id: id, user_id: user.id }, { onConflict: 'notification_id,user_id' });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const rows = notifs.filter(n => !n.read).map(n => ({ notification_id: n.id, user_id: user.id }));
    if (rows.length) {
      await supabase.from('notification_reads').upsert(rows, { onConflict: 'notification_id,user_id' });
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  useEffect(() => {
    load();
    // Realtime: novas notificações aparecem sozinhas
    const channel = supabase
      .channel('notifs')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'agora';
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-full bg-orange-500/10 border border-orange-400/30 flex items-center justify-center hover:bg-orange-500/20 transition-all"
      >
        <span className="text-lg">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#16120e] border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="bg-orange-500/10 border-b border-orange-500/20 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-orange-300">🔔 Notificações</span>
            {unread > 0 && (
              <button onClick={markAllAsRead} className="text-[11px] text-orange-400 hover:text-orange-300">
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-auto divide-y divide-orange-500/10">
            {notifs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                <div className="text-3xl mb-2">📭</div>
                Nenhuma notificação
              </div>
            ) : (
              notifs.map(n => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 transition-all hover:bg-orange-500/5 ${!n.read ? 'bg-orange-500/[0.07]' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />}
                    <div className={`flex-1 min-w-0 ${n.read ? 'pl-4' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!n.read ? 'font-bold text-gray-100' : 'font-medium text-gray-400'}`}>
                          {n.title}
                        </span>
                        <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(n.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
