'use client';

import { ChatListingCard } from '@/components/chat/ChatListingCard';
import { sharedListingId, messageFields } from '@/lib/chat/message-types';
import { useFavorites } from '@/hooks/useFavorites';
import Link from 'next/link';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { localePath, type Locale } from '@/utils/navigation';
import { Button } from '@/components/ui';

type Message = {
  message_seq: number;
  listing_id: string | null;
  id: string;
  sender_id: string | null;
  kind: string;
  body: string;
  created_at: string;
};

export default function ChatThread({
  conversationId,
  currentUserId,
  otherUserName,
  exactAddress,
  initialMessages,
  locale,
  memberNames,
  controls,
}: {
  locale: Locale;
  memberNames: Record<string, string>;
  controls: React.ReactNode;
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  exactAddress: string | null;
  initialMessages: Message[];
}) {
  const en = locale === 'en';
  const favorites = useFavorites();
  const [older, setOlder] = useState(initialMessages.length === 100);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState('connecting');
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const catchUpCursor = useRef(initialMessages.at(-1)?.message_seq ?? 0);
  const pendingSend = useRef<{ body: string; key: string } | null>(null);
  const sendingNow = useRef(false);
  const composerHintId = useId();
  const acknowledgedSeq = useRef(0);
  useEffect(() => { acknowledgedSeq.current = 0; }, [conversationId]);
  const newestRenderedSeq = messages.at(-1)?.message_seq ?? 0;

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let inFlight = false;
    const markRenderedRead = async () => {
      if (document.visibilityState !== 'visible' || !document.hasFocus() ||
          newestRenderedSeq <= acknowledgedSeq.current || inFlight) return;
      inFlight = true;
      const { data, error: readError } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
        p_through_seq: newestRenderedSeq,
      });
      inFlight = false;
      if (active && !readError && data !== null) {
        acknowledgedSeq.current = Math.max(acknowledgedSeq.current, data);
      }
    };
    // The effect runs after React commits the displayed message list.
    void markRenderedRead();
    const onFocus = () => { void markRenderedRead(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [conversationId, newestRenderedSeq, connection]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let joined = false;
    let replicationReady = false;
    let catchingUp = false;
    const catchUp = async () => {
      if (!joined || !replicationReady || catchingUp) return;
      catchingUp = true;
      try {
        // Fetch forward from the last persisted page, so a long disconnect
        // cannot silently leave a hole between old state and the latest 100.
        while (active && joined && replicationReady) {
          const { data, error: loadError } = await supabase
            .from('messages')
            .select(messageFields)
            .eq('conversation_id', conversationId)
            .gt('message_seq', catchUpCursor.current)
            .order('message_seq', { ascending: true })
            .limit(100);
          if (!active || !joined || !replicationReady) return;
          if (loadError) { setConnection('offline'); return; }
          const batch = data ?? [];
          setMessages((current) => {
            const merged = new Map(current.map((m) => [m.id, m]));
            for (const m of batch) merged.set(m.id, m);
            return [...merged.values()].sort((a, b) => a.message_seq - b.message_seq);
          });
          if (batch.length) catchUpCursor.current = batch.at(-1)!.message_seq;
          if (batch.length < 100) break;
        }
        if (active && joined && replicationReady) setConnection('live');
      } finally { catchingUp = false; }
    };
    const channel = supabase
      .channel(`conversation:${conversationId}:${crypto.randomUUID()}`, {
        config: { broadcast: { replication_ready: true } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (!active) return;
          const message = payload.new as Message;
          setMessages((current) =>
            current.some((item) => item.id === message.id)
              ? current
              : [...current, message].sort(
                  (a, b) => a.message_seq - b.message_seq
                )
          );
        }
      )
      .on('system', {}, (payload) => {
        if (!active) return;
        if (payload.extension === 'system' && payload.status === 'ok') {
          replicationReady = true;
          void catchUp();
        }
        if (payload.status === 'error') {
          joined = false;
          replicationReady = false;
          setConnection('offline');
        }
      });
    void (async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (!active) return;
      setConnection('connecting');
      if (sessionError || !session) {
        setConnection('offline');
        return;
      }
      await supabase.realtime.setAuth(session.access_token);
      if (!active) return;
      channel.subscribe((status) => {
        if (!active) return;
        if (status === 'SUBSCRIBED') {
          joined = true;
          void catchUp();
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          joined = false;
          replicationReady = false;
          setConnection('offline');
        }
      });
    })().catch(() => {
      if (active) setConnection('offline');
    });
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, connectionAttempt]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedDraft = body;
    const trimmedBody = body.trim();
    if (!trimmedBody || sendingNow.current) return;
    sendingNow.current = true;
    setSending(true);
    setError(null);
    const supabase = createClient();
    if (pendingSend.current?.body !== trimmedBody) {
      pendingSend.current = { body: trimmedBody, key: crypto.randomUUID() };
    }
    const requestKey = pendingSend.current.key;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const send = async () => {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('No active session');
        const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
        if (userError || user?.id !== currentUserId) throw new Error('Session changed');
        controller.signal.throwIfAborted();
        // Bind this intent to the verified session, even if another tab switches accounts.
        const { data, error: insertError } = await supabase
          .rpc('send_chat_message', {
            p_conversation_id: conversationId,
            p_body: trimmedBody,
            p_request_key: requestKey,
          })
          .setHeader('Authorization', `Bearer ${session.access_token}`)
          .abortSignal(controller.signal)
          .single();
        if (insertError || !data) throw new Error('Send failed');
        return data;
      };
      const data = await Promise.race([
        send(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('Send timed out'));
          }, 20_000);
        }),
      ]);
      setMessages((current) =>
        current.some((m) => m.id === data.id)
          ? current
          : [...current, data].sort((a, b) => a.message_seq - b.message_seq)
      );
      pendingSend.current = null;
      setBody((current) => current === submittedDraft ? '' : current);
    } catch {
      setError(
        en
          ? 'Could not send. Please retry.'
          : 'לא הצלחנו לשלוח את ההודעה. נסה שוב.'
      );
    } finally {
      clearTimeout(timeout);
      sendingNow.current = false;
      setSending(false);
    }
  }

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] flex flex-col">
      <header className="bg-white border-b border-card-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href={localePath('/chats', locale)}
          className="p-2 -m-2 text-ink"
          aria-label={en ? 'Back to chats' : 'חזרה לצ׳אטים'}
        >
          <ArrowRight className={`w-5 h-5 ${en ? 'rotate-180' : ''}`} />
        </Link>
        <h1 className="font-semibold text-ink">{otherUserName}</h1>
        <span
          role="status"
          data-testid="chat-connection"
          className="text-xs text-muted-text"
        >
          {connection === 'live'
            ? en
              ? 'Live'
              : 'מחובר'
            : connection === 'offline'
              ? en
                ? 'Connection lost'
                : 'החיבור נותק'
              : en
                ? 'Connecting…'
                : 'מתחברים…'}
        </span>
        {connection === 'offline' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConnectionAttempt((n) => n + 1)}
          >
            {en ? 'Reconnect' : 'חיבור מחדש'}
          </Button>
        )}
        <div className="ms-auto">{controls}</div>
      </header>
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-3">
        {exactAddress && (
          <section
            className="rounded-shutaf-md border border-success/30 bg-success/10 p-4"
            data-testid="exact-address-card"
          >
            <p className="text-sm font-semibold text-ink">
              {en ? 'Exact address' : 'הכתובת המדויקת'}
            </p>
            <p className="mt-1 text-ink">{exactAddress}</p>
          </section>
        )}
        {older && (
          <Button
            variant="secondary"
            disabled={loadingOlder}
            onClick={async () => {
              setLoadingOlder(true);
              const { data, error: e } = await createClient()
                .from('messages')
                .select(messageFields)
                .eq('conversation_id', conversationId)
                .lt('message_seq', messages[0]?.message_seq ?? 0)
                .order('message_seq', { ascending: false })
                .limit(100);
              setLoadingOlder(false);
              if (e)
                setError(
                  en
                    ? 'Could not load older messages.'
                    : 'לא הצלחנו לטעון הודעות קודמות.'
                );
              else {
                setMessages((current) => [
                  ...(data ?? []).reverse(),
                  ...current,
                ]);
                setOlder(data?.length === 100);
              }
            }}
          >
            {en ? 'Earlier messages' : 'הודעות קודמות'}
          </Button>
        )}
        {messages.map((message) => {
          const listingId = sharedListingId(message);
          if (listingId) return <div key={message.id} className={`flex ${message.sender_id === currentUserId ? 'justify-start' : 'justify-end'}`}><div className="w-full max-w-sm">{message.sender_id && memberNames[message.sender_id] && <p className="mb-1 text-xs text-muted-text">{memberNames[message.sender_id]}</p>}<ChatListingCard id={listingId} locale={locale} favorites={favorites}/></div></div>;
          const isOwn = message.sender_id === currentUserId;
          if (message.kind === 'system')
            return (
              <p
                key={message.id}
                className="mx-auto w-fit rounded-full bg-neutral-bg-soft px-4 py-2 text-center text-sm text-muted-text"
              >
                {message.body}
              </p>
            );
          return (
            <div
              key={message.id}
              className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}
            >
              <p
                className={`max-w-[80%] rounded-shutaf-lg px-4 py-3 text-sm whitespace-pre-wrap ${isOwn ? 'bg-orange text-white' : 'bg-white text-ink border border-card-border'}`}
              >
                {message.sender_id && memberNames[message.sender_id] && (
                  <span className="mb-1 block text-xs font-semibold">
                    {memberNames[message.sender_id]}
                  </span>
                )}
                {message.body}
              </p>
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-20 bg-white md:bottom-0">
      <form
        onSubmit={sendMessage}
        className="border-t border-card-border p-3 flex items-start gap-2"
      >
        <div className="min-w-0 flex-1">
        <textarea
          rows={2}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder={en ? 'Write a message…' : 'כתבו הודעה…'}
          className="block w-full max-h-48 resize-y rounded-shutaf-md border border-card-border px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-orange"
          aria-label={en ? 'Message' : 'הודעה'}
          aria-describedby={composerHintId}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) event.preventDefault();
          }}
        />
        <p id={composerHintId} className="mt-1 text-xs text-muted-text">
          {en ? 'Enter adds a line. Use Send to send.' : 'Enter מוסיף שורה. לשליחה השתמשו בכפתור השליחה.'}
        </p>
        </div>
        <Button
          type="submit"
          disabled={!body.trim() || sending}
          className="px-4"
          aria-label={en ? 'Send message' : 'שליחת הודעה'}
        >
          <Send className="w-5 h-5" />
        </Button>
      </form>
      {error && (
        <p role="alert" className="bg-white text-error text-sm px-4 pb-3 text-center">
          {error}
        </p>
      )}
      </div>
    </div>
  );
}
