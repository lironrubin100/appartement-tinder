export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-xl space-y-4 p-6">
      <div className="h-12 animate-pulse rounded-2xl bg-neutral-bg-soft" />
      <div className="h-80 animate-pulse rounded-3xl bg-neutral-bg-soft" />
    </div>
  );
}
