import { renderMyListings } from './MyListingsPage';
import type { DraftSearchParams } from '@/components/listings/ListingDraftSection';
export default async function Page({ searchParams }: { searchParams: Promise<DraftSearchParams> }) {
  return renderMyListings('he', searchParams);
}
