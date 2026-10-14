import { PublicListing } from '@/components/listings/PublicListing';
import { listingMetadata } from '@/lib/listings/public';
type Props = { params: Promise<{ listingId: string }> };
export async function generateMetadata({ params }: Props) { return listingMetadata((await params).listingId, 'en'); }
export default async function ListingPage({ params }: Props) { return <PublicListing id={(await params).listingId} locale="en" />; }
