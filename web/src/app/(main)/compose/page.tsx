import { renderCompose, type ComposeSearchParams } from './ComposePage';
export default async function Page({ searchParams }: { searchParams: Promise<ComposeSearchParams> }) { return renderCompose('he', searchParams); }
