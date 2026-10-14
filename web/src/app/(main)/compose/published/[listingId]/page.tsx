import { renderPublished } from '../PublishedPage';
export default async function Page({ params }: { params: Promise<{ listingId: string }> }) { return renderPublished((await params).listingId, 'he'); }
