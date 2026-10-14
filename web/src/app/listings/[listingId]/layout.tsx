import { getPublicListing } from '@/lib/listings/public';
// Validate outside the page's loading boundary, before a 200 can be streamed.
export default async function ListingLayout({ children, params }: { children: React.ReactNode; params: Promise<{ listingId: string }> }) {
  await getPublicListing((await params).listingId);
  return children;
}
