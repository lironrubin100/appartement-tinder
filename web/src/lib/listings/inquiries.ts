'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/utils/supabase/server';

export type InquiryActionResult = { ok: true; conversationId?: string } | { ok: false; message: string; code?: 'ACCOUNT_CHANGED' };

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

// Generated types predate the reviewed optional-intro overload. Keep its
// deployed contract local and validate the RPC result before using it.
type IntroInquiryClient = {
  rpc(name: 'create_listing_inquiry', args: { p_apartment_id: string; p_intro: string | null }):
    PromiseLike<{ data: unknown; error: unknown }>;
};

export async function createListingInquiry(apartmentId: string, intro: string | null = null, expectedActorId?: string): Promise<InquiryActionResult> {
  if (typeof apartmentId !== 'string' || !uuid.test(apartmentId)
    || (intro !== null && (typeof intro !== 'string' || intro.length > 1000 || Array.from(intro).length > 500))
    || (expectedActorId !== undefined && (typeof expectedActorId !== 'string' || !uuid.test(expectedActorId)))) {
    return { ok: false, message: 'יש לבחור מודעה תקינה ולהגביל את ההודעה ל־500 תווים.' };
  }
  const supabase = await createServerClient({ noStore: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (expectedActorId !== undefined && user?.id !== expectedActorId) {
    return { ok: false, code: 'ACCOUNT_CHANGED', message: 'החשבון השתנה. רעננו את העמוד לפני שליחה נוספת.' };
  }
  if (!user) return { ok: false, message: 'כדי ליצור קשר צריך להתחבר לחשבון.' };
  const client = supabase as unknown as IntroInquiryClient;
  const { data: inquiryId, error } = await client.rpc('create_listing_inquiry', {
    p_apartment_id: apartmentId, p_intro: intro === '' ? null : intro,
  });
  if (error || typeof inquiryId !== 'string' || !uuid.test(inquiryId)) {
    return { ok: false, message: 'לא הצלחנו לשלוח את הפנייה. נסו שוב בעוד רגע.' };
  }
  const { data: inquiry, error: readError } = await supabase.from('listing_inquiries')
    .select('status,conversation_id').eq('id', inquiryId).eq('requester_id', user.id).maybeSingle();
  if (readError || !inquiry || !['pending', 'accepted'].includes(inquiry.status)) {
    return { ok: false, message: 'לא הצלחנו לאשר את מצב הפנייה. נסו שוב בעוד רגע.' };
  }
  if (inquiry.status === 'accepted') {
    return typeof inquiry.conversation_id === 'string' && uuid.test(inquiry.conversation_id)
      ? { ok: true, conversationId: inquiry.conversation_id }
      : { ok: false, message: 'לא הצלחנו לאשר את מצב הפנייה. נסו שוב בעוד רגע.' };
  }
  for (const path of ['/my-listings', '/en/my-listings', `/listings/${apartmentId}`, `/en/listings/${apartmentId}`]) {
    revalidatePath(path);
  }
  return { ok: true };
}

export async function acceptListingInquiry(inquiryId: string): Promise<InquiryActionResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'כדי לאשר פנייה צריך להתחבר לחשבון.' };
  const { data: conversationId, error } = await supabase.rpc('accept_listing_inquiry', { p_inquiry_id: inquiryId });
  if (error || !conversationId) return { ok: false, message: 'לא הצלחנו לאשר את הפנייה. נסו שוב בעוד רגע.' };
  revalidatePath('/my-listings');
  revalidatePath('/chats');
  return { ok: true, conversationId };
}
