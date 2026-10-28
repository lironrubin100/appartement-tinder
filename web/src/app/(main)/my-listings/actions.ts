'use server';
import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { validListingId } from '@/lib/listings/public';
import { getOwnedListingEditModel, type ListingEditorResult } from '@/lib/listings/editor';

type StatusResult = { error: null; status: 'active' | 'taken'; revision: number }
  | { error: 'INVALID_LISTING' | 'AUTH_REQUIRED' | 'STATE_UNAVAILABLE' | 'FAILED' };

async function changeListingStatus(id: string, status: 'active' | 'taken'): Promise<StatusResult> {
  if (typeof id !== 'string' || !validListingId(id)) return { error: 'INVALID_LISTING' };
  try {
    const supabase = await createServerClient({ noStore: true });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return { error: 'AUTH_REQUIRED' };
    const listingId = id.toLowerCase();
    const client = supabase as unknown as {
      rpc(name: 'set_owned_listing_status', args: { p_listing_id: string; p_status: 'active' | 'taken' }):
        PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
    const { data, error } = await client.rpc('set_owned_listing_status', { p_listing_id: listingId, p_status: status });
    if (error) return { error: error.message === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED'
      : ['STATE_UNAVAILABLE', 'NOT_FOUND'].includes(error.message) ? 'STATE_UNAVAILABLE' : 'FAILED' };
    if (!data || typeof data !== 'object' || Array.isArray(data)
      || !('listingId' in data) || data.listingId !== listingId || !('status' in data) || data.status !== status
      || !('revision' in data) || typeof data.revision !== 'number' || !Number.isInteger(data.revision) || data.revision < 0 || data.revision > 2147483647
      || !('pendingReconfirmationCount' in data) || typeof data.pendingReconfirmationCount !== 'number'
      || !Number.isSafeInteger(data.pendingReconfirmationCount) || data.pendingReconfirmationCount < 0) return { error: 'FAILED' };
    for (const prefix of ['', '/en']) for (const path of ['/my-listings', '/map', '/listings', `/listings/${listingId}`]) revalidatePath(prefix + path);
    return { error: null, status, revision: data.revision };
  } catch { return { error: 'FAILED' }; }
}

export async function markListingRented(id: string): Promise<StatusResult> {
  return changeListingStatus(id, 'taken');
}

export async function reopenListing(id: string): Promise<StatusResult> {
  return changeListingStatus(id, 'active');
}

// Shared owner reader for the later private edit-draft and form callers.
export async function loadOwnedListingForEdit(id: string, expectedAccountId?: string): Promise<ListingEditorResult> {
  return getOwnedListingEditModel(id, expectedAccountId);
}

type RoomAvailabilityResult = { error: 'INVALID_ROOM' | 'AUTH_REQUIRED' | 'FAILED' | null };
type RoomAvailabilityRpc = {
  rpc(name: 'set_owned_room_availability', args: { p_room_id: string; p_is_available: boolean }): PromiseLike<{ data: unknown; error: unknown }>;
};

function validRoomAvailabilityResponse(value: unknown, roomId: string, available: boolean): value is { listingId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const summary = value as Record<string, unknown>;
  const count = summary.availableRoomCount;
  const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  return typeof summary.listingId === 'string' && validListingId(summary.listingId)
    && summary.roomId === roomId && summary.isAvailable === available
    && integer(count) && integer(summary.revision) && integer(summary.pendingReconfirmationCount)
    && (count === 0
      ? summary.minRoomPrice === null && summary.maxRoomPrice === null
      : integer(summary.minRoomPrice) && integer(summary.maxRoomPrice)
        && (summary.minRoomPrice as number) > 0
        && (summary.maxRoomPrice as number) >= (summary.minRoomPrice as number));
}

export async function setOwnedRoomAvailability(roomId: string, available: boolean): Promise<RoomAvailabilityResult> {
  if (typeof roomId !== 'string' || !validListingId(roomId) || typeof available !== 'boolean') return { error: 'INVALID_ROOM' };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'AUTH_REQUIRED' };
  const id = roomId.toLowerCase();
  // Narrow deployed RPC contract: the generated database type predates task4.4.
  const { data, error } = await (supabase as unknown as RoomAvailabilityRpc).rpc('set_owned_room_availability', {
    p_room_id: id, p_is_available: available,
  });
  if (error || !validRoomAvailabilityResponse(data, id, available)) return { error: 'FAILED' };
  for (const prefix of ['', '/en']) {
    revalidatePath(`${prefix}/my-listings`);
    revalidatePath(`${prefix}/map`);
    revalidatePath(`${prefix}/listings/${data.listingId}`);
  }
  return { error: null };
}

type ListingIntakeResult = { error: 'INVALID_LISTING' | 'AUTH_REQUIRED' | 'FAILED' | null };
type ListingIntakeRpc = {
  rpc(name: 'set_owned_listing_intake', args: { p_listing_id: string; p_is_open: boolean }): PromiseLike<{ data: unknown; error: unknown }>;
};

function validListingIntakeResponse(value: unknown, listingId: string, open: boolean): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const summary = value as Record<string, unknown>;
  const integer = (v: unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
  return summary.listingId === listingId && summary.intakeOpen === open
    && integer(summary.revision) && integer(summary.pendingReconfirmationCount);
}

export async function setOwnedListingIntake(listingId: string, open: boolean): Promise<ListingIntakeResult> {
  if (typeof listingId !== 'string' || !validListingId(listingId) || typeof open !== 'boolean') return { error: 'INVALID_LISTING' };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'AUTH_REQUIRED' };
  const id = listingId.toLowerCase();
  // Narrow deployed contract: generated types predate task4.17.
  const { data, error } = await (supabase as unknown as ListingIntakeRpc).rpc('set_owned_listing_intake', {
    p_listing_id: id, p_is_open: open,
  });
  if (error || !validListingIntakeResponse(data, id, open)) return { error: 'FAILED' };
  for (const prefix of ['', '/en']) {
    revalidatePath(`${prefix}/my-listings`);
    revalidatePath(`${prefix}/map`);
    revalidatePath(`${prefix}/listings/${id}`);
  }
  return { error: null };
}
