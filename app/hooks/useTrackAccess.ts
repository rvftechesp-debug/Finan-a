'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // instância única

export function useTrackAccess() {
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();

      if (authErr || !user) {
        console.warn('[track] SEM usuário logado — abortando');
        return;
      }

      const ua = navigator.userAgent;
      const device = /Mobi|Android|iPhone/i.test(ua)
        ? 'Mobile'
        : /iPad|Tablet/i.test(ua)
        ? 'Tablet'
        : 'Desktop';

      await supabase.from('access_logs').insert({
        user_id: user.id,
        path: pathname,
        device,
        user_agent: ua,
        email: user.email,
      });
    })();
  }, [pathname]);
}
