'use server';

import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServerClient } from '@/utils/supabase/server';

export type OwnerInquiryState = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'unavailable';
export type OwnerInquiryItem = {
  id: string;
  kind: 'individual';
  listing_id: string;
  listing_title: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  state: OwnerInquiryState;
  created_at: string;
  intro: string | null;
  requester: { id: string; name: string | null; photo_url: string | null; public_badges: string[] } | null;
  conversation_id: string | null;
  is_new: boolean;
  viewed_at: string | null;
};
export type OwnerInboxPage = { items: OwnerInquiryItem[]; next_cursor: string | null; has_more: boolean; projection_version: 1 };
export type OwnerInboxError = 'AUTH_REQUIRED' | 'NOT_FOUND' | 'VALIDATION_FAILED' | 'CURSOR_STALE' | 'STATE_UNAVAILABLE' | 'INTERNAL';
export type OwnerInboxResult<T> = { ok: true; data: T } | { ok: false; error: { code: OwnerInboxError; retryable: boolean; correlationId?: string } };
export type OwnerInquiryViewed = { inquiry_id: string; viewed_at: string; is_new: false };

type RpcError = { message: string; code?: string };
type InboxRpcClient = {
  rpc(name: 'list_owner_listing_inquiries', args: { p_listing_id: string | null; p_state: string | null; p_limit: number; p_after_created_at: string | null; p_after_id: string | null }): PromiseLike<{ data: unknown; error: RpcError | null }>;
  rpc(name: 'mark_owner_listing_inquiry_seen', args: { p_inquiry_id: string }): PromiseLike<{ data: unknown; error: RpcError | null }>;
};
type Cursor = { v: 1; source: 1; actor: string; query: string; expires: number; createdAt: string; id: string };
const ttl = 30 * 60 * 1000;
const states = ['pending', 'accepted', 'declined', 'withdrawn', 'unavailable'];
const isId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const timestamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
const nullableText = (value: unknown): value is string | null => value === null || typeof value === 'string';
const onlyKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).every(key => keys.includes(key));

function failure<T>(code: OwnerInboxError, retryable = false): OwnerInboxResult<T> {
  return { ok: false, error: { code, retryable, ...(code === 'INTERNAL' ? { correlationId: randomUUID() } : {}) } };
}
function rpcFailure<T>(error: RpcError): OwnerInboxResult<T> {
  if (error.message === 'AUTH_REQUIRED' || error.message === 'NOT_FOUND' || error.message === 'VALIDATION_FAILED') return failure(error.message);
  return failure('INTERNAL', true);
}

// Reuse existing server-only signing material with a distinct HMAC domain.
// Draft tokens cannot validate here, and inquiry tokens cannot validate there.
function signature(payload: string, key: string) {
  return createHmac('sha256', key).update(`shutaf:owner-listing-inbox:v1:${payload}`).digest();
}
function signCursor(last: { createdAt: string; id: string }, actor: string, query: string, key: string) {
  const cursor: Cursor = { v: 1, source: 1, actor, query, expires: Date.now() + ttl, ...last };
  const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
  return `${payload}.${signature(payload, key).toString('base64url')}`;
}
function readCursor(token: string, actor: string, query: string, key: string): Cursor | null {
  try {
    if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
    const [payload, supplied] = token.split('.');
    const actual = Buffer.from(supplied, 'base64url'), expected = signature(payload, key);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const cursor: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const now = Date.now();
    if (!record(cursor) || !onlyKeys(cursor, ['v', 'source', 'actor', 'query', 'expires', 'createdAt', 'id'])
      || cursor.v !== 1 || cursor.source !== 1 || cursor.actor !== actor || cursor.query !== query
      || typeof cursor.expires !== 'number' || !Number.isSafeInteger(cursor.expires) || cursor.expires <= now || cursor.expires > now + ttl
      || !timestamp(cursor.createdAt) || !isId(cursor.id)) return null;
    return cursor as Cursor;
  } catch { return null; }
}

function decodeItem(value: unknown): OwnerInquiryItem {
  if (!record(value) || !onlyKeys(value, ['id', 'kind', 'listing_id', 'listing_title', 'status', 'state', 'created_at', 'intro', 'requester', 'conversation_id', 'is_new', 'viewed_at'])
    || !isId(value.id) || value.kind !== 'individual' || !isId(value.listing_id) || typeof value.listing_title !== 'string'
    || typeof value.status !== 'string' || !['pending', 'accepted', 'declined', 'withdrawn'].includes(value.status)
    || typeof value.state !== 'string' || !states.includes(value.state) || !timestamp(value.created_at)
    || !nullableText(value.intro) || typeof value.intro === 'string' && Array.from(value.intro).length > 500
    || !(value.conversation_id === null || isId(value.conversation_id)) || value.status !== 'accepted' && value.conversation_id !== null
    || typeof value.is_new !== 'boolean' || !(value.viewed_at === null || timestamp(value.viewed_at))
    || value.is_new !== (value.viewed_at === null)
    || value.status === 'pending' && !['pending', 'unavailable'].includes(value.state)
    || value.status !== 'pending' && value.state !== value.status) throw new Error('INVALID_INBOX_ITEM');
  const sender = value.requester;
  if (sender !== null && (!record(sender) || !onlyKeys(sender, ['id', 'name', 'photo_url', 'public_badges'])
    || !isId(sender.id) || !nullableText(sender.name) || !nullableText(sender.photo_url)
    || !Array.isArray(sender.public_badges) || !sender.public_badges.every(badge => typeof badge === 'string'))) throw new Error('INVALID_INBOX_SENDER');
  // Never forward the original RPC object or any unreviewed private fields.
  return {
    id: value.id, kind: 'individual', listing_id: value.listing_id, listing_title: value.listing_title,
    status: value.status as OwnerInquiryItem['status'], state: value.state as OwnerInquiryState,
    created_at: value.created_at, intro: value.intro,
    requester: sender === null ? null : { id: sender.id as string, name: sender.name as string | null, photo_url: sender.photo_url as string | null, public_badges: [...sender.public_badges as string[]] },
    conversation_id: value.conversation_id, is_new: value.is_new, viewed_at: value.viewed_at,
  };
}

export async function listOwnerListingInquiries(input: unknown = {}): Promise<OwnerInboxResult<OwnerInboxPage>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    if (!record(input) || !onlyKeys(input, ['listingId', 'state', 'limit', 'cursor'])) return failure('VALIDATION_FAILED');
    const { listingId: rawListingId = null, state = 'all', limit = 20, cursor = null } = input;
    if (!(rawListingId === null || isId(rawListingId)) || typeof state !== 'string' || !['all', ...states].includes(state)
      || typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 50
      || !(cursor === null || typeof cursor === 'string')) return failure('VALIDATION_FAILED');
    const listingId = rawListingId === null ? null : rawListingId.toLowerCase();
    const queryHash = createHash('sha256').update(JSON.stringify({ listingId, state, limit, order: 'created_at.desc,id.desc', source: 1 })).digest('hex');
    const key = process.env.LISTING_DRAFT_CURSOR_SECRET?.trim() ?? '';
    if (key.length < 32) return failure('STATE_UNAVAILABLE');
    const after = cursor === null ? null : readCursor(cursor, user.id, queryHash, key);
    if (cursor !== null && after === null) return failure('CURSOR_STALE');
    // Generated types predate 6.23/6.24. Validate their deployed response here.
    const rpc = client as unknown as InboxRpcClient;
    const { data, error } = await rpc.rpc('list_owner_listing_inquiries', {
      p_listing_id: listingId, p_state: state === 'all' ? null : state, p_limit: limit,
      p_after_created_at: after?.createdAt ?? null, p_after_id: after?.id ?? null,
    });
    if (error) return rpcFailure(error);
    if (!record(data) || !onlyKeys(data, ['items', 'next_cursor', 'has_more', 'projection_version'])
      || !Array.isArray(data.items) || data.items.length > limit || typeof data.has_more !== 'boolean' || data.projection_version !== 1) return failure('INTERNAL', true);
    const items = data.items.map(decodeItem), last = items.at(-1);
    if (new Set(items.map(item => item.id)).size !== items.length || items.some(item => listingId !== null && item.listing_id !== listingId || state !== 'all' && item.state !== state)) return failure('INTERNAL', true);
    if (data.has_more && (items.length !== limit || !last || !record(data.next_cursor) || !onlyKeys(data.next_cursor, ['created_at', 'id'])
      || data.next_cursor.id !== last.id || data.next_cursor.created_at !== last.created_at)
      || !data.has_more && data.next_cursor !== null) return failure('INTERNAL', true);
    return { ok: true, data: { items, next_cursor: data.has_more && last ? signCursor({ createdAt: last.created_at, id: last.id }, user.id, queryHash, key) : null,
      has_more: data.has_more, projection_version: 1 } };
  } catch { return failure('INTERNAL', true); }
}

export async function markOwnerListingInquiryViewed(inquiryId: unknown): Promise<OwnerInboxResult<OwnerInquiryViewed>> {
  try {
    const client = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return failure('AUTH_REQUIRED');
    if (!isId(inquiryId)) return failure('VALIDATION_FAILED');
    const rpc = client as unknown as InboxRpcClient;
    const { data, error } = await rpc.rpc('mark_owner_listing_inquiry_seen', { p_inquiry_id: inquiryId.toLowerCase() });
    if (error) return rpcFailure(error);
    if (!record(data) || !onlyKeys(data, ['inquiry_id', 'viewed_at', 'is_new']) || data.inquiry_id !== inquiryId.toLowerCase()
      || !timestamp(data.viewed_at) || data.is_new !== false) return failure('INTERNAL', true);
    return { ok: true, data: { inquiry_id: data.inquiry_id, viewed_at: data.viewed_at, is_new: false } };
  } catch { return failure('INTERNAL', true); }
}
