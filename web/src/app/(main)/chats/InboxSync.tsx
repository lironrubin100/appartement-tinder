'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

// Signals only: the inbox RPC remains the authority for previews and counts.
// One account channel, never one subscription per historical conversation.
export default function InboxSync({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (!active || document.visibilityState !== 'visible' || pending) return;
      pending = setTimeout(() => {
        pending = undefined;
        if (active && document.visibilityState === 'visible') router.refresh();
      }, 150);
    };
    const channel = supabase.channel(`inbox:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, refresh)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `user_id=eq.${userId}`,
      }, refresh);
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session) return;
      await supabase.realtime.setAuth(session.access_token);
      if (!active) return;
      channel.subscribe((status) => {
        // Also re-fetch after a reconnect so missed events are not lost.
        if (status === 'SUBSCRIBED') refresh();
      });
    })().catch(refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      clearTimeout(pending);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);
  return null;
}
