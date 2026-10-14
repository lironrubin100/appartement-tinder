import { renderPublished } from '@/app/(main)/compose/published/PublishedPage';
export default async function PublishedPage({ params }: { params: Promise<{ listingId: string }> }) { return renderPublished((await params).listingId, 'en'); }
