# סיכום מימוש, בדיקות ופרסום — 19–20 באוקטובר 2026

מסמך זה מרכז את העבודה בשיחה ואת הראיות לכל טענה. מקור מדיניות המוצר הוא [DECISIONS](../../DECISIONS.md); מצב הביצוע נשמר גם ב־[רשם הביצוע](../planning/execution-state.json). תיעוד זה אינו מסמן את כל תוכנית ה־MVP כהושלמה.

## הגרסה שפורסמה בפועל

| פריט | ערך מאומת |
| --- | --- |
| אתר חי | https://appartement-tinder.vercel.app |
| גרסת הפרסום | `2877c38a21e2b183805451a265354a19aa64faf2` על `origin/master` |
| מימוש פרופילים | `39fdcee4982bc8184181dc7cf4d061f4402b93c0` |
| מימוש צ׳אט וחוזים | `95f333bb5d7587122e9e72a9296b48bd14e3f3e0` |
| פריסת Production | `dpl_CmU7JB992cBpTMvRf4DivtAcHZGA`, מצב `READY` |
| אימות שיוך הדומיין | 20 באוקטובר 2026; פתרון הדומיין דרך Vercel החזיר את הפריסה וה־SHA לעיל |
| יעד Supabase | `npbduvjnqnbydolmdpsc` |

9 בדיקות הדפדפן הורצו מול האתר החי כשמימוש האפליקציה היה ב־39fdcee. גרסת2877c38 מוסיפה תיעוד והתאמת סביבת הבדיקות בלבד; `git diff 39fdcee 2877c38 -- web/src supabase` ריק. לאחר העלאת2877c38 נבדקו שוב שני מסכי הכניסה והפניית callback בטוחה — שלוש בדיקות HTTP עברו. בדיקת הדומיין חזרה על זיהוי הפריסה גם בזמן ביקורת התיעוד.

פריסה ידנית כפולה `dpl_DTDorKxoo8J1mv15cK4RCJGJtjio` בוטלה לאחר שהפריסה האוטומטית של אותוSHA כבר נבנתה. היא אינה הגרסה המשרתת את הדומיין. `latestDeployment` לפי זמן יצירה עשוי להציג אותה; אימות הגרסה החיה נעשה לפי הדומיין עצמו.

## מה מומש

| תחום | התנהגות שבוצעה | מצב / גבול |
| --- | --- | --- |
| צ׳אט — SL08.1 | סמני קריאה לפי רצף שרת, קידום מונוטוני ומוגבל לרצף מורשה; ללא ספירת הודעות עצמיות/אירועי מערכת; סימון קריאה אחרי הצגה בחלון גלוי וממוקד; עדכון תיבת שיחות, השלמה לאחר ניתוק ומניעת כפילויות בניסיון חוזר | מומש, נבדק ופורסם. הקלדה, עזיבה וקבלות קריאה רחבות יותר שייכות ל־SL08.2 |
| חוזים משותפים — SL00.2 | manifest ל־31 קטגוריות מאושרות; עובדות והעדפות נפרדות, תרגומי HE/EN, הבחנה בין לא נענה לבין אין, התאמה שמרנית לערכי עבר; רישום תצורה תחום ורשימת ערכים ציבוריים | מומש ונבדק. קוד חישוב ההתאמה ב־JavaScript משמש כ־oracle לבדיקות בלבד; לא הוחלף מנגנון דירוג הייצור ולא שונתה תצורה גלובלית חיה |
| השלמת פרופיל דייר | שם, גיל18+, תמונה בבעלות המשתמש, ביו וארבע עובדות חובה: ניקיון, שינה, אירוח ועישון; עובדות נוספות בהדרגה; טיוטה/טעינה מחדש/עריכה | מומש ונבדק בדפדפן וב־API; דייר שכבר הושלם אינו יכול לרוקן תנאי השלמה דרך עריכה |
| פרטיות ו־Discover | שם מלא ב־profile_private; בציבור שם פרטי ואות משפחה; העדפות ותאריך לידה/טלפון נשארים פרטיים; עובדות מוצגות רק לפי בחירת חשיפה מפורשת; אין הסקת חשיפה או עובדות זהות ממידע ישן | תצוגות אדם וקבוצה ובקשת היכרות עם הפניה למאפיין קנוני נבדקו; גישות משתמש זר לטבלאות הבעלים נדחו |
| חשבון מפרסם | קליטה קצרה עם הצהרת18+, טלפון פרטי וסוכנות אופציונלית; עריכת שם/קשר ב־RPC עם revision ומפתח ניסיון חוזר; שינוי בחירת קליטה מותר בטיוטה בלבד | הושלם ונבדק. מפרסם שהושלם לא מקבל יכולת דייר דרך ה־RPC; מעבר דייר→מפרסם שומר נתונים פרטיים ומסרב כשיש חברות בקבוצה |
| גלריית פרופיל | העלאה אמיתית, גלריה, תמונה ראשית וסדר; בדיקת owner/bucket/path/origin מול Storage; מניעת כתיבת URL סמכותי ישירה ומחיקת התמונה האחרונה גם דרך Storage API | נבדקו קבצי PNG/JPEG אמיתיים ובייטים שחזרו מ־Storage. אין טענה לפענוח תמונה או למודרציה אוטומטית בשרת |
| הגדרות ושפות | עריכת פרופיל, העדפות מסך פתיחה, הודעות/תוויות הגדרות ויציאה בעברית ובאנגלית; ה־startup נשמר לאחר טעינה מחדש | נבדק ב־390px באנגלית ובמחשב בעברית; אין כאן טענה שכל מסך ישן באפליקציה תורגם מחדש |
| אמינות כתיבות | שמירת פרופיל אטומית, נעילת בעלים, expected revision, תוצאת ניסיון חוזר יציבה, סירוב למפתח ממוחזר עם תוכן אחר ושמירה על נתונים בהמרה | בדיקות תחרות/CAS, rollback, retry ושמירת נתונים עברו |
| סביבת עבודה ונתוני דמה | בורר העבודה מקבל נתיבי Windows/POSIX; נשמרו הוראות בעלים לאישור חשבונות דמה/פרסום שגרתי; כלי פינוי מפורש בודק יעד, מזהים ותלויות לפני הסרת Storage | לא נוצר checkout נוסף. פינוי הנתונים לא הופעל — בעל המוצר ביקש לשמור הדגמות |

## מסד הנתונים — קבצי מקור מול היסטוריה חיה

הקבצים ההיסטוריים אינם משנים שם לפי חותמת הזמן שניתנה בשרת. לפני כל שינוי עתידי יש לבדוק את היסטוריית היעד ולא להחיל אותם שוב.

| קובץ מקור | גרסה חיה | שינוי |
| --- | --- | --- |
| `supabase/migrations/20261019210659_monotonic_chat_read_markers.sql` | `20261019211840` | רצף קריאה מונוטוני, inbox תואם, RPC לשליחה עם request key ועדכוני membership |
| `supabase/migrations/20261019212059_resident_adult_validation.sql` | `20261019212312` | גיל18+ בהשלמת דייר ושמירה על הכלל בעדכון DOB ישיר |
| `supabase/migrations/20261019214904_canonical_resident_profiles.sql` | `20261019215717` | טבלאות עובדות/העדפות ותוצאות retry, RPC דייר/מפרסם, שם פרטי מלא, הצהרת גיל, גלריה ו־Storage guards, projection ו־intro קנוניים |
| `supabase/migrations/20261019215827_allow_incomplete_intake_correction.sql` | `20261019215905` | תיקון בחירת מסלול בטיוטה, תוך שמירת האיסור על חזרה של מפרסם שהושלם לדייר |

הטבלאות החדשות: `profile_lifestyle`, `profile_lifestyle_private`, `profile_save_requests`. נוספו `profile_private.full_name` ו־`adult_confirmed_at`. העדכונים הסמכותיים מתבצעים דרך RPC; לקוח אינו מקבל כתיבה ישירה לטבלאות החדשות. פירוט ממשקי ה־RPC והפרטיות נמצא ב־[DATA_CONTRACTS](../specs/DATA_CONTRACTS.md).

## מה נבדק ובאיזה יעד

| בדיקה | תוצאה ויעד | מקור ראיה |
| --- | --- | --- |
| חוזים ובורר עבודה | 12 בדיקות חוזים +8 בדיקות בורר =20 עברו, חזרה ב־20 באוקטובר | `scripts/test-contracts.mjs`, `scripts/test-next-work.mjs` |
| מסד קנוני ב־PGlite | התאמת53 אפשרויות ותרחישי חובה/גיל/תמונה/פרטיות/revision/retry/מפרסם/קבוצה/הפניות; עברו | `scripts/test-canonical-profile-sql.mjs`; PGlite אינו תחליף לשרת חי |
| קליטת דייר חדשה | HE1280px ו־EN390px: טיוטה, רענון, JPEG בבעלות, חובה, חשיפה, העדפות ועריכה;2 עברו | `web/e2e/canonical-profile.spec.ts`; שרת Next מקומי + Supabase משותף,19 באוקטובר |
| קליטת מפרסם חדשה | בדיקה מתוקנת על חשבון נפרד;1 עברה ב־9.1 שניות | אותו קובץ, שרת production מקומי שנבנה + Supabase משותף; לא טענה על דפדפןProductionחדש |
| מסלולי API קנוניים | 9 קבוצות תרחישים עברו על חשבונות מדויקים3–8 בלבד | `.qa/profile/acceptance.json` פרטי; `web/scripts/qa-canonical-profile.mjs` |
| Storage — תמונה אחרונה | מחיקת שורת הגלריה והאובייקט סורבו; GET ללא cache החזיר200 ואותם בייטים; חשבון נפרד | `.qa/photo-guard/acceptance.json` פרטי; `web/scripts/qa-profile-photo-guard.mjs` |
| Discover והיכרות | שם מקוצר, תווית קנונית והפניה אמיתית נשמרו;1 עברה | `web/e2e/canonical-discovery.spec.ts`;19 באוקטובר, Next מקומי + יעד משותף |
| דפדפן באתר החי | **9/9 עברו ב־1.6 דקות ב־20 באוקטובר**:2 צ׳אט HE/EN,3 פרופיל/מפרסם/הגדרות/יציאה,4 אורח/אימות/יעד חזרה | שלושת הקבצים `profile-persistence.spec.ts`, `chat-unread.spec.ts`, `resident-auth-guest.spec.ts` |
| הרשאות צ׳אט רגילות | 4 קבוצות תרחישים עברו שוב ב־20 באוקטובר; חסימה זמנית מדויקת הוסרה | `web/scripts/qa-chat-authorization.mjs`; `.qa/chat-authorization.json` פרטי |
| פרטיות פרופיל לאחר פרסום | 4 קבוצות תרחישים עברו: ארבע טבלאות בעלים חסומות לזר, projection מצומצם, שם מלא שמור לבעלים ותמונה אמיתית200 | `.qa/profile/release-review-20261020.json` פרטי; בדיקת לקוח רגיל,20 באוקטובר |
| גיל לפי שעון השרת | ב־20 באוקטובר2008-10-21 סורב ללא שינוי,2008-10-20 התקבל; retry יציב, DOB המקורי הוחזר | `web/scripts/qa-canonical-age.mjs`; `.qa/profile/age-boundary.json` פרטי |
| בנייה/סוגים/lint | build Production, TypeScript ו־lint ממוקד עברו; בודק התכנון ו־diff whitespace עברו | handoff הפרופילים,20 באוקטובר |
| בדיקה לאחר הפרסום הסופי | שני מסכי כניסה200 ו־callback חיצוני307 למסך כניסה פנימי;3 עברו | `.qa/release-20261020.json` פרטי; finalSHA2877c38 |
| תצפית Vercel | לא הוחזרו קבוצות runtime error/fatal בפריסת39fdcee בחלון15 הדקות של הביקורת | שאילתת לוגים20 באוקטובר; אין טענה לניטור רציף או לבדיקת עומס |

כישלונות מוקדמים בסביבת הדפדפן/סלקטורים/ציפיית ניווט תועדו ב־handoffs ותוקנו; אינם נספרים כהצלחות. כלי ההרצה והפקודות המדויקות מרוכזים ב־[TESTING](../TESTING.md). ראיות מסכמות אלה נשמרות ב־Git; credentials, session state, traces, SQL provisioning ומזהי fixtures מלאים נשארים בקבצים מתעלמים בלבד.

## משתמשי דמה, סביבת בדיקה ואישור עבודה

- נשמרו20 חשבונות סינתטיים:9 צ׳אט/גיל קודמים,9 קנוניים,1 לבדיקת התמונה האחרונה ו־1 לקליטת מפרסם סופית. נשמרו7 תמונות, שיחות וקבוצה שימושיות. בביקורת20 באוקטובר:0 חסימות זמניות ו־0 דיירים קנוניים שהושלמו ללא תמונה בבעלותם.
- מניפסטים פרטיים: `web/.env.qa.local`, `web/.env.profile-qa.local`, `web/.env.photo-guard-qa.local`, `web/.env.lister-final-qa.local`; מזהים/מטרה/יעד ב־`web/.qa/**/run.json`. אין סיסמאות במסמך או ב־Git. אין להמיר משתמש דמה שנשמר ל־fixture חדש באמצעות איפוס הרסני.
- אין משתמשי אמת עד שהבעלים מודיע אחרת; יצירת דמה ופרסום שגרתי מאושרים לפי [AGENTS](../../AGENTS.md). אין אישור לתשלום, למחיקה לא קשורה או לשכתוב היסטוריית Git.
- Docker/Postgres המקומי נכשל בחילוץ image עקב מקום ו־vfs; לא הותקן יעד Supabase מקומי תקין. המיגרציות נבדקו ב־PGlite ולאחר אימות יעד/בעלות/מצב נתונים הוחלו על היעד המשותף המאושר. אין לשנות תצורה גלובלית כדי לעקוף בדיקה.
- לאחר דחייה אוטומטית של שינוי אמון הדפדפן, הבעלים אישר במפורש שימוש בתעודת ה־proxy המנוהל לצורך הבדיקות. הדפדפן הופעל באותו הקשר הרשאות עם אימות TLS פעיל. חידוש הסביבה דרש התקנת Xvfb מקומית ב־/tmp ושימוש ב־Chromium151 המותקן; לא נעשה שינוי במכשיר משתמש או בייצור.
- כלי פינוי מפורש כולל `prepare-cleanup --discard-fixtures`, אימות זהות/יעד ותלויות, ולאחריו מחיקה ב־Storage דרך משתמש הבעלים. הוא לא הופעל על ההדגמות שנשמרו.

## מה עדיין לא הושלם

- **כניסה אינטראקטיבית מלאה דרך Google:** לא בוצעה. התחלת OAuth החזירה302 ל־accounts.google.com; אין בכך הוכחת consent/callback עם חשבון אמיתי. לכן SL01.2 נשאר `verification-incomplete`, למרות שהמימוש הקנוני פורסם ונבדק.
- **פרסום דירה — SL02.1:** זוהו בקריאת קוד חובת טלפון שגויה לדייר, היעדר מפתח retry עמיד וטיוטה/overlay חסרים. לא בוצע מימוש שלהם בשיחה; הם רשומים ב־[KNOWN_ISSUES](../KNOWN_ISSUES.md). אין שינוי בתלויות התוכנית כדי להציג אותם כהושלמו.
- **SL08.2 / SL07 / SL15:** הקלדה/עזיבה וקבלות קריאה רחבות, אלגוריתם דירוג הייצור ומסירת אימות סטודנט אמיתי לא הושלמו במסגרת זו. מצב יתר החבילות נותר ברשם הביצוע.
- **פער קטן בספירת אורך טקסט:** לקוח JavaScript סופר UTF16 והשרת Unicode codepoints. ממשק המשתמש עשוי להיות מחמיר יותר בטקסט עשיר באימוג׳י. הפער זוהה בקריאת קוד, אינו פער הרשאות, ולא תוקן כאן.
- אזהרות אבטחה קיימות לא הוצגו כפתורות. נוספו notices צפויים עבור שניRPCמוגנים למשתמש מחובר וטבלת תוצאות retries ללא גישה ישירה; endpoints אנונימיים לא הורחבו. פירוט והשוואת counts ב־handoff.

## מפת כיסוי לקבצים ששונו

הרשימה להלן מכסה את כל הקבצים בטווח `git diff c2df149 2877c38 --name-only`, כולל קבצי תיעוד. כל קובץ מופיע בקבוצה אחת. זהו מיפוי שינויים, לא טענה שכל הקובץ נכתב מחדש או שכל תחום המוצר הושלם.

### מדיניות, סטטוס וראיות

- [AGENTS.md](<../../AGENTS.md>)
- [PROJECT_STATUS.md](<../../PROJECT_STATUS.md>)
- [docs/KNOWN_ISSUES.md](<../../docs/KNOWN_ISSUES.md>)
- [docs/TESTING.md](<../../docs/TESTING.md>)
- [docs/WORKTREE_INVENTORY.md](<../../docs/WORKTREE_INVENTORY.md>)
- [docs/planning/execution-state.json](<../../docs/planning/execution-state.json>)
- [docs/workstreams/2026-10-19-cloud-mvp-progress.md](<../../docs/workstreams/2026-10-19-cloud-mvp-progress.md>)
- [docs/workstreams/2026-10-19-sl01-canonical-profile.md](<../../docs/workstreams/2026-10-19-sl01-canonical-profile.md>)

### בורר המשך עבודה

- [scripts/next-work.mjs](<../../scripts/next-work.mjs>)
- [scripts/test-next-work.mjs](<../../scripts/test-next-work.mjs>)

### מיגרציות וסוגי מסד

- [supabase/migrations/20261019210659_monotonic_chat_read_markers.sql](<../../supabase/migrations/20261019210659_monotonic_chat_read_markers.sql>)
- [supabase/migrations/20261019212059_resident_adult_validation.sql](<../../supabase/migrations/20261019212059_resident_adult_validation.sql>)
- [supabase/migrations/20261019214904_canonical_resident_profiles.sql](<../../supabase/migrations/20261019214904_canonical_resident_profiles.sql>)
- [supabase/migrations/20261019215827_allow_incomplete_intake_correction.sql](<../../supabase/migrations/20261019215827_allow_incomplete_intake_correction.sql>)
- [web/src/types/database.ts](<../../web/src/types/database.ts>)

### חוזים משותפים והפקת schema

- [scripts/generate-profile-schema.mjs](<../../scripts/generate-profile-schema.mjs>)
- [scripts/lib/scoring-reference.mjs](<../../scripts/lib/scoring-reference.mjs>)
- [web/src/lib/contracts/config.ts](<../../web/src/lib/contracts/config.ts>)
- [web/src/lib/contracts/taxonomy.ts](<../../web/src/lib/contracts/taxonomy.ts>)

### מימוש צ׳אט

- [web/src/app/(main)/chats/InboxSync.tsx](<../../web/src/app/(main)/chats/InboxSync.tsx>)
- [web/src/app/(main)/chats/[conversationId]/ChatThread.tsx](<../../web/src/app/(main)/chats/[conversationId]/ChatThread.tsx>)
- [web/src/app/(main)/chats/page.tsx](<../../web/src/app/(main)/chats/page.tsx>)

### ממשקי פרופיל, מפרסם, הגדרות ו־Discover

- [web/src/app/(main)/discover/DiscoverClient.tsx](<../../web/src/app/(main)/discover/DiscoverClient.tsx>)
- [web/src/app/(main)/profile/edit/EditProfileForm.tsx](<../../web/src/app/(main)/profile/edit/EditProfileForm.tsx>)
- [web/src/app/(main)/profile/edit/page.tsx](<../../web/src/app/(main)/profile/edit/page.tsx>)
- [web/src/app/(main)/profile/page.tsx](<../../web/src/app/(main)/profile/page.tsx>)
- [web/src/app/(main)/settings/DefaultHomeSelect.tsx](<../../web/src/app/(main)/settings/DefaultHomeSelect.tsx>)
- [web/src/app/(main)/settings/NotificationsToggle.tsx](<../../web/src/app/(main)/settings/NotificationsToggle.tsx>)
- [web/src/app/(main)/settings/page.tsx](<../../web/src/app/(main)/settings/page.tsx>)
- [web/src/app/onboarding/page.tsx](<../../web/src/app/onboarding/page.tsx>)
- [web/src/app/onboarding/resident-onboarding.tsx](<../../web/src/app/onboarding/resident-onboarding.tsx>)
- [web/src/components/profile/ResidentFields.tsx](<../../web/src/components/profile/ResidentFields.tsx>)
- [web/src/components/profile/ResidentProfileForm.tsx](<../../web/src/components/profile/ResidentProfileForm.tsx>)
- [web/src/lib/resident-profile.ts](<../../web/src/lib/resident-profile.ts>)

### בדיקות, fixtures וסביבת הרצה

- [scripts/local-chat-baseline.mjs](<../../scripts/local-chat-baseline.mjs>)
- [scripts/test-canonical-profile-sql.mjs](<../../scripts/test-canonical-profile-sql.mjs>)
- [scripts/test-contracts.mjs](<../../scripts/test-contracts.mjs>)
- [scripts/test-resident-age.mjs](<../../scripts/test-resident-age.mjs>)
- [scripts/test-resident-sql.mjs](<../../scripts/test-resident-sql.mjs>)
- [web/e2e/canonical-discovery.spec.ts](<../../web/e2e/canonical-discovery.spec.ts>)
- [web/e2e/canonical-fixture.ts](<../../web/e2e/canonical-fixture.ts>)
- [web/e2e/canonical-profile.spec.ts](<../../web/e2e/canonical-profile.spec.ts>)
- [web/e2e/chat-unread.spec.ts](<../../web/e2e/chat-unread.spec.ts>)
- [web/e2e/lister-conversion.spec.ts](<../../web/e2e/lister-conversion.spec.ts>)
- [web/e2e/profile-persistence.spec.ts](<../../web/e2e/profile-persistence.spec.ts>)
- [web/e2e/resident-auth-guest.spec.ts](<../../web/e2e/resident-auth-guest.spec.ts>)
- [web/e2e/resident-live.spec.ts](<../../web/e2e/resident-live.spec.ts>)
- [web/package.json](<../../web/package.json>)
- [web/playwright.config.ts](<../../web/playwright.config.ts>)
- [web/scripts/qa-canonical-age.mjs](<../../web/scripts/qa-canonical-age.mjs>)
- [web/scripts/qa-canonical-profile.mjs](<../../web/scripts/qa-canonical-profile.mjs>)
- [web/scripts/qa-chat-authorization.mjs](<../../web/scripts/qa-chat-authorization.mjs>)
- [web/scripts/qa-fixtures.mjs](<../../web/scripts/qa-fixtures.mjs>)
- [web/scripts/qa-profile-photo-guard.mjs](<../../web/scripts/qa-profile-photo-guard.mjs>)
- [web/scripts/qa-resident-age.mjs](<../../web/scripts/qa-resident-age.mjs>)

## מסמכי המשך מפורטים

- [צ׳אט, חוזים וגיל — handoff](../workstreams/2026-10-19-cloud-mvp-progress.md)
- [פרופילים קנוניים — handoff](../workstreams/2026-10-19-sl01-canonical-profile.md)
- [מצב משותף עדכני](../../PROJECT_STATUS.md)
- [תוכנית עבודה](../WORK_PLAN.md)
