'use client';
import { usePathname } from 'next/navigation';
import { Button } from './Button';

export default function JourneyError({ retry }: { retry: () => void }) {
  const en = usePathname().startsWith('/en/');
  return (
    <section
      className="mx-auto max-w-lg space-y-4 px-5 py-16 text-center"
      role="alert"
    >
      <h1 className="text-xl font-bold">
        {en ? 'Could not load this screen' : 'לא הצלחנו לטעון את המסך'}
      </h1>
      <p className="text-muted-text">
        {en ? 'Please try again.' : 'אפשר לנסות שוב.'}
      </p>
      <Button onClick={retry}>{en ? 'Retry' : 'ניסיון חוזר'}</Button>
    </section>
  );
}
