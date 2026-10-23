'use server';
import { createServerClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { validListingId } from '@/lib/listings/public';
import { getOwnedListingEditModel, type ListingEditorResult } from '@/lib/listings/editor';

export async function markListingRented(id: string): Promise<{ error: string | null }> {
  if (!validListingId(id)) return { error: 'מודעה לא תקינה.' };
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'יש להתחבר מחדש.' };
  const { data, error } = await supabase.from('apartments').update({ status: 'taken' })
    .eq('id', id).eq('lister_id', user.id).eq('source', 'user').eq('status', 'active').select('id').maybeSingle();
  if (error || !data) return { error: 'לא הצלחנו לעדכן את המודעה. רעננו ונסו שוב.' };
  revalidatePath('/my-listings');
  revalidatePath('/map');
  revalidatePath(`/listings/${id}`);
  revalidatePath(`/en/listings/${id}`);
  return { error: null };
}

// Shared owner reader for the later private edit-draft and form callers.
export async function loadOwnedListingForEdit(id: string, expectedAccountId?: string): Promise<ListingEditorResult> {
  return getOwnedListingEditModel(id, expectedAccountId);
}
