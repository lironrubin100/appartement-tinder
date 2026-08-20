import { pathToFileURL } from 'node:url';

const ALLOWED_STUDENT_EMAIL_DOMAINS = ['post.bgu.ac.il', 'bgu.ac.il', 'sce.ac.il'];

export function isStudentEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return false;
  return ALLOWED_STUDENT_EMAIL_DOMAINS.some(
    (allowed) => domain === allowed || domain.endsWith(`.${allowed}`)
  );
}

// Plain-node self-check: `node src/utils/studentEmail.ts` (Node 23.6+ strips
// TS types by default). Runs only when this file is executed directly —
// process.argv[1] is relative to cwd, so it must be resolved to a file URL
// before comparing against the always-absolute import.meta.url.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`FAIL: ${msg}`);
    console.log(`ok: ${msg}`);
  };

  assert(isStudentEmail('student@post.bgu.ac.il') === true, 'post.bgu.ac.il accepted');
  assert(isStudentEmail('prof@bgu.ac.il') === true, 'bgu.ac.il accepted');
  assert(isStudentEmail('a@sce.ac.il') === true, 'sce.ac.il accepted');
  assert(isStudentEmail('a@gmail.com') === false, 'gmail.com rejected');
  assert(isStudentEmail('a@evilbgu.ac.il') === false, 'lookalike domain rejected');
  assert(isStudentEmail('not-an-email') === false, 'malformed input rejected');
  console.log('all studentEmail checks passed');
}
