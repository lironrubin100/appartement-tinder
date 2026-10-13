'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button, Input } from '@/components/ui';

export default function EmailPasswordForm() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    setStatus(null);
    const supabase = createClient();

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      if (signUpError) setError(signUpError.message);
      else if (!data.session) setStatus('שלחנו קישור אימות למייל. אחרי האישור תוכלו להמשיך לאפליקציה.');
      else router.replace('/onboarding');
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError('כתובת המייל או הסיסמה אינם נכונים.');
      else {
        router.replace('/');
        router.refresh();
      }
    }
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3 text-start">
      {isSignUp && <Input label="שם" value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />}
      <Input label="כתובת מייל" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" dir="ltr" />
      <Input label="סיסמה" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isSignUp ? 'new-password' : 'current-password'} dir="ltr" />
      {error && <p className="text-sm text-error">{error}</p>}
      {status && <p className="text-sm text-success">{status}</p>}
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={submitting || (isSignUp && !name.trim())}>
        {submitting ? 'רגע…' : isSignUp ? 'יצירת חשבון' : 'התחברות עם מייל'}
      </Button>
      <button type="button" className="w-full text-sm text-teal hover:underline" onClick={() => { setIsSignUp((current) => !current); setError(null); setStatus(null); }}>
        {isSignUp ? 'כבר יש לכם חשבון? התחברו' : 'אין לכם חשבון? הירשמו'}
      </button>
    </form>
  );
}
