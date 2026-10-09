'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/utils/supabase/server';

export type InquiryActionResult =
  | { ok: true; conversationId?: string }
  | { ok: false; message: string };

export async function createListingInquiry(apartmentId: string): Promise<InquiryActionResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'כדי ליצור קשר צריך להתחבר לחשבון.' };

  const { error } = await supabase.rpc('create_listing_inquiry', { p_apartment_id: apartmentId });
  if (error) return { ok: false, message: 'לא הצלחנו לשלוח את הפנייה. נסו שוב בעוד רגע.' };

  revalidatePath('/my-listings');
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

export async function declineListingInquiry(inquiryId: string): Promise<InquiryActionResult> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'כדי לדחות פנייה צריך להתחבר לחשבון.' };

  const { error } = await supabase
    .from('listing_inquiries')
    .update({ status: 'declined', updated_at: new Date().toISOString() })
    .eq('id', inquiryId)
    .eq('status', 'pending');
  if (error) return { ok: false, message: 'לא הצלחנו לדחות את הפנייה. נסו שוב בעוד רגע.' };

  revalidatePath('/my-listings');
  return { ok: true };
}

export async function sendConversationMessage(conversationId: string, body: string): Promise<InquiryActionResult> {
  const message = body.trim();
  if (!message) return { ok: false, message: 'כתבו הודעה לפני השליחה.' };

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: 'כדי לשלוח הודעה צריך להתחבר לחשבון.' };

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    kind: 'user',
    body: message,
  });
  if (error) return { ok: false, message: 'לא הצלחנו לשלוח את ההודעה. נסו שוב בעוד רגע.' };

  revalidatePath(`/chats/${conversationId}`);
  revalidatePath('/chats');
  return { ok: true };
}
