import { residentFields, taxonomy } from '../web/src/lib/contracts/taxonomy.ts';
import { readFileSync, writeFileSync } from 'node:fs';
const migration = new URL('../supabase/migrations/20261019214904_canonical_resident_profiles.sql', import.meta.url);
const schema = Object.fromEntries(Object.entries(residentFields).map(([key, field]) => [key, {
  kind: field.kind, ...('options' in field ? { options: Object.keys(field.options) } : { max: field.max }),
}]));
const scored = [...new Set(Object.values(taxonomy).filter(c => c.weight > 0).flatMap(c => c.fields))]
  .filter(key => key !== 'pets' && ['enum', 'set'].includes(residentFields[key]?.kind));
const generated = `-- BEGIN GENERATED MANIFEST\ncreate function public.resident_field_schema() returns jsonb language sql immutable set search_path='' as $schema$\nselect '${JSON.stringify(schema)}'::jsonb\n$schema$;\ncreate function public.resident_preference_fields() returns text[] language sql immutable set search_path='' as $$\nselect array[${scored.map(key => `'${key}'`).join(',')}]::text[]\n$$;\n-- END GENERATED MANIFEST`;
const source = readFileSync(migration, 'utf8');
const output = source.replace(/-- BEGIN GENERATED MANIFEST[\s\S]*?-- END GENERATED MANIFEST/, () => generated);
if (process.argv.includes('--check')) {
  if (source !== output) throw new Error('Canonical SQL manifest drift');
} else writeFileSync(migration, output);
