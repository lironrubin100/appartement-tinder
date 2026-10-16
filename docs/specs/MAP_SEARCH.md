# Map and address search contract

State: 17 October technical defaults adopted: signed token, manual capture, persisted private-random public point and explicit area search. [TECHNICAL_DEFAULTS](TECHNICAL_DEFAULTS.md) fixes mechanics; provider quality/terms/privacy acceptance require actual evidence. No live address checks performed.

## Approved behavior

- Beer Sheva default focus; allow valid listings in other Israeli cities (A5).
- Apartment-only public entities with available-room price/range (D5/D9).
- Approximate public location, exact only under accepted grant (D4).
- Address autocomplete plus manual-address/map correction fallback (D19).
- Preserve working CARTO tiles/attribution and existing clustering; reconcile current branch/source first, not old prompt's "local-only" assumption.

## Capture contract

Fields: display address entered/confirmed by owner, normalized address components if provider supplies them, exact latitude/longitude, source type `provider` or `manual`, provider/source identifier if applicable, selection timestamp/version and accuracy class (building/street/approximate). Store exact fields privately. A street result is not house-number verification.

Client: accessible combobox; configured min characters/debounce; cancel stale requests and discard out-of-order responses; loading/empty/error/limit state; keyboard navigation, escape and touch selection in RTL/LTR. When user edits text after selection, invalidate the old selection and require reconfirmation or manual correction.

Server: authenticated lookup, length/type/rate checks, provider timeout and normalized response; never relay raw arbitrary provider payload. Provider key server-only. Publish validates finite lat/lon ranges, plausible location/city and consistency of manual confirmation. Do not accept `selected=true` as proof. Provider selection uses a signed actor-bound 15-minute token; manual route is separately allowed, not an attempt to fake provider provenance.

No server rejection solely for outside Beer Sheva. If coordinates indicate another city, clearly confirm city and let user continue. National coverage/future-country rules are separate from the marketing area. Do not expose exact coordinates to other viewers through autocomplete history or shared cache.

## Provider gate

LocationIQ preferred by prior owner notes, but must pass representative Hebrew/English/house-number tests before final adoption. Current official autocomplete documentation omits Hebrew from listed output languages; do not interpret this as proof of failed Hebrew input. If quality fails, report the examples and compare another provider; do not silently accept broken output.

Official public Nominatim policy prohibits autocomplete and caps whole-app traffic at 1/sec. Do not implement typeahead fallback against its public endpoint. A deliberately submitted full-address search would be a distinct candidate subject to policy; proxying/debouncing alone does not grant autocomplete permission.

Sources checked 15 October 2026: https://docs.locationiq.com/docs/autocomplete ; https://operations.osmfoundation.org/policies/nominatim/ ; https://locationiq.com/pricing . Refresh provider terms before implementation. LocationIQ advertised free budget is shared across all users: per-user throttle alone is insufficient; enforce shared provider quota/cache/backoff, dedupe and a circuit breaker rather than a separate in-memory bucket in every server instance.

Outage/missing key/429: keep draft, show manual fallback, preserve user entry; no silent publication with guessed coordinates. No live provider call from tests without target/key authorization. Provider absence blocks live acceptance only, not drafting validators/manual UI.

## Public browse contract

Map query consumes public approximate coordinates only. Bound request size, zoom and filters; detail load uses public listing ID. Return allowlisted pins: ID, approximate coordinates, available room count, min/max price, currency, safe area label. Personal favorite state is a separate user-scoped overlay or nonshared response, never shared-cache leakage.

Default viewport Beer Sheva; user may search another city or move viewport. Distinguish "search this area" from automatic updates; proposed pilot behavior: explicit search-area action after pan to avoid jumping selection, with stable empty/error state. D14/J2/J6 interaction adopted; exact bounds/filters in TECHNICAL_DEFAULTS.

Selection: pin/list card synchronize one selected listing; keyboard access opens equivalent detail; changing filters removes incompatible selection visibly; mobile bottom card does not obscure primary controls. Cluster tap fits child bounds, max-zoom overlap behavior specified in tests (spiderfy/list), no stranded inaccessible pin. Never silently replace current working styling.

Filters: per-room price, total bedrooms, bills included, sublet, available-from (D13). Min/max price matches if at least one available room fits, not merely because apartment price-range endpoints overlap. Define date/bills semantics and invalid range errors. No client-only exclusion that leaks private rows.

## Editing and persistence

Reuse composer validation and photo pipeline. New property means new listing; post-publication ordinary location edits disabled; protected reviewed correction increments location version and rechecks grants. Public approximate pin must remain stable across reloads/ordinary edits, but privacy mechanism must pass the synthetic inversion review. Do not preserve a reconstructible transform merely to keep old coordinates identical.

## Specific verification

1. Named real address suite including Hebrew abbreviations, house number, English transliteration, duplicate street names, partial/nonexistent number and an out-of-city example. Record exact query, result precision/city, selection and correction. Use only verified real examples; do not invent passes.
2. Type short query, rapid query changes, out-of-order responses, keyboard selection, edit after selection and provider 429/timeout/missing key; fallback can publish an explicitly confirmed valid point.
3. Publish two rooms, see correct price-range pin, filter by only one matching room; select/list/detail sync; cluster split/tap; shared public link in both locales.
4. Guest/outsider payload/metadata/cache checks contain no exact point or address; accepted requester sees private location through separate authorized read.
5. Owner outside Beer Sheva can publish; default Beer Sheva search need not show it until city/viewport changes.
6. Ordinary edits keep public representation stable under the approved privacy mechanism. Two concurrent edits detect version conflict. Delete only test fixtures and verify cleanup.

## Stop conditions

Query/pan/privacy/address-edit mechanics adopted; real provider/synthetic privacy/runtime evidence separately gates acceptance, not independent manual capture/validator work. Need approved target before any live schema/provider/config mutation. Existing imported MAP_END_TO_END_PROMPT is superseded as execution instruction by A5/D19 and this review contract.
