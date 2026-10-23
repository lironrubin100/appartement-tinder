import { renderMyListings } from '../../my-listings/MyListingsPage';
import type { DraftSearchParams } from '@/components/listings/ListingDraftSection';
export default async function MyListingsPage({ searchParams }: { searchParams: Promise<DraftSearchParams> }) {
  return renderMyListings('en', searchParams);
}
