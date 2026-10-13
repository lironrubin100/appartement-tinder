'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Send } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

type Message = { id: string; sender_id: string; body: string; created_at: string };

export default function ChatThread({ conversationId, currentUserId, otherUserName, initialMessages }: {
  conversationId: string; currentUserId: string; otherUserName: string; initialMessages: Message[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', currentUserId);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const message = payload.new as Message;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (message.sender_id !== currentUserId) {
          void supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', conversationId).eq('user_id', currentUserId);
        }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || sending) return;
    setSending(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase.from('messages')
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: trimmedBody })
      .select('id, sender_id, body, created_at').single();
    if (insertError) setError('לא הצלחנו לשלוח את ההודעה. נסה שוב.');
    else if (data) {
      setMessages((current) => [...current, data]);
      setBody('');
    }
    setSending(false);
  }

  return (
    <div className="w-full bg-page-bg min-h-[calc(100vh-80px)] flex flex-col">
      <header className="bg-white border-b border-card-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/chats" className="p-2 -m-2 text-ink" aria-label="חזרה לצ׳אטים"><ArrowRight className="w-5 h-5" /></Link>
        <h1 className="font-semibold text-ink">{otherUserName}</h1>
      </header>
      <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 space-y-3">
        {messages.map((message) => {
          const isOwn = message.sender_id === currentUserId;
          return <div key={message.id} className={`flex ${isOwn ? 'justify-start' : 'justify-end'}`}>
            <p className={`max-w-[80%] rounded-shutaf-lg px-4 py-3 text-sm whitespace-pre-wrap ${isOwn ? 'bg-orange text-white' : 'bg-white text-ink border border-card-border'}`}>{message.body}</p>
          </div>;
        })}
      </div>
      <form onSubmit={sendMessage} className="sticky bottom-0 bg-white border-t border-card-border p-3 flex gap-2">
        <input value={body} onChange={(event) => setBody(event.target.value)} maxLength={2000} placeholder="כתבו הודעה…" className="flex-1 rounded-shutaf-md border border-card-border px-4 py-3 text-ink focus:outline-none focus:ring-2 focus:ring-orange" aria-label="הודעה" />
        <Button type="submit" disabled={!body.trim() || sending} className="px-4" aria-label="שליחת הודעה"><Send className="w-5 h-5" /></Button>
      </form>
      {error && <p className="bg-white text-error text-sm px-4 pb-3 text-center">{error}</p>}
    </div>
  );
}
