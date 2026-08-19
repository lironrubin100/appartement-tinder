# Roomie — שותפים ודירות בבאר שבע

React Native (Expo) + Supabase. Hebrew/RTL, single-city MVP.

## Run it

```bash
cd mobile
npm start
```

`mobile/.env` already points at the live Supabase project (`roomie-beersheva`, eu-central-1).

**The Map tab needs a development build** — `expo-maps` is a native module and does not run in Expo Go:

```bash
npx eas build --profile development --platform android
```

Discover, Chats and Profile work in Expo Go today.

## Before sign-in works
Enable the providers in the Supabase dashboard → Authentication → Providers:
- **Google** — needs an OAuth client ID + secret from Google Cloud Console
- **Apple** — needs a Services ID from the Apple Developer portal (iOS only)

Then add `roomie://` to Authentication → URL Configuration → Redirect URLs.

## Layout
```
mobile/src/app/       screens (expo-router)
mobile/src/lib/       supabase client + session context
supabase/schema.sql   tables
supabase/rls.sql      row level security, views, RPCs
PRD.md                product spec — §9 lists the open decisions
```

Both SQL files are already applied to the live project. Re-running them from scratch requires a fresh database.
