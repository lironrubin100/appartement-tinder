export type SaveReply = { saved: boolean; interestCount: number };
export type SaveActionResult = ({ ok: true } & SaveReply) | { ok: false; code: 'busy' | 'load' | 'auth' | 'request' | 'changed' };
export type SaveSnapshot = {
  actor: string | null; ready: boolean; loadError: boolean;
  favorites: ReadonlySet<string>; pending: ReadonlySet<string>; uncertain: ReadonlySet<string>;
};
type Backend = {
  getActor(): Promise<string | null>;
  read(actor: string, signal: AbortSignal): Promise<string[]>;
  set(actor: string, id: string, desired: boolean, signal: AbortSignal): Promise<SaveReply>;
};
const empty = (actor: string | null = null): SaveSnapshot => ({ actor, ready: false, loadError: false, favorites: new Set(), pending: new Set(), uncertain: new Set() });
class ActorChanged extends Error { constructor(readonly actor: string | null) { super('SESSION_CHANGED'); } }

// No I/O at construction. Server renders always receive the stable empty snapshot.
export function createPersonalSavesStore(backend: Backend, deadlineMs = 20_000) {
  const serverSnapshot = empty();
  let snapshot = serverSnapshot, epoch = 0;
  let observedActor: string | null | undefined;
  let reading: AbortController | undefined;
  const listeners = new Set<() => void>();
  const requests = new Map<string, AbortController>();
  const intents = new Map<string, { actor: string; desired: boolean }>();
  const publish = (next: SaveSnapshot) => { snapshot = next; for (const listener of listeners) listener(); };

  async function deadline<T>(controller: AbortController, work: (signal: AbortSignal) => Promise<T>) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abort: (() => void) | undefined;
    try {
      return await Promise.race([work(controller.signal), new Promise<never>((_, reject) => {
        abort = () => reject(new Error('REQUEST_ABORTED'));
        controller.signal.addEventListener('abort', abort, { once: true });
        timer = setTimeout(() => controller.abort(), deadlineMs);
      })]);
    } finally {
      clearTimeout(timer);
      if (abort) controller.signal.removeEventListener('abort', abort);
    }
  }

  function observe(actor: string | null) {
    if (observedActor === actor) return;
    observedActor = actor; epoch++; reading?.abort();
    for (const request of requests.values()) request.abort();
    requests.clear(); intents.clear(); publish(empty(actor));
    // Do not await another Auth call inside Supabase's auth-state callback.
    queueMicrotask(() => { void reload(); });
  }

  async function reload() {
    if (snapshot.pending.size) return;
    const generation = ++epoch, expected = observedActor;
    reading?.abort();
    const controller = new AbortController(); reading = controller;
    publish(empty(snapshot.actor));
    try {
      const result = await deadline(controller, async signal => {
        signal.throwIfAborted();
        const actor = await backend.getActor(); signal.throwIfAborted();
        if (expected !== undefined && expected !== actor) throw new ActorChanged(actor);
        if (!actor) return { actor: null, ids: [] };
        const ids = await backend.read(actor, signal); signal.throwIfAborted();
        const current = await backend.getActor(); signal.throwIfAborted();
        if (current !== actor) throw new ActorChanged(current);
        if (ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) throw new Error('INVALID_SAVED_STATE');
        return { actor, ids };
      });
      if (generation !== epoch) return;
      observedActor = result.actor; intents.clear();
      publish({ ...empty(result.actor), ready: true, favorites: new Set(result.ids) });
    } catch (error) {
      if (generation !== epoch) return;
      if (error instanceof ActorChanged) { observe(error.actor); return; }
      publish({ ...empty(snapshot.actor), loadError: true });
    } finally { if (reading === controller) reading = undefined; }
  }

  async function toggle(id: string): Promise<SaveActionResult> {
    if (!snapshot.ready) return { ok: false, code: 'load' };
    if (!snapshot.actor) return { ok: false, code: 'auth' };
    if (snapshot.pending.has(id)) return { ok: false, code: 'busy' };
    const actor = snapshot.actor, generation = epoch;
    const intent = intents.get(id) ?? { actor, desired: !snapshot.favorites.has(id) };
    if (intent.actor !== actor) return { ok: false, code: 'changed' };
    intents.set(id, intent);
    const controller = new AbortController(); requests.set(id, controller);
    publish({ ...snapshot, pending: new Set(snapshot.pending).add(id) });
    try {
      const result = await deadline(controller, async signal => {
        const current = await backend.getActor(); signal.throwIfAborted();
        if (current !== actor) throw new ActorChanged(current);
        const reply = await backend.set(actor, id, intent.desired, signal); signal.throwIfAborted();
        const after = await backend.getActor(); signal.throwIfAborted();
        if (after !== actor) throw new ActorChanged(after);
        if (reply.saved !== intent.desired || !Number.isSafeInteger(reply.interestCount) || reply.interestCount < 0) throw new Error('INVALID_SAVE_REPLY');
        return reply;
      });
      if (generation !== epoch) return { ok: false, code: 'changed' };
      intents.delete(id);
      const favorites = new Set(snapshot.favorites), pending = new Set(snapshot.pending), uncertain = new Set(snapshot.uncertain);
      if (result.saved) favorites.add(id); else favorites.delete(id);
      pending.delete(id); uncertain.delete(id); publish({ ...snapshot, favorites, pending, uncertain });
      return { ok: true, ...result };
    } catch (error) {
      if (generation !== epoch) return { ok: false, code: 'changed' };
      if (error instanceof ActorChanged) { observe(error.actor); return { ok: false, code: 'changed' }; }
      const pending = new Set(snapshot.pending); pending.delete(id);
      // Retry retains this exact choice even when the first write committed.
      publish({ ...snapshot, pending, uncertain: new Set(snapshot.uncertain).add(id) });
      return { ok: false, code: 'request' };
    } finally { if (requests.get(id) === controller) requests.delete(id); }
  }
  return {
    getSnapshot: () => snapshot, getServerSnapshot: () => serverSnapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    observe, reload, toggle,
  };
}
