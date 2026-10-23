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
      if (id === '@/utils/supabase/server') return { createServerClient: async options => {
        if (!options?.noStore) throw new Error('Draft service must request no-store reads');
        return client;
      } };
      if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id + '.ts'));
      return require(id);
    };
    new Function('require', 'module', 'exports', code)(requireLocal, module, module.exports);
    return module.exports;
  }
  return { actions: load(path.resolve('src/lib/listings/draft-actions.ts')), contract: load(path.resolve('src/lib/listings/draft-service-contract.ts')) };
}
module.exports = { loadDraftServices };
