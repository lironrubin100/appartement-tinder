// Emit a synthetic chat QA baseline, never connect to or mutate a database.
// This is the tested baseline chain, not a clone of the hosted schema/history.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/local-chat-baseline.mjs <output.sql>; apply only to an owned empty LOCAL Supabase runtime.');
const files = [
  'supabase/schema.sql', 'supabase/rls.sql',
  'supabase/migrations/20261013000100_chat_inbox_foundation.sql',
  'supabase/migrations/20261014205238_listing_inquiry_conversations.sql',
  'supabase/migrations/20261013213103_profile_passes_and_like_validation.sql',
  'supabase/migrations/20261015084833_resident_journeys.sql',
  'supabase/migrations/20261015084841_group_conversations.sql',
  'supabase/migrations/20261015084850_inquiry_acceptance_guards.sql',
  'supabase/migrations/20261017082317_lister_safe_browsing.sql',
  'supabase/migrations/20261017101500_convert_resident_to_lister.sql',
  'supabase/migrations/20261018100000_list_accessible_groups.sql',
  'supabase/migrations/20261019210659_monotonic_chat_read_markers.sql',
];
const sql = ['-- Synthetic local chat QA baseline. NEVER apply to an existing/shared database.',
  ...await Promise.all(files.map(async p => `-- Source: ${p}\n${(await readFile(resolve(root, p), 'utf8'))
    .replace('revoke update (student_email_verified_at) on profiles from authenticated;', '-- Obsolete revoke: field already moved to profile_private in this baseline.')}\n`))].join('\n');
await writeFile(output, sql, { flag: 'wx', mode: 0o600 });
console.log(`Wrote ${files.length} source files to ${output}; no database mutation.`);
