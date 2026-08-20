# Supabase SSR Client Setup

This directory contains the Supabase client configurations for the Shutaf app, following the Next.js App Router SSR pattern.

## Files

- **client.ts**: Browser client for Client Components. Use this in interactive components that run in the browser.
- **server.ts**: Server Component client for Server Components. Use this in server-side components and route handlers.
- **admin.ts**: Admin/service-role client for privileged operations (auth, user creation). Only use on the server.

## Usage

### In a Client Component

```typescript
'use client';

import { createClient } from '@/utils/supabase';

export default function MyComponent() {
  const supabase = createClient();

  async function fetchListings() {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .eq('status', 'active');

    if (error) console.error(error);
    return data;
  }

  return <div>My Component</div>;
}
```

### In a Server Component

```typescript
import { createServerClient } from '@/utils/supabase/server';

export default async function Page() {
  const supabase = await createServerClient();

  const { data: listings } = await supabase
    .from('apartments')
    .select('*')
    .eq('status', 'active');

  return <div>{listings?.length} listings</div>;
}
```

### In a Route Handler (Server)

```typescript
import { createServerClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('apartments')
    .select('id, title, price');

  return NextResponse.json({ data, error });
}
```

### For Admin Operations (Server Only)

```typescript
import { createAdminClient } from '@/utils/supabase/admin';

export async function createUser(email: string, password: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  return { data, error };
}
```

## Environment Variables

Required in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: The anonymous key for browser clients
- `SUPABASE_SERVICE_ROLE_KEY`: The service role key (server-only, never expose to client)

See `.env.example` for a template.

## Security Notes

- **Browser client** uses the anonymous key and respects RLS policies
- **Server client** uses the anonymous key but has more flexibility
- **Admin client** uses the service role key and bypasses RLS — use sparingly for administrative operations only
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- All database access goes through RLS policies defined in the Supabase console

## RLS Philosophy

Per ARCHITECTURE.md §4: **RLS is an authorization boundary, not a query planner.** Reads that need filtering, ranking, or pagination go through RPCs. RLS only answers "may this user touch this row at all."
