const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function loadDraftServices(client) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
    const requireLocal = id => {
      if (id === 'server-only') return {};
      if (id === 'next/cache') return { revalidatePath: () => {} };
      if (id === '@/utils/supabase/client') return { createClient: () => client };
      if (id === '@/utils/photos') return load(path.resolve('src/utils/photos.ts'));
      if (id === '@/utils/supabase/server') return { createServerClient: async options => {
        if (!options?.noStore) throw new Error('Draft service must request no-store reads');
        return client;
      } };
      if (id.startsWith('@/lib/listings/')) return load(path.resolve('src/lib/listings', id.slice('@/lib/listings/'.length) + '.ts'));
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id + '.ts'));
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(requireLocal, module, module.exports);
    return module.exports;
  }
  return { editor: load(path.resolve('src/lib/listings/editor.ts')), ownerActions: load(path.resolve('src/app/(main)/my-listings/actions.ts')), publishing: load(path.resolve('src/lib/listings/draft-publish.ts')), publication: load(path.resolve('src/lib/listings/publication-contract.ts')), deletionActions: load(path.resolve('src/lib/listings/draft-delete-actions.ts')), deletion: load(path.resolve('src/lib/listings/draft-delete.ts')), actions: load(path.resolve('src/lib/listings/draft-actions.ts')), contract: load(path.resolve('src/lib/listings/draft-service-contract.ts')), media: load(path.resolve('src/lib/listings/draft-media.ts')), mediaActions: load(path.resolve('src/lib/listings/draft-media-actions.ts')), mediaContract: load(path.resolve('src/lib/listings/draft-media-contract.ts')), listingActions: load(path.resolve('src/lib/listings/actions.ts')), imports: load(path.resolve('src/lib/listings/draft-import.ts')), store: load(path.resolve('src/lib/listings/draft-store.ts')) };
}
module.exports = { loadDraftServices };
