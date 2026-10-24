import { createClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import type { Database, Json } from '@/types/database';

// This is intentionally a small public allowlist, not a generic client-side
// configuration dump. Private limits (privacy offsets, anti-abuse thresholds,
// and group limits) stay server-owned even when their values live in app_config.
const publicMapSettings = {
  'map.cluster_max_zoom': { default: 14, min: 1, max: 22 },
  'map.new_listing_within_days': { default: 7, min: 0, max: 365 },
} as const;

type PublicMapSettingKey = keyof typeof publicMapSettings;

export type PublicMapConfig = {
  clusterMaxZoom: number;
  newListingWithinDays: number;
};

const DEFAULT_PUBLIC_MAP_CONFIG: PublicMapConfig = {
  clusterMaxZoom: publicMapSettings['map.cluster_max_zoom'].default,
  newListingWithinDays: publicMapSettings['map.new_listing_within_days'].default,
};

function readBoundedInteger(value: Json | undefined, fallback: number, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

export function resolvePublicMapConfig(rows: readonly { key: string; value: Json }[]): PublicMapConfig {
  const values = new Map(rows.map((row) => [row.key, row.value]));
  const cluster = publicMapSettings['map.cluster_max_zoom'];
  const newListing = publicMapSettings['map.new_listing_within_days'];

  return {
    clusterMaxZoom: readBoundedInteger(values.get('map.cluster_max_zoom'), cluster.default, cluster.min, cluster.max),
    newListingWithinDays: readBoundedInteger(values.get('map.new_listing_within_days'), newListing.default, newListing.min, newListing.max),
  };
}

async function fetchPublicMapConfig(): Promise<PublicMapConfig> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return DEFAULT_PUBLIC_MAP_CONFIG;

  const supabase = createClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const keys = Object.keys(publicMapSettings) as PublicMapSettingKey[];
  const { data, error } = await supabase
    .from('app_config')
    .select('key, value')
    .eq('is_public', true)
    .in('key', keys);

  if (error || !data) return DEFAULT_PUBLIC_MAP_CONFIG;
  return resolvePublicMapConfig(data);
}

// Values remain dynamic without making every map request query the database.
// Changes made through a future protected admin flow become visible within 60 s.
export const getPublicMapConfig = unstable_cache(
  fetchPublicMapConfig,
  ['public-map-config-v1'],
  { revalidate: 60, tags: ['public-app-config'] },
);
