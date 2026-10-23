import { renderCompose, type ComposeSearchParams } from '../../compose/ComposePage';
export default async function ComposePage({ searchParams }: { searchParams: Promise<ComposeSearchParams> }) { return renderCompose('en', searchParams); }
