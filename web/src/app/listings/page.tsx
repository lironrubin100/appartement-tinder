import { PublicListingCatalog } from '@/components/listings/PublicListingCatalog';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{page?:string}>}){
 const {page}=await searchParams;return <PublicListingCatalog locale="he" page={page}/>;
}
