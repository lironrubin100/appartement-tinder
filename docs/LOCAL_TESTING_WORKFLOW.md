# Local isolated test target

Use [TESTING](TESTING.md#local-backend-setup) for the maintained local bootstrap caveat and fixture commands, and [EXECUTION_PROTOCOL](EXECUTION_PROTOCOL.md) for target/data/ownership authorization. This reference adds no separate startup read or approval gate.

Prefer a uniquely named/ported local Supabase target with synthetic seeds and ordinary-client/browser checks. Never reset the shared target. Check actual Docker access and migration baseline first; a missing runtime blocks the named local assertion, not unrelated implementation. The historical bootstrap/Storage-origin workaround is not a migration to publish. Keep target configuration/credentials private and label PGlite, local Supabase, fake-service contracts and hosted acceptance separately.
