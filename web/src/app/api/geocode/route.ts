import { NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { lookupAddresses } from '@/lib/listings/geocoding';

export const runtime = 'nodejs';
const reply = (body: object, status: number) => NextResponse.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
});

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'unavailable' }, 403);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply({ error: 'sign_in' }, 401);
  if (Number(request.headers.get('content-length')) > 1024) return reply({ error: 'invalid_query' }, 400);
  let body;
  try { body = await request.json(); } catch { return reply({ error: 'invalid_query' }, 400); }
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  if (query.length < 3 || query.length > 200 || !['he', 'en'].includes(body?.language)) {
    return reply({ error: 'invalid_query' }, 400);
  }
  const key = process.env.GEOAPIFY_API_KEY?.trim();
  if (!key) return reply({ error: 'unavailable' }, 503);
  try {
    const admin = createAdminClient();
    const { data: allowed, error } = await admin.rpc('reserve_geocoding_request', { p_actor: user.id });
    // Missing/unavailable budget fails closed; manual entry stays available.
    if (error) return reply({ error: 'unavailable' }, 503);
    if (!allowed) return reply({ error: 'rate_limited' }, 429);
    const result = await lookupAddresses(query, body.language, key, user.id);
    if (result.status === 429) await admin.rpc('pause_geocoding_provider');
    return reply(result.status === 200 ? { suggestions: result.suggestions } : { error: 'unavailable' }, result.status);
  } catch {
    // Never log provider URLs/errors, address queries or raw results.
    return reply({ error: 'unavailable' }, 503);
  }
}
