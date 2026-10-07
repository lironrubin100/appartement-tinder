/**
 * D4 — public listings deliberately use a stable, approximate point.
 *
 * The actual address and coordinates must be protected by Supabase RLS as
 * well. This is the presentation layer: it prevents the exact point from
 * being rendered into the map or copied into public listing copy.
 */
export function publicAreaLabel() {
  return 'באר שבע · מיקום משוער';
}
