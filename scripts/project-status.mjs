// Read-only Git inventory; --write saves a snapshot in the calling checkout.
// --shared saves it in the primary checkout, where all linked worktrees find it.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const exec = promisify(execFile);
async function git(args, cwd = process.cwd()) {
  const { stdout } = await exec('git', args, { cwd, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
  return stdout.trimEnd();
}
const root = (await git(['rev-parse', '--show-toplevel'])).trim();
const blocks = (await git(['worktree', 'list', '--porcelain'], root)).trim().split(/\r?\n\r?\n/);
const worktrees = blocks.map((block) => Object.fromEntries(block.split(/\r?\n/).map((line) => {
  const at = line.indexOf(' ');
  return at < 0 ? [line, true] : [line.slice(0, at), line.slice(at + 1)];
})));
const primary = worktrees[0].worktree;
const integrationRef = worktrees[0].branch?.replace('refs/heads/', '') ?? 'master';
let cachedRemote = 'unavailable';
try { const remote = (await git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], root)).trim(); cachedRemote = `${remote} at ${(await git(['rev-parse', '--short', remote], root)).trim()}`; }
catch { /* Local integration facts remain useful without a remote. */ }
async function integrated(commit) {
  try { await git(['merge-base', '--is-ancestor', commit, integrationRef], root); return 'Yes'; }
  catch (error) { return error.code === 1 ? 'No' : 'Unknown'; }
}
// Small batches avoid starting one process for every worktree at once.
for (let offset = 0; offset < worktrees.length; offset += 4) {
  await Promise.all(worktrees.slice(offset, offset + 4).map(async (tree) => {
    try {
      const status = (await git(['status', '--porcelain=v1', '--untracked-files=normal'], tree.worktree)).split(/\r?\n/).filter(Boolean);
      tree.dirty = status.length ? `${status.filter((line) => !line.startsWith('??')).length} tracked; ${status.filter((line) => line.startsWith('??')).length} untracked entries` : 'Clean';
      tree.headline = await git(['log', '-1', '--format=%s'], tree.worktree);
      tree.integrated = await integrated(tree.HEAD);
    } catch { tree.dirty = 'Could not read'; tree.integrated = 'Unknown'; tree.headline = 'Check this checkout directly'; }
  }));
}
const branchLines = (await git(['for-each-ref', '--format=%(refname:short)\t%(objectname:short)\t%(upstream:short)', 'refs/heads'], root)).split(/\r?\n/).filter(Boolean);
const branches = await Promise.all(branchLines.map(async (line) => {
  const [name, head, upstream] = line.split('\t');
  return { name, head, upstream: upstream || 'None', integrated: await integrated(head) };
}));
const escape = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/[\r\n]/g, ' ');
const table = (headers, rows) => [headers, headers.map(() => '---'), ...rows].map((row) => `| ${row.map(escape).join(' | ')} |`).join('\n');
const updated = new Date().toISOString();
const local = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jerusalem' }).format(new Date());
const markdown = `# Git branch and worktree inventory\n\nGenerated: ${local} (Asia/Jerusalem); ${updated}.\n\nPrimary checkout: ${primary}. Comparison: local integration branch \`${integrationRef}\`. Cached GitHub reference: ${cachedRemote}; this script does not fetch or infer deployment state.\n\nThis snapshot reports Git facts, not whether a feature works. Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and its handoffs for acceptance evidence. A contained HEAD can still have unmerged local changes. Detached means the checkout has no branch name. A lock is a Git worktree lock, not proof a chat is currently running.\n\n## Worktrees\n\n${table(['Checkout','Branch','HEAD','Local changes','HEAD in '+integrationRef+'?','Git lock'],worktrees.map((tree)=>[tree.worktree,tree.branch?.replace('refs/heads/','') ?? '(detached)',tree.HEAD?.slice(0,8),tree.dirty,tree.integrated,tree.locked ?? 'No']))}\n\n## Local branches\n\n${table(['Branch','HEAD','Upstream','HEAD in '+integrationRef+'?'],branches.map((branch)=>[branch.name,branch.head,branch.upstream,branch.integrated]))}\n\n## Last commit descriptions (context only)\n\n${table(['Checkout','Last commit description'],worktrees.map((tree)=>[tree.worktree,tree.headline]))}\n\nRefresh with \`node scripts/project-status.mjs --write\` in the primary checkout, or \`node scripts/project-status.mjs --write --shared\` from a linked worktree. This only reads Git and writes this Markdown snapshot; it never stages, commits, checks out, fetches, merges, pushes, deploys or removes a worktree.\n`;
if (process.argv.includes('--write')) {
  const destinationRoot = process.argv.includes('--shared') ? primary : root;
  const destination = resolve(join(destinationRoot, 'docs', 'WORKTREE_INVENTORY.md'));
  await mkdir(join(destinationRoot, 'docs'), { recursive: true });
  await writeFile(destination, markdown, 'utf8');
  process.stdout.write(`Updated ${destination}\n${worktrees.length} worktrees; ${branches.length} local branches.\n`);
} else { process.stdout.write(markdown); }
