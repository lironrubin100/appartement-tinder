# Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-run onboarding flow — intro slides, Google auth, residency fork, and the resident/Lister branches — so a new Google sign-in becomes a usable account instead of bouncing back to `/login`, and close the auth-gating gap on every `(main)` route.

**Architecture:** A single `/onboarding` route renders a config-driven step sequence (`getApplicableSteps()` picks the resident or Lister array based on `profiles.mode`) inside one client container that animates transitions with Framer Motion. Each step component writes directly to Supabase via the browser client — the same pattern `EditProfileForm.tsx` already uses, no server actions. `(main)/layout.tsx` and `page.tsx` gate on session + `profiles.onboarded`.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` browser/server clients (already wired), `framer-motion` (new dependency), existing `web/src/components/ui` kit.

**Spec:** `docs/superpowers/specs/2026-08-29-onboarding-design.md`

## Global Constraints

- No i18n layer exists yet anywhere in the app (all copy is Hebrew-only, e.g. `settings/page.tsx`'s hardcoded "עברית (תמיד)"). Onboarding copy follows the same convention — this plan does not add i18n.
- No badges, labels, or explanatory captions in the real UI ("Required", "Pulled from Google", etc.) — per the user's explicit feedback on the mockup. Prefill and skip logic just happens silently.
- Birth date is a free-text input with live `/`-insertion, never a native date picker or scroll wheel.
- The trait picker is one screen with chips grouped into labeled clusters, not a per-category screen loop.
- Mode (Solo/Group/Room-Filler) is never asked in onboarding — it defaults to `'solo'` the instant the fork is answered "yes"; switching it later is Discover's job, out of scope here.
- Resume is branch-level, not field-level (a deliberate simplification over the spec's field-level language — see Task C's note): once `mode` is set, the full branch sequence (resident or Lister) always renders from its start until `onboarded` flips `true`. This sidesteps a real wrinkle the field-level version had — `profiles.name` is prefilled from Google at row-creation, so it's never `null` and can't be used as a "not asked yet" signal.
- `DECISIONS.md` A4 (mode-conditional default entry) and `PRD.md` are already updated — residents land on `/discover`, Lister-mode accounts land on `/compose` until the real Lister dashboard (D16) exists.
- Age gate (B5) is self-declared, client-side only — no server-side re-check, no DB constraint. Don't add one; it's explicitly out of scope per the decision.

---

### Task A: Data model — `profiles.mode` nullable, add `phone` / `agency_name`

**Files:**
- Modify (via Supabase MCP, live project `npbduvjnqnbydolmdpsc` / `roomie-beersheva`): `profiles` table
- Modify: `supabase/schema.sql` (hand-edit to match, this file is documentation of the live schema, not the source of migrations — same convention the prior profile-edit plan used)
- Modify: `web/src/types/database.ts` (regenerated, never hand-edited per its own header comment)

**Interfaces:**
- Produces: `profiles.mode: string | null` (was `not null default 'solo'`), `profiles.phone: string | null`, `profiles.agency_name: string | null` — consumed by every task below.

**Context:** `phone` and `agency_name` are missing from the schema entirely even though `DECISIONS.md` B10 (DECIDED) requires collecting them in the non-resident intake. `mode` needs to go nullable so `null` can mean "residency fork not answered yet" — see the spec's Data model section.

- [ ] **Step 1: Check the project is active, restore if paused**

The project showed `status: "INACTIVE"` (auto-paused free tier) as of this plan's writing. Call:

```
mcp__145b3a69-1804-47a6-b45e-19bdfe3dc0a1__get_project with project_id "npbduvjnqnbydolmdpsc"
```

If `status` isn't `ACTIVE_HEALTHY`, call `mcp__145b3a69-1804-47a6-b45e-19bdfe3dc0a1__restore_project` with the same `project_id` and wait for it to come up before continuing.

- [ ] **Step 2: Apply the migration**

Call `mcp__145b3a69-1804-47a6-b45e-19bdfe3dc0a1__apply_migration` with `project_id: "npbduvjnqnbydolmdpsc"`, a `name` like `onboarding_mode_nullable`, and this `query`:

```sql
alter table profiles
  alter column mode drop default,
  alter column mode drop not null,
  add column phone text,
  add column agency_name text;
```

- [ ] **Step 3: Verify it applied**

Call `mcp__145b3a69-1804-47a6-b45e-19bdfe3dc0a1__list_tables` with `project_id: "npbduvjnqnbydolmdpsc"`, `schemas: ["public"]`, `verbose: true`. Confirm `profiles` now shows `mode` as nullable with no default, and `phone`/`agency_name` present.

- [ ] **Step 4: Update `supabase/schema.sql` to match**

Edit the `profiles` table definition:

```diff
-  mode           text not null default 'solo'
-                 check (mode in ('solo','group','room_filler','lister')),
+  -- null = residency fork not yet answered (DECISIONS.md B10 / onboarding spec 2026-08-29)
+  mode           text check (mode in ('solo','group','room_filler','lister')),
```

And add near `bio`:

```sql
  phone          text,          -- collected in the Lister (non-resident) onboarding intake, B10
  agency_name    text,          -- optional, Lister intake, B10
```

- [ ] **Step 5: Regenerate `web/src/types/database.ts`**

Call `mcp__145b3a69-1804-47a6-b45e-19bdfe3dc0a1__generate_typescript_types` with `project_id: "npbduvjnqnbydolmdpsc"`, and overwrite `web/src/types/database.ts` with the output (keep the existing top-of-file comment block).

- [ ] **Step 6: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: passes (nothing consumes `mode`/`phone`/`agency_name` yet, so this just confirms the regenerated file is syntactically sound).

- [ ] **Step 7: Commit**

```bash
git add supabase/schema.sql web/src/types/database.ts
git commit -m "Make profiles.mode nullable, add phone/agency_name for Lister intake"
```

---

### Task B: Pure utilities — date mask and trait groups

**Files:**
- Create: `web/src/utils/dateMask.ts`
- Create: `web/src/utils/onboardingTraits.ts`

**Interfaces:**
- Produces: `formatDateInput(raw: string): string`, `parseDDMMYYYY(formatted: string): Date | null`, `isAtLeast18(date: Date): boolean` — consumed by Task C's `BirthdateStep`.
- Produces: `ONBOARDING_TRAIT_GROUPS: TraitGroup[]`, `categoriesForGroup(group: TraitGroup): TagCategory[]` — consumed by Task C's `TraitsStep`. Depends on `TAG_CATEGORIES`/`TagKey` already exported from `web/src/utils/profileTags.ts`.

- [ ] **Step 1: Write `dateMask.ts` with its self-check**

```typescript
// web/src/utils/dateMask.ts
import { pathToFileURL } from 'node:url';

export function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 4) return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export function parseDDMMYYYY(formatted: string): Date | null {
  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : null;
}

export function isAtLeast18(date: Date): boolean {
  const now = new Date();
  const eighteenYearsAgo = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()));
  return date.getTime() <= eighteenYearsAgo.getTime();
}

// Plain-node self-check: `node src/utils/dateMask.ts` (Node 23.6+ strips TS
// types by default). Mirrors the pattern in studentEmail.ts.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok: ${msg}`);
  };

  assert(formatDateInput('15') === '15', 'two digits, no slash yet');
  assert(formatDateInput('1503') === '15/03', 'slash inserted after day+month');
  assert(formatDateInput('15032005') === '15/03/2005', 'full date formatted live');
  assert(formatDateInput('15a032005') === '15/03/2005', 'non-digit characters stripped');
  assert(formatDateInput('150320059999') === '15/03/2005', '8-digit cap enforced');
  assert(parseDDMMYYYY('15/03/2005')?.getUTCFullYear() === 2005, 'valid date parses');
  assert(parseDDMMYYYY('31/02/2005') === null, 'invalid calendar date rejected');
  assert(parseDDMMYYYY('15/03/05') === null, 'short year rejected');
  assert(parseDDMMYYYY('15-03-2005') === null, 'wrong separator rejected');
  assert(isAtLeast18(new Date(Date.UTC(2000, 0, 1))) === true, 'clearly adult accepted');
  assert(isAtLeast18(new Date(Date.UTC(2020, 0, 1))) === false, 'clearly a minor rejected');
  console.log('all dateMask checks passed');
}
```

- [ ] **Step 2: Run the self-check**

```bash
cd web && node src/utils/dateMask.ts
```

Expected: `all dateMask checks passed` with no `FAIL:` lines.

- [ ] **Step 3: Write `onboardingTraits.ts` with its self-check**

```typescript
// web/src/utils/onboardingTraits.ts
import { pathToFileURL } from 'node:url';
import { TAG_CATEGORIES, type TagKey, type TagCategory } from './profileTags';

export interface TraitGroup {
  label: string;
  keys: TagKey[];
}

const GROUP_DEFS: TraitGroup[] = [
  { label: 'סגנון חיים', keys: ['cleanliness', 'kitchen_dietary', 'cooking_dynamics', 'pets', 'smoking', 'climate'] },
  { label: 'לו״ז וחברה', keys: ['sleep_schedule', 'social_guests', 'noise_tolerance', 'music_vibe', 'weekend_routine', 'study_habits'] },
  { label: 'עוד עליי', keys: ['relationship_status', 'financial_splitting', 'miluim_reserve_duty', 'gender_dynamic'] },
];

export const ONBOARDING_TRAIT_GROUPS: TraitGroup[] = GROUP_DEFS;

export function categoriesForGroup(group: TraitGroup): TagCategory[] {
  return group.keys.map((key) => TAG_CATEGORIES.find((c) => c.key === key)!);
}

// Plain-node self-check: `node src/utils/onboardingTraits.ts`. Mirrors the
// pattern in studentEmail.ts and dateMask.ts — catches a category added to
// profileTags.ts that never got assigned to a group here.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok: ${msg}`);
  };

  const covered = ONBOARDING_TRAIT_GROUPS.flatMap((g) => g.keys);
  const allKeys = TAG_CATEGORIES.map((c) => c.key);
  const missing = allKeys.filter((k) => !covered.includes(k));
  const dupes = covered.filter((k, i) => covered.indexOf(k) !== i);

  assert(missing.length === 0, `every TAG_CATEGORIES key is grouped (missing: ${missing.join(',') || 'none'})`);
  assert(dupes.length === 0, `no key is grouped twice (duplicated: ${dupes.join(',') || 'none'})`);
  assert(covered.length === 16, `all 16 categories accounted for (got ${covered.length})`);
  console.log('all onboardingTraits checks passed');
}
```

- [ ] **Step 4: Run the self-check**

```bash
cd web && node src/utils/onboardingTraits.ts
```

Expected: `all onboardingTraits checks passed` with no `FAIL:` lines.

- [ ] **Step 5: Commit**

```bash
git add web/src/utils/dateMask.ts web/src/utils/onboardingTraits.ts
git commit -m "Add date-mask and onboarding trait-grouping utilities"
```

---

### Task C: The onboarding UI — step config, components, container, route

This is one task because none of these pieces have an independent test cycle — the only meaningful check is loading `/onboarding` and clicking through, which needs all of them wired together.

**Files:**
- Create: `web/src/app/onboarding/stepConfig.ts`
- Create: `web/src/app/onboarding/steps/IntroStep.tsx`
- Create: `web/src/app/onboarding/steps/AuthStep.tsx`
- Create: `web/src/app/onboarding/steps/ForkStep.tsx`
- Create: `web/src/app/onboarding/steps/NameStep.tsx`
- Create: `web/src/app/onboarding/steps/BirthdateStep.tsx`
- Create: `web/src/app/onboarding/steps/TraitsStep.tsx`
- Create: `web/src/app/onboarding/steps/ListerFieldStep.tsx`
- Create: `web/src/app/onboarding/steps/DoneStep.tsx`
- Create: `web/src/app/onboarding/OnboardingFlow.tsx`
- Create: `web/src/app/onboarding/page.tsx`
- Modify: `web/package.json` (add `framer-motion`)

**Interfaces:**
- Consumes: `formatDateInput`/`parseDDMMYYYY`/`isAtLeast18` (Task B), `ONBOARDING_TRAIT_GROUPS`/`categoriesForGroup` (Task B), `TagKey` (existing `profileTags.ts`), `createClient` (existing `utils/supabase/client.ts`), `createServerClient` (existing `utils/supabase/server.ts`), `Button`/`Input` (existing `components/ui`).
- Produces: `<OnboardingFlow userId={string|null} displayName={string} initialMode={string|null} />` — the only thing `page.tsx` needs to render. `getApplicableSteps(hasSession: boolean, mode: string | null): OnboardingStep[]` — exported for potential reuse, not consumed elsewhere in this plan.

- [ ] **Step 1: Add the dependency**

```bash
cd web && npm install framer-motion
```

- [ ] **Step 2: Write the step config**

```typescript
// web/src/app/onboarding/stepConfig.ts
export type OnboardingStep =
  | { kind: 'intro'; icon: 'users' | 'map'; title: string; body: string }
  | { kind: 'auth' }
  | { kind: 'fork' }
  | { kind: 'name' }
  | { kind: 'birthdate' }
  | { kind: 'traits' }
  | { kind: 'lister-name' }
  | { kind: 'lister-phone' }
  | { kind: 'lister-agency' }
  | { kind: 'done' };

const INTRO_STEPS: OnboardingStep[] = [
  {
    kind: 'intro',
    icon: 'users',
    title: 'מצאו את השותפים שלכם',
    body: 'התאמה עם שותפים שבאמת מתאימים לאורח החיים שלכם.',
  },
  {
    kind: 'intro',
    icon: 'map',
    title: 'ואז מוצאים את הדירה',
    body: 'כל הדירות הזמינות בבאר שבע, במקום אחד.',
  },
  { kind: 'auth' },
];

const RESIDENT_STEPS: OnboardingStep[] = [
  { kind: 'name' },
  { kind: 'birthdate' },
  { kind: 'traits' },
  { kind: 'done' },
];

const LISTER_STEPS: OnboardingStep[] = [
  { kind: 'lister-name' },
  { kind: 'lister-phone' },
  { kind: 'lister-agency' },
  { kind: 'done' },
];

// Branch-level resume: see this plan's Global Constraints for why this is
// simpler than field-level resume and still correct.
export function getApplicableSteps(hasSession: boolean, mode: string | null): OnboardingStep[] {
  if (!hasSession) return INTRO_STEPS;
  if (mode === null) return [{ kind: 'fork' }];
  if (mode === 'lister') return LISTER_STEPS;
  return RESIDENT_STEPS;
}
```

- [ ] **Step 3: Write `IntroStep.tsx`**

```tsx
// web/src/app/onboarding/steps/IntroStep.tsx
'use client';

import { Users, Map } from 'lucide-react';
import { Button } from '@/components/ui';
import type { OnboardingStep } from '../stepConfig';

const ICONS = { users: Users, map: Map };

export function IntroStep({
  step,
  onNext,
}: {
  step: Extract<OnboardingStep, { kind: 'intro' }>;
  onNext: () => void;
}) {
  const Icon = ICONS[step.icon];
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <Icon className="w-10 h-10 text-orange" />
      <p className="text-lg font-semibold text-ink">{step.title}</p>
      <p className="text-sm text-body-text">{step.body}</p>
      <Button variant="primary" size="lg" className="w-full mt-4" onClick={onNext}>
        המשך
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Write `AuthStep.tsx`**

```tsx
// web/src/app/onboarding/steps/AuthStep.tsx
'use client';

import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui';

export function AuthStep() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <div className="flex flex-col items-center text-center gap-4">
      <p className="text-lg font-semibold text-ink">בואו נתחיל</p>
      <p className="text-sm text-body-text">מתחברים עם חשבון גוגל כדי להמשיך.</p>
      <Button variant="primary" size="lg" className="w-full mt-4" onClick={signInWithGoogle}>
        המשך עם Google
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Write `ForkStep.tsx`**

```tsx
// web/src/app/onboarding/steps/ForkStep.tsx
'use client';

import { Button } from '@/components/ui';

export function ForkStep({ onAnswer }: { onAnswer: (resident: boolean) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-ink text-center">תגורו בדירה הזו?</p>
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" onClick={() => onAnswer(true)}>
          כן, אני גר/ה כאן
        </Button>
        <Button variant="secondary" size="lg" onClick={() => onAnswer(false)}>
          לא, אני מפרסם/ת נכס
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Write `NameStep.tsx`**

```tsx
// web/src/app/onboarding/steps/NameStep.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button, Input } from '@/components/ui';

export function NameStep({
  userId,
  initialName,
  onNext,
}: {
  userId: string;
  initialName: string;
  onNext: () => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!name.trim()) {
      setError('צריך להזין שם');
      return;
    }
    setSaving(true);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', userId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-ink">מה השם שלך?</p>
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
      />
      <Button variant="primary" size="lg" onClick={handleContinue} disabled={saving}>
        המשך
      </Button>
    </div>
  );
}
```

- [ ] **Step 7: Write `BirthdateStep.tsx`**

```tsx
// web/src/app/onboarding/steps/BirthdateStep.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { formatDateInput, parseDDMMYYYY, isAtLeast18 } from '@/utils/dateMask';
import { Button, Input } from '@/components/ui';

export function BirthdateStep({ userId, onNext }: { userId: string; onNext: () => void }) {
  const supabase = createClient();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    const parsed = parseDDMMYYYY(value);
    if (!parsed) {
      setError('תאריך לא תקין');
      return;
    }
    if (!isAtLeast18(parsed)) {
      setError('צריך להיות מעל גיל 18');
      return;
    }
    setSaving(true);
    const isoDate = parsed.toISOString().slice(0, 10);
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ birth_date: isoDate })
      .eq('id', userId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-ink">מתי נולדת?</p>
      <Input
        value={value}
        onChange={(e) => {
          setValue(formatDateInput(e.target.value));
          setError(null);
        }}
        placeholder="DD/MM/YYYY"
        inputMode="numeric"
        error={error ?? undefined}
      />
      <Button variant="primary" size="lg" onClick={handleContinue} disabled={saving}>
        המשך
      </Button>
    </div>
  );
}
```

- [ ] **Step 8: Write `TraitsStep.tsx`**

```tsx
// web/src/app/onboarding/steps/TraitsStep.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ONBOARDING_TRAIT_GROUPS, categoriesForGroup } from '@/utils/onboardingTraits';
import type { TagKey } from '@/utils/profileTags';

export function TraitsStep({ userId, onNext }: { userId: string; onNext: () => void }) {
  const supabase = createClient();
  const [selections, setSelections] = useState<Partial<Record<TagKey, string>>>({});
  const [saving, setSaving] = useState(false);

  function toggle(key: TagKey, value: string) {
    setSelections((prev) => ({
      ...prev,
      [key]: prev[key] === value ? undefined : value,
    }));
  }

  async function finish(save: boolean) {
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ ...(save ? selections : {}), onboarded: true })
      .eq('id', userId);
    setSaving(false);
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-ink">מה מתאר אתכם?</p>
      <p className="text-sm text-body-text">בחרו מה שמתאים — אפשר להוסיף עוד בכל שלב.</p>
      <div className="flex flex-col gap-5 max-h-80 overflow-y-auto">
        {ONBOARDING_TRAIT_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-sm font-medium text-ink mb-2">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {categoriesForGroup(group).flatMap((category) =>
                category.options.map((option) => {
                  const active = selections[category.key] === option.value;
                  return (
                    <button
                      key={`${category.key}-${option.value}`}
                      type="button"
                      onClick={() => toggle(category.key, option.value)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        active ? 'bg-orange text-white' : 'bg-neutral-bg text-ink'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => finish(true)}
        disabled={saving}
        className="w-full px-4 py-2.5 rounded-shutaf-md bg-orange hover:bg-orange-dark text-white font-semibold transition-colors disabled:opacity-50"
      >
        המשך
      </button>
      <button
        type="button"
        onClick={() => finish(false)}
        disabled={saving}
        className="text-sm text-muted-text hover:underline"
      >
        דלג לעכשיו
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Write `ListerFieldStep.tsx`**

```tsx
// web/src/app/onboarding/steps/ListerFieldStep.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button, Input } from '@/components/ui';

export function ListerFieldStep({
  userId,
  field,
  label,
  initialValue,
  skippable,
  onNext,
}: {
  userId: string;
  field: 'name' | 'phone' | 'agency_name';
  label: string;
  initialValue: string;
  skippable: boolean;
  onNext: () => void;
}) {
  const supabase = createClient();
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!skippable && !value.trim()) {
      setError('שדה חובה');
      return;
    }
    setSaving(true);
    const isLastStep = field === 'agency_name';
    const { error: saveError } = await supabase
      .from('profiles')
      .update({ [field]: value.trim() || null, ...(isLastStep ? { onboarded: true } : {}) })
      .eq('id', userId);
    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onNext();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold text-ink">{label}</p>
      <Input
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
      />
      <Button variant="primary" size="lg" onClick={handleContinue} disabled={saving}>
        המשך
      </Button>
    </div>
  );
}
```

- [ ] **Step 10: Write `DoneStep.tsx`**

```tsx
// web/src/app/onboarding/steps/DoneStep.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui';

export function DoneStep({ destination }: { destination: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <Check className="w-10 h-10 text-success" />
      <p className="text-lg font-semibold text-ink">מוכנים!</p>
      <p className="text-sm text-body-text">אפשר להשלים את הפרופיל בכל שלב, מהמסך פרופיל.</p>
      <Button
        variant="primary"
        size="lg"
        className="w-full mt-4"
        onClick={() => {
          router.push(destination);
          router.refresh();
        }}
      >
        {destination === '/compose' ? 'לפרסום הדירה' : 'למסך הגילוי'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 11: Write `OnboardingFlow.tsx`**

```tsx
// web/src/app/onboarding/OnboardingFlow.tsx
'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { getApplicableSteps } from './stepConfig';
import { IntroStep } from './steps/IntroStep';
import { AuthStep } from './steps/AuthStep';
import { ForkStep } from './steps/ForkStep';
import { NameStep } from './steps/NameStep';
import { BirthdateStep } from './steps/BirthdateStep';
import { TraitsStep } from './steps/TraitsStep';
import { ListerFieldStep } from './steps/ListerFieldStep';
import { DoneStep } from './steps/DoneStep';

export function OnboardingFlow({
  userId,
  displayName,
  initialMode,
}: {
  userId: string | null;
  displayName: string;
  initialMode: string | null;
}) {
  const supabase = createClient();
  const [mode, setMode] = useState(initialMode);
  const [cursor, setCursor] = useState(0);
  const steps = getApplicableSteps(userId !== null, mode);
  const step = steps[cursor];
  const destination = mode === 'lister' ? '/compose' : '/discover';

  function advance() {
    setCursor((c) => Math.min(c + 1, steps.length - 1));
  }

  async function handleForkAnswer(resident: boolean) {
    if (!userId) return;
    const newMode = resident ? 'solo' : 'lister';
    await supabase.from('profiles').update({ mode: newMode }).eq('id', userId);
    setMode(newMode);
    setCursor(0);
  }

  return (
    <div className="w-full min-h-screen bg-page-bg flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="h-1.5 bg-neutral-bg rounded-full overflow-hidden mb-8">
          <motion.div
            className="h-full bg-orange rounded-full"
            animate={{ width: `${((cursor + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step.kind}-${cursor}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {step.kind === 'intro' && <IntroStep step={step} onNext={advance} />}
            {step.kind === 'auth' && <AuthStep />}
            {step.kind === 'fork' && <ForkStep onAnswer={handleForkAnswer} />}
            {step.kind === 'name' && userId && (
              <NameStep userId={userId} initialName={displayName} onNext={advance} />
            )}
            {step.kind === 'birthdate' && userId && <BirthdateStep userId={userId} onNext={advance} />}
            {step.kind === 'traits' && userId && <TraitsStep userId={userId} onNext={advance} />}
            {step.kind === 'lister-name' && userId && (
              <ListerFieldStep
                userId={userId}
                field="name"
                label="שם מלא"
                initialValue={displayName}
                skippable={false}
                onNext={advance}
              />
            )}
            {step.kind === 'lister-phone' && userId && (
              <ListerFieldStep
                userId={userId}
                field="phone"
                label="מספר טלפון"
                initialValue=""
                skippable={false}
                onNext={advance}
              />
            )}
            {step.kind === 'lister-agency' && userId && (
              <ListerFieldStep
                userId={userId}
                field="agency_name"
                label="שם הסוכנות (לא חובה)"
                initialValue=""
                skippable
                onNext={advance}
              />
            )}
            {step.kind === 'done' && <DoneStep destination={destination} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Write `page.tsx`**

```tsx
// web/src/app/onboarding/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { OnboardingFlow } from './OnboardingFlow';

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <OnboardingFlow userId={null} displayName="" initialMode={null} />;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode, onboarded, name')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');
  if (profile.onboarded) {
    redirect(profile.mode === 'lister' ? '/compose' : '/discover');
  }

  return <OnboardingFlow userId={user.id} displayName={profile.name} initialMode={profile.mode} />;
}
```

- [ ] **Step 13: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: passes. If `profile.mode`/`phone`/`agency_name` show type errors, Task A's type regeneration didn't land — fix that before continuing here.

- [ ] **Step 14: Commit**

```bash
git add web/package.json web/package-lock.json web/src/app/onboarding
git commit -m "Add the onboarding flow: step config, screens, and container"
```

---

### Task D: `auth/callback` creates the profile row and redirects to `/onboarding`

**Files:**
- Modify: `web/src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `createServerClient` (existing).
- Produces: nothing new consumed elsewhere — this is the entry point Task C's `/onboarding` depends on being reachable from.

**Context:** Currently exchanges the code and redirects straight to `/profile`, with no profile row ever created — see this plan's Goal.

- [ ] **Step 1: Rewrite the route handler**

```typescript
// web/src/app/auth/callback/route.ts
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existing) {
        const metadata = data.user.user_metadata as Record<string, unknown>;
        const displayName =
          (metadata.full_name as string | undefined) ??
          (metadata.name as string | undefined) ??
          data.user.email ??
          'משתמש/ת חדש/ה';
        await supabase.from('profiles').insert({ id: data.user.id, name: displayName });
      }

      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/auth/callback/route.ts
git commit -m "auth/callback: create the profile row on first login, redirect to onboarding"
```

---

### Task E: Gate `(main)` routes on session + `onboarded`

**Files:**
- Modify: `web/src/app/(main)/layout.tsx`

**Interfaces:**
- Consumes: `createServerClient` (existing), `BottomNav` (existing, already imported).

**Context:** Today this layout has zero auth check — Map/Discover/Chats/Compose are all reachable while signed out. This closes that gap and is what actually enforces "not onboarded → `/onboarding`" for the rest of the app.

- [ ] **Step 1: Rewrite as an async server component with the gate**

```tsx
// web/src/app/(main)/layout.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';
import { BottomNav } from '@/components/navigation';

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single();
  if (!profile || !profile.onboarded) redirect('/onboarding');

  return (
    <div className="flex flex-col min-h-screen">
      {/* Main content area */}
      <main className="flex-1 pb-24 md:pb-0">{children}</main>

      {/* Mobile bottom navigation (fixed) */}
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add "web/src/app/(main)/layout.tsx"
git commit -m "Gate (main) routes on session and onboarded status"
```

---

### Task F: Root `page.tsx` — mode-conditional redirect

**Files:**
- Modify: `web/src/app/page.tsx`

**Context:** Currently `redirect('/map')` unconditionally, with no auth check — the contradiction flagged in `DECISIONS.md`'s "already made in code" table after the A4 change.

- [ ] **Step 1: Rewrite**

```tsx
// web/src/app/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('mode, onboarded')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.onboarded) redirect('/onboarding');
  redirect(profile.mode === 'lister' ? '/compose' : '/discover');
}
```

- [ ] **Step 2: Type-check**

```bash
cd web && npx tsc --noEmit
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add web/src/app/page.tsx
git commit -m "Root page: redirect by session and mode instead of hardcoding /map"
```

---

### Task G: Manual end-to-end verification

No automated test can drive real Google OAuth in this environment (same limitation the prior profile-edit plan called out). This is the step for the user to run themselves — walk through it in a real browser against the dev server.

- [ ] **Step 1: Start the dev server and open it**

```bash
cd web && npm run dev
```

Open `http://localhost:3000` in a browser where you can sign in with a real Google account that has never used this app before.

- [ ] **Step 2: Resident path**

1. Confirm it redirects to `/login`, then to `/onboarding` after signing in.
2. Click through the two intro slides, then "המשך עם Google" (already signed in, so this should just re-land you back on `/onboarding` at the fork).
3. Answer "כן, אני גר/ה כאן" — confirm it moves to the name screen with your Google display name already filled in.
4. Type a birth date less than 18 years ago — confirm the inline error blocks continuing. Fix it to a valid adult date — confirm the slashes appeared automatically as you typed and it advances.
5. On the trait screen, select a couple of chips across different groups, hit "המשך" — confirm it lands on the done screen, then "למסך הגילוי" takes you to `/discover`.
6. Reload `/discover` directly — confirm you're not bounced back to onboarding (i.e. `(main)/layout.tsx`'s gate reads `onboarded: true` correctly).
7. In Supabase (`list_tables`/`execute_sql` on `npbduvjnqnbydolmdpsc`, or the dashboard), confirm your `profiles` row has `mode: 'solo'`, `onboarded: true`, `birth_date` set, and whichever tag columns you picked.

- [ ] **Step 3: Non-resident (Lister) path**

Use a second Google account (or delete the `profiles` row for a test account between runs).

1. Repeat steps 1-2 above.
2. Answer "לא, אני מפרסם/ת נכס" — confirm it goes straight to the name field (no birth date, no traits).
3. Leave phone empty and try to continue — confirm the required-field error shows.
4. Fill phone, leave agency name empty, continue — confirm it still finishes (agency is optional) and lands on `/compose`.
5. Confirm the `profiles` row has `mode: 'lister'`, `onboarded: true`, `phone` set, `agency_name: null`.

- [ ] **Step 4: Gating**

1. In an incognito window (no session), try navigating directly to `/map`, `/discover`, `/chats`, `/compose` — confirm every one redirects to `/login`.
2. Sign in as a fresh account, don't finish onboarding, then try navigating directly to `/map` — confirm it redirects to `/onboarding` instead of showing the page.

- [ ] **Step 5: Report back**

Note anything that didn't match — this is a design that's gone through several rounds of user review, so a mismatch here likely means a step in this plan needs a follow-up fix, not a re-litigation of the design.
