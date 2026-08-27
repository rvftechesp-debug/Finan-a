'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { checarNotificacoes } from '@/lib/notificacoes';

export default function NotificacaoChecker() {
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid) checarNotificacoes(uid);
    });
  }, []);

  return null;
}
