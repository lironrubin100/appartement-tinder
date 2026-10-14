'use client';
export default function Error({ reset }: { reset: () => void }) { return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-xl font-bold">לא הצלחנו לטעון את המודעה / Could not load listing</h1><button onClick={reset} className="mt-5 rounded-xl bg-orange px-5 py-3 text-white">נסו שוב / Retry</button></main>; }
