# תכנית מימוש סדרתית — Shutaf

עודכן:25באוקטובר2026. DECISIONS.md הוא מקור מדיניות המוצר. תיבה ריקה אינה טענה שהקוד חסר; בודקים מה כבר עובד ומשלימים רק את החסר.

## הוראות ביצוע

הכניסה היחידה היא docs/START_NEXT_WORK.md; נוהל העבודה, בדיקות, הרשאות, דיווח ועצירה נמצא ב־docs/EXECUTION_PROTOCOL.md וב־AGENTS.md. קרא רק את המשימה שנבחרה, ההחלטות והחוזה הרלוונטיים. עדכון בעלים25באוקטובר: מתקדמים בתור המאושר בלי אישור ידני אחרי כל משימה; עוצרים בחסם, בהחלטה חדשה או בפעולה קריטית. בקשה מפורשת עכשווית למשימה אחת נשארת מוגבלת לה.

שלב א׳ הוא מסלול הדגמה עובד עם נתונים סינתטיים; שלב ב׳ משלים MVP ועמידות; שלב ג׳ הוא תכנון נדחה, ללא אישור מימוש. הרשאות ופרטיות הן חלק מהמסלול הרגיל. משימות טכניות קשורות יכולות להיבדק כתוצאה שימושית אחת, אך כל מזהה וסימון נשמרים ואינם מחליפים אימות חבילה. קדימות בעלים מפורשת נרשמת במטא־דאטה הקיים, בלי למחוק או לסמן משימות שלא בוצעו.

הנתיבים יחסיים לשורש; אפליקציה תחת web. שם migration במשימה הוא יעד מתוכנן בלבד: התאם לשם CLI שנוצר ולמצב החי לפני כתיבת SQL; אל תשנה היסטוריה. אין צורך לקרוא את כל ספריית התכנון בכל משימה.

## שלב א׳ — ליבה זמינה להצגה

### SL00 — בסיס ממוקד

חוזים לקריאה: AGENTS, PROJECT_STATUS, EXECUTION_PROTOCOL. אין סריקה מחדש של כל הענפים.

- [X] **משימה 0.1: התאמת מקור ובעלות**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/implementation-plan-SL00.md`.
  - **הוראות טכניות ברורות:** זהה primary דרך git worktree list; השווה את הרשמים המקומיים/הראשי, HEAD, dirty files ומקור תכונות הליבה. רשום מי מחזיק SL02 ומה ניתן להכין ללא נגיעה בעבודתו.
  - **קריטריון קבלה:** רשומים checkout/SHA, בעלות והבדלי מצב. מקור חסר אינו מסומן כלא ממומש; אין שינוי בקוד או ב־Git history.

- [X] **משימה 0.2: הרצת גרסת הבסיס**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/implementation-plan-SL00.md`, `docs/KNOWN_ISSUES.md`.
  - **הוראות טכניות ברורות:** הרץ TypeScript ו־build מתוך web, ואז שרת בבעלותך. נסה חשבון דמו מורשה קיים. רשום רק תקלות שמונעות מסך/שמירה/שיחה; יתר הפערים ל־KNOWN_ISSUES עם שיוך שלב ב׳.
  - **קריטריון קבלה:** השרת מזוהה ועמוד ליבה נפתח; תוצאות build/types בפועל רשומות, גם אם חסומות. אין עצירה לטובת ספק התראות או Google כאשר כניסת הדמו הקיימת עובדת.

- [X] **משימה 0.3: מפת חוזים למסלול הליבה**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/implementation-plan-SL00.md`.
  - **הוראות טכניות ברורות:** רשום טבלה ממוקדת: UI→action→RPC→טבלאות עבור publish, inquiry, accept, group, send message, share card. בדוק חתימות ממקור/יעד מזוהים בקריאה בלבד; ציין אילו RPC חסרים באמת.
  - **קריטריון קבלה:** לכל פעולה בהמשך יש שם/חתימה קיימים או צורך בהרחבה; אין הוראה לדרוס חתימה עובדת או להחיל SQL כפול.


- [X] **משימה 0.7: הכנת חשבונות QA קבועים ותרחיש בסיס**
  - **קבצים לעריכה/יצירה:** `web/scripts/qa-fixtures.mjs`, `web/scripts/qa-pool.mjs`, `web/scripts/test-qa-fixtures.mjs`, `docs/TESTING.md`.
  - **הוראות טכניות ברורות:** התאם לשימוש חוזר בתשתית הקיימת ובמניפסט שלוש הזהויות שהוכן ב־web/.qa/room44-pool; אל תיצור cohort חלופי. מפה owner/accepted_requester/pending_requester לתפקיד הנדרש בכל בדיקה. הגדר baseline לפרופילים מלאים ותמונה אמיתית בגודל צפייה, provenance, target ומזהי actor יציבים במניפסט פרטי; missing/drift מדווחים, לא מרופאים ביצירת חשבון. ensure/run אינם יוצרים/מוחקים חשבון או משנים סיסמה. setup חי אושר במפורש ב־25 באוקטובר אבל שייך רק ל־0.11; אין כתיבה חיה בכרטיס זה ואין שימוש בדמו התצוגה כ־QA mutable.
  - **קריטריון קבלה:** בדיקת helper חוזרת משתמשת באותם IDs ובאותם credentials, overlap נחסם ו־drift מדווח; הכנה מקומית אינה מוצגת כהתחברות חיה. העדף reuse של בדיקות c24502e במקום מימוש מחדש.

- [x] **משימה 0.8: ניקוי נתוני תרחיש QA בלי מחיקת החשבונות**
  - **קבצים לעריכה/יצירה:** `web/scripts/qa-fixtures.mjs`, `web/scripts/qa-pool.mjs`, `web/scripts/test-qa-pool.mjs`, `docs/TESTING.md`.
  - **הוראות טכניות ברורות:** אחרי 0.7 הוסף journal פרטי לנתוני run שנוצרו: group/listing/inquiry/conversation/media IDs בלבד. תחת lease, cleanup מחזיר baseline רק למשאבי ה־run, עם guard שכל owner/member/invitee/requester/participant הוא QA המורשה ושאין peer/cascade לא ידוע. אין reset לפרופילים/סיסמאות או delete של accounts/Storage metadata. כשל משמר journal וחוסם rerun עד recovery; אין public reset endpoint. בכרטיס זה בדיקות מבודדות בלבד; הקבלה החיה בשתי ריצות שייכת ל־0.9 אחרי הכנת המאגר המלא ב־0.11.
  - **קריטריון קבלה:** בדיקה מבודדת של create→cleanup→create על אותם IDs עוברת; outside participant או ID שאינו של ה־run מונעים את כל הניקוי. כשל באמצע נשמר ומשוחזר באופן מדויק; החשבונות/הפרופילים והדמו אינם נמחקים.

- [x] **משימה 0.9: קבלת שתי הרצות קבוצות ופניות על אותם חשבונות**
  - **קבצים לעריכה/יצירה:** `web/e2e/qa-reuse.spec.ts`, `web/scripts/test-qa-fixtures.mjs`, `docs/TESTING.md`, `docs/workstreams/implementation-plan-SL00.md`.
  - **הוראות טכניות ברורות:** אחרי 0.8 ו־0.11, ב־backend מבודד מזוהה או npbduvjnqnbydolmdpsc תחת אישור הבעלים25באוקטובר למאגר הסינתטי המדויק, הרץ פעמיים עם ordinary actors: יצירת קבוצה, פנייה/אישור, guard teardown ואז baseline. אין תלות ביכולת משתמש admin לצאת מקבוצה ואין שימוש בדמו כתשתית QA mutable. בדוק גם interruption/recovery; עצור על הרשאה/מפתח חסרים במקום ליצור cohort נוסף. רשום מיפוי role→ID וקבלות קיימות כדי שהמבצע הבא יקבל manifest ופקודה, בלי ליצור fixtures מחדש.
  - **קריטריון קבלה:** שתי הרצות אמיתיות מסתיימות על אותו סט actor IDs; כל run data הוסר/שוחזר במדויק, אין שאריות לא צפויות, profiles/passwords נשמרו ו־outsider נדחה. mock/PGlite אינם מוצגים כקבלה זו.

- [x] **משימה 0.13: תיקון חתימת עמוד ההגדרות החוסמת אימות טיפוסים**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/settings/page.tsx`, `web/src/app/(main)/settings/SettingsContent.tsx`, `web/src/app/en/(main)/settings/page.tsx`, `web/src/app/(main)/settings/LanguageStatus.tsx`, `web/src/app/(main)/settings/PrivacySummary.tsx`, `web/src/app/(main)/settings/DeleteAccountNotice.tsx`.
  - **הוראות טכניות ברורות:** תקלה SETTINGS-PAGE-TYPE-001 שאומתה במהלך0.9: הפרד תוכן משותף של Settings מרכיב ברירת המחדל של route. עמודי HE/EN יישארו wrappers בעלי חתימת Next תקינה; localeOverride יישאר prop פנימי בלבד. קרא page convention של גרסת Next המותקנת. בדיקת הפיקסלים מצאה גם שלושה panels בעברית בתוך EN; העבר locale לפי I16/I18 לתצוגת השפה, סיכום הפרטיות והודעת המחיקה, ותקן את קישור עריכת הפרופיל לשפה הנוכחית. שמור auth וכל הפעולות/העיצוב; תצוגת שפה אינה כפתור החלפה חדש, והודעת מחיקה אינה מימוש מחיקה. אין שינוי DB/config או מדיניות.
  - **קריטריון קבלה:** TypeScript, lint ממוקד ו־build עוברים; משתמש QA רגיל פותח Settings ב־HE/EN ובטלפון/מחשב, עם כותרת ופקדים בשפה הנכונה אחרי reload. אין שינוי העדפה או פעולת מחיקה. לאחר התיקון חוזרים לקבלת0.9, בלי לסמן את מסעות המוצר האחרים כמאומתים.

- [x] **משימה 0.11: הכנת המאגר החי עם פרופילים מלאים ותמונות**
  - **קבצים לעריכה/יצירה:** `web/scripts/qa-fixtures.mjs`, `web/scripts/qa-pool.mjs`, `web/scripts/test-qa-fixtures.mjs`, `docs/TESTING.md`.
  - **הוראות טכניות ברורות:** אחרי0.7 השתמש במניפסט שלוש הזהויות הקיים ב־web/.qa/room44-pool, לא במניפסט ארבעת דמו התצוגה. הבעלים25באוקטובר מאשר setup חד־פעמי של אותן זהויות ב־npbduvjnqnbydolmdpsc ונתונים סינתטיים; המפתח המקומי כבר הוגדר. בדוק target/history/ownership והיעדר ID/email collision לפני כל כתיבה. אם החשבונות כבר קיימים בדוק credentials ו־reuse, בלי reset אוטומטי. השלמת שם/גיל בגיר/ביוגרפיה/עובדות והעדפות תקינות ותמונה מתוך assets שנבדקו דרך ordinary owner routes לאחר provisioning מורשה. secrets וקבלות נשארים ignored. חשבונות אחרים ודמו התצוגה אינם משתנים; בלי schema/config או קניית ספק.
  - **קריטריון קבלה:** שלוש זהויות יציבות עוברות ordinary login, baseline מלא והצגת תמונה תקינה; public projection אינו חושף DOB/phone/preferences. ensure וריצה חוזרת שומרים אותם IDs/credentials וללא כפילות media; שמירת פרטי baseline וקבלות במניפסט מאפשרת למבצע חדש להשתמש בחשבון בלי הכנה נוספת. HE/EN ו־390px/desktop נבדקו לפרופילים בפועל או נרשם חסם מדויק בלי לסמן הושלם.

- [x] **משימה 0.12: הסרת דמו חלקי מהתצוגה עם שימור התאוששות**
  - **קבצים לעריכה/יצירה:** `web/scripts/qa-fixtures.mjs`, `web/scripts/test-qa-fixtures.mjs`, `docs/TESTING.md`, `docs/workstreams/implementation-plan-SL00.md`.
  - **הוראות טכניות ברורות:** אחרי0.11 מפה בקריאה בלבד חשבונות ונכסים סינתטיים ישנים בלי תמונה תקינה או baseline מלא; URL לבדו אינו ראיה לתמונה תקינה ויש לזהות1x1/placeholders. השתמש ב־exact-ID manifest פרטי עם סיבה, target, snapshot והפניות תלויות, ו־dry-run ללא mutation. שמור את שלושת החשבונות שאינם marked-test (כולל מועמדי liron/Noa), ארבעת הדמו המלאים, מאגר QA החדש, retained manifests וכל actor בבעלות פעילה. בעלים מאשר הסרת דמו חלקי; תחילה הסרה הפיכה מגילוי/רשימות דרך מנגנוני סטטוס קיימים, בלי פילטר מוצר חדש, מחיקת Auth/שיחות/Storage או שינוי חשבון לא מסווג. אם אין דרך קיימת ובטוחה להסתיר פרופיל/נכס, רשום את הבחירה החסרה במקום למחוק לצמיתות. recheck counts/IDs/ownership מיד לפני apply; אין sweep לפי domain בלבד ואין cascade בלתי ידוע. עדכון בעלים26October: כל פרופיל אדם/דירה שהטקסט הציבורי שלו מכיל Synthetic הוגדר כנתון בדיקה ישן שמותר למחוק; אין צורך במחיקה גורפת כדי להשיג גילוי נקי. הוסף להסתרה ההפיכה גם רשומות אלו, אף אם הן מופיעות במניפסט בדיקות ישן; הרשאת Synthetic זו גוברת על שימור אותו דמו ישן. שמור תמיד את שלושת חשבונות ה־QA החדשים וקשרים הנחוצים ל־baseline שלהם, אמת שאין בעלות מבצע מתחרה, והשאר סטטוס שכבר אינו מוצג ללא שינוי. האישור המצומצם לאימות תמונות/טביעות/הגנה ולשמירת ראיות מקומיות ניתן במפורש; שמור את מזהי המועמדים והמצב לפני/אחרי בפרטיות.
  - **קריטריון קבלה:** רשומות שסווגו חלקיות אינן מופיעות בגילוי/מפה אחרי reload; נכסים/חשבונות מלאים והמאגר נשארים נגישים ופועלים. מספרי before/after וה־exact IDs תואמים לתוכנית שנשמרה, rollback על snapshot מבודד מוכח, dry-run שני ללא שינויים מיותרים, וללא פגיעה בהיסטוריה/חשבונות שמורים. חשבון לא מסווג נשאר untouched עם סיבה.

- [x] **משימה 0.10: קבלת סביבת בדיקות מוכנה למבצע הבא**
  - **קבצים לעריכה/יצירה:** `docs/TESTING.md`, `docs/workstreams/implementation-plan-SL00.md`, `PROJECT_STATUS.md`, `docs/planning/execution-state.json`.
  - **הוראות טכניות ברורות:** אחרי0.7/0.11/0.8/0.9/0.12 חבר את הראיות הקיימות: מבצע חדש מקבל role manifest ופקודת run, בוחר חשבונות מוכנים ואינו יוצר נתונים מאפס. תעד באותו TESTING את baseline, lease, התרחיש, cleanup/recovery והחריג לבדיקות pristine. אין מסמך onboarding נוסף. סגירת הקדימות הזמנית מחזירה לתור המאושר;16.35 נשארת חסומה על כתובת ולא מסומנת כבוצעה.
  - **קריטריון קבלה:** כל משימות ההכנה והתיקון הטכני עם ראיות מלאות; smoke של מבצע חדש משתמש במאגר הקיים, מזהה drift/lease, מריץ תרחיש פעמיים בלי חשבון נוסף ומשאיר baseline. אפליקציה אינה מציגה את הדמו החלקי שסווג להסרה; profile/browser/API/cleanup evidence מובחנים. סגור owner_priority_override רק אחרי קבלה, בלי לסמן את SL00/SL16 כולו כאומת.

### SL01 — כניסה ופרופילים הדרושים לליבה

חוזים: B10/I9/I19/I22, DATA_CONTRACTS. פרופיל קנוני כבר מתועד כממומש; ראשית מאמתים שימוש חוזר.

- [X] **משימה 1.1: כניסה לחשבון מורשה קיים**
  - **קבצים לעריכה/יצירה:** `web/src/app/login/EmailPasswordForm.tsx`, `web/src/app/auth/callback/route.ts`, `web/e2e/resident-auth-guest.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק כניסה ויציאה של fixture קיים וחזרה לנתיב פנימי; תקן רק כשל שמונע זאת. שמור את מסלולי Google/email הקיימים.
  - **קריטריון קבלה:** כניסה רגילה והחזרה לעמוד מבוקש עוברות בדפדפן; הקישורים בעברית ובאנגלית נשמרים. אין דרישה לסבב Google אמיתי במשימה זו.

- [X] **משימה 1.2: שימוש בטופס הדייר הקיים**
  - **קבצים לעריכה/יצירה:** `web/src/app/onboarding/resident-onboarding.tsx`, `web/src/components/profile/ResidentProfileForm.tsx`, `web/e2e/canonical-profile.spec.ts`.
  - **הוראות טכניות ברורות:** חבר/תקן רק את מינימום I9 שכבר מאושר: שם, גיל 18+, תמונה בבעלות, bio וארבע קטגוריות. השתמש ב־save_resident_profile הקיים, בלי שאלון חדש.
  - **קריטריון קבלה:** חשבון סינתטי משלים טופס, נטען שוב ונכנס ל־Discover; טיוטה קיימת אינה נדרסת. אם הקוד עובד, תעד בדיקה בלבד.

- [X] **משימה 1.3: מסלול מפרסם קצר ופתיחת הבית**
  - **קבצים לעריכה/יצירה:** `web/src/app/onboarding/resident-onboarding.tsx`, `web/src/utils/navigation.ts`, `web/src/app/page.tsx`.
  - **הוראות טכניות ברורות:** אמת branch של מפרסם ללא lifestyle, שם/הצהרת גיל/טלפון פרטי, ופתיחת My Listings; דייר פותח Discover או העדפה קיימת. תקן רק routing/קליטה שבורים.
  - **קריטריון קבלה:** מפרסם נכנס ל־My Listings ויכול להגיע ל־Map/Discover בלי שאלון דייר; דייר מגיע למסך המוגדר לו.

- [x] **משימה 1.4: כרטיס אדם בטוח לשימוש בקבוצה**
  - **קבצים לעריכה/יצירה:** `web/src/components/discovery/SwipeCard.tsx`, `web/src/utils/profileTags.ts`.
  - **הוראות טכניות ברורות:** צרוך projection ציבורי קיים: שם תצוגה, תמונה, bio ועובדות שנחשפו. הצג labels HE/EN מה־manifest; אל תוסיף private select כדי להשלים כרטיס.
  - **קריטריון קבלה:** כרטיס מופיע עם עובדה מאושרת; אין טלפון/תאריך לידה מלא/תקציב פרטי בנתוני הכרטיס.


### ניהול הדירות שלי — קדימות בעלים / SL04.2

קדימות ניהול בעלים מאושרת. המצב והמשימה הבאה נגזרים מהסימונים ומבורר המשימות; אין להסיק אותם מהיסטוריית checkout. חוזה מחייב: `docs/specs/LISTING_MANAGEMENT.md`. אבן דרך זו משלבת subset של SL02/SL04/SL06; השלמתה אינה משלימה את ההורים. רשימת הקבצים בכל משימה היא הרשאת הכתיבה שלה, כולל נתיבים חדשים מתוכננים. לפני UI תלוי RPC יש לאמת יעד מורשה מעודכן; רכיב עצמאי יכול להישאר לא מחובר עד אז.

- [x] **משימה 4.9: שחזור מסלול הבעלות הקיים**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/implementation-plan-SL04.md`, `docs/KNOWN_ISSUES.md`.
  - **הוראות טכניות ברורות:** בדוק דייר מפרסם ומפרסם שאינו דייר: כניסה לניהול, טעינת מודעות לפי lister_id, פתיחת מודעה שלהם והכפתור המוצג. תעד יעד, מקור תקלה ונתיב לכל ממצא, ללא תיקון קוד. אמת התחברות ופרסום קיימים מתוך ראיות SL01/SL02 העדכניות; אם prerequisite ממשי חסר, תעד אותו לפני חיבור UI.
  - **קריטריון קבלה:** לכל דיווח רשום שוחזר/לא שוחזר, חשבון סינתטי ויעד. אין הסקת חוסר בעלות מהיעדר כפתור. רשומות חתימות קיימות ותלויות חסרות במדויק.

- [x] **משימה 4.10: כניסה למודעות שלי מהפרופיל**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/profile/page.tsx`.
  - **הוראות טכניות ברורות:** הוסף קישור קבוע ומקומי לשפה ל־/my-listings לכל משתמש מחובר; אל תתנה אותו במצב lister או בקיום מודעות. שמור את ניווט חמשת היעדים.
  - **קריטריון קבלה:** דייר ומפרסם מגיעים מהפרופיל לניהול בעברית ובאנגלית גם ללא מודעות.

- [x] **משימה 4.11: פעולת ניהול במודעה של המשתמש**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ListingContact.tsx`.
  - **הוראות טכניות ברורות:** בדוק בעלות בשרת לפני הסתעפות לפנייה או השלמת פרופיל. לבעלים הצג ניהול המודעה שלי; משתמש אחר ממשיך לפנייה הקיימת.
  - **קריטריון קבלה:** בעלים אינו רואה פנייה לעצמו; משתמש אחר עדיין פונה. בדוק גם מפרסם B10 שאינו דייר.

- [x] **משימה 4.12: מניעת פנייה עצמית בשרת**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261022000001_reject_self_listing_inquiry.sql`, `supabase/tests/plan_self_listing_inquiry.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת הגנת RPC קיימת והוסף הרחבה רק אם חסרה. requester מה־session; השוואת בעלות מונעת יצירת פנייה עצמית. אין מיגרציה ריקה אם ההגנה קיימת. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** לקוח רגיל בעלים נדחה ללא פנייה/שיחה/מענק כתובת; לקוח אחר יוצר פנייה. הרץ SQL וגם קריאה מורשית רגילה.

- [x] **משימה 4.13: כרטיס ניהול למודעה קיימת**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/OwnerListingCard.tsx`.
  - **הוראות טכניות ברורות:** צור רכיב תצוגה לכותרת, תמונה, סטטוס, חדרים וקישורי צפייה וניהול. קבל מידע מהשרת ו־callbacks/URLs; אל תיצור קישור למסלול עריכה שטרם קיים. עד 4.3 ניהול מוביל למרכז הקיים.
  - **קריטריון קבלה:** פעילה/הושכרה/ללא תמונה/ללא חדרים מוצגות ללא שגיאות; אין שינוי זמינות מתוך props.

- [x] **משימה 4.14: חיבור כרטיסי המודעות למסך הניהול**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** השתמש בכרטיס 4.13. שמור סינון בעלות בשרת, מסך ריק, נתיבי שפה ופעולות שכבר עובדות. אין תלות באחסון טיוטות עתידי.
  - **קריטריון קבלה:** שני מפרסמים רואים רק את מודעותיהם; מודעות קיימות נשארות נגישות.

- [x] **משימה 2.16: חוזה טיפוסים לטיוטות מרובות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-types.ts`.
  - **הוראות טכניות ברורות:** ממש את LISTING_MANAGEMENT: מזהה טיוטה, schemaVersion, revision, updatedAt, שדות חלקיים, photo refs, sourceListingId/sourceRevision אופציונליים ומצב טיוטה. לא שומרים File או URL חתום. הפרד new/edit ונתוני draft ממודל תקין לפרסום.
  - **קריטריון קבלה:** TypeScript עובר; אפשר לייצג שתי טיוטות חסרות בלי לעקוף validation של publish.

- [x] **משימה 2.17: אחסון פרטי לטיוטות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021225221_private_listing_drafts.sql`, `supabase/tests/plan_listing_drafts.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף טיוטות בבעלות חשבון עם מזהה נפרד וגרסה, RLS ו־grants באותה מיגרציה. בעלים אינו ניתן להחלפה. sourceListingId רק למודעה בבעלות caller; לכל מודעה לכל היותר טיוטת עריכה פתוחה אחת. הוסף שדה receipt לייבוא ומפתח ניסיון לפרסום לפי החוזה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** חשבון יוצר וקורא שתי טיוטות; זר ואורח אינם קוראים או משנים; הפניה למודעה זרה נדחית. אין טיוטות ב־public projections.

- [x] **משימה 2.18: פעולת שמירת טיוטה עם גרסה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261022075546_save_listing_draft_revision.sql`, `supabase/migrations/20261022185738_bind_draft_publication_snapshot.sql`, `supabase/tests/plan_listing_draft_revision.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף פעולות RPC ליצירה/שמירה/מחיקה וסיום טיוטה לפי החוזה; שמירה בודקת expected_revision ומחזירה revision חדש. פעולות סיום/מחיקה מכבדות ניסיון פרסום שהחל; אין סימון published ללא receipt אמיתי. שדות חלקיים מותרים. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שמירה תקינה מתקדמת בגרסה; טאב ישן מקבל conflict ללא דריסה; ייבוא באותו receipt מחזיר אותה טיוטה; לא ניתן לסיים ללא מודעה בבעלות שהתפרסמה.

- [x] **משימה 2.19: שירות קריאה וכתיבה לטיוטות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-actions.ts`.
  - **הוראות טכניות ברורות:** הוסף server actions לרשימה, יצירה, טעינה ושמירה בחוזה 2.18. זהות מה־session; החזר not-found/conflict/error מפורשים. אין מחיקה או סיום דרך write חופשי מהלקוח.
  - **קריטריון קבלה:** שתי טיוטות נשמרות ונטענות מחדש בלקוח מורשה; מזהה זר אינו מחזיר תוכן.

- [x] **משימה 2.20: אחסון תמונות פרטי לטיוטות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261022000004_private_listing_draft_media.sql`, `supabase/tests/plan_listing_draft_media.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף bucket פרטי listing-draft-media, נתיב accountId/draftId/objectId והרשאות Storage/שיוך מוכיחות בעלות וקיום טיוטה. תמונות מודעה פעילה נשארות בהפניות המקוריות ואינן מועתקות אוטומטית. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בעלים מעלה וקורא; זר ואורח אינם קוראים/מחליפים/משייכים; אין getPublicUrl לתמונות draft.

- [x] **משימה 2.21: שירות תמונות לטיוטה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-media.ts`.
  - **הוראות טכניות ברורות:** חבר דחיסה קיימת, העלאה, שיוך ותצוגה מורשית לזמן מוגבל. שמור רק object refs. הבחן בין draft-private לבין published-owned refs; אל תמחק תמונות של מודעה פעילה.
  - **קריטריון קבלה:** תמונה נטענת במכשיר נוסף; כשל העלאה שומר קלט ותמונות שכבר נשמרו.

- [x] **משימה 2.22: העברת טיוטה מקומית קיימת לענן**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-store.ts`, `web/src/lib/listings/draft-import.ts`.
  - **הוראות טכניות ברורות:** הוסף ייבוא מפורש של IndexedDB של החשבון הנוכחי, כולל תמונות. מזהה ייבוא יציב נשמר גם מקומית וגם בשרת; סיים העלאות לפני מחיקה מקומית. פונקציית הייבוא עצמאית; החיבור לבוחר ב־2.29.
  - **קריטריון קבלה:** retry מחזיר אותה טיוטה; כשל באמצע אינו מוחק מקור; logout/account-switch אינם מייבאים לחשבון אחר.

- [x] **משימה 2.23: רכיב רשימת טיוטות**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ListingDraftList.tsx`.
  - **הוראות טכניות ברורות:** הצג כותרת או טיוטה ללא כותרת, עדכון, חדש/עריכה וכפתור המשך. קבל רשימה ופעולות מבחוץ, כולל empty state. מחיקה עדיין אינה מוצגת עד 2.30.
  - **קריטריון קבלה:** שתי טיוטות מוצגות בנפרד עם מזהים וקישורי המשך שונים; הרכיב מתקמפל עצמאית.

- [x] **משימה 2.24: הצגת טיוטות במודעות שלי**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** טען טיוטות והוסף אזור נפרד ממודעות. כשל טעינת טיוטות אינו מציג אין מודעות. עד חיבור הטופס ב־2.25 הצג הרשימה ללא פעולת המשך לא קיימת.
  - **קריטריון קבלה:** מודעות וטיוטות מוצגות יחד; אף טיוטה אינה מוצגת כמודעה ציבורית.

- [x] **משימה 2.25: טעינת טיוטה מזוהה לטופס**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/ComposePage.tsx`, `web/src/app/(main)/compose/ComposeForm.tsx`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** פתח /compose?draft=<id> בשפה הנוכחית. טען בשרת טיוטה מורשית וגרסה, והעבר כ־props; route ללא id יוצר חדשה מפורשות. אפשר קישורי המשך רק כעת. בשלב זה הצג מדיה שמורה לקריאה בלבד והמשך לפרסום הישן רק אם יש קלט תואם; אל תאבד refs.
  - **קריטריון קבלה:** פתיחת א/ב טוענת תוכן שונה; זר אינו מקבל תוכן; הפתיחה החדשה אינה טוענת אוטומטית אחרונה.

- [x] **משימה 2.26: שמירה אוטומטית וחיווי בטופס**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/ComposeForm.tsx`.
  - **הוראות טכניות ברורות:** חבר שמירה מדורגת לפי id/revision, בסדר בקשות; הצג שומר/נשמר/שגיאה/conflict. סגירה ממתינה לשמירה או מציגה שגיאה לתיקון. אין optimistic saved לפני תשובת שרת.
  - **קריטריון קבלה:** reload ומכשיר נוסף משחזרים שדות; כשל אינו מציג נשמר; כתיבה מגרסה ישנה משאירה קלט גלוי ללא דריסה.

- [x] **משימה 2.27: חיבור תמונות ענן לטופס**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/ComposeForm.tsx`.
  - **הוראות טכניות ברורות:** חבר שירות 2.21 לתמונות ושינוי סדר refs בטיוטה. הסרה מהטיוטה אינה מוחקת תמונה המשויכת למודעה פעילה. שמור 3–8 לפרסום בלבד; draft יכול להכיל פחות.
  - **קריטריון קבלה:** תמונות וסדרן נשמרים בפתיחה במכשיר נוסף; כשל העלאה אינו מוחק תוכן.

- [x] **משימה 2.28: חלון בחירת חדש או המשך**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ListingDraftChooser.tsx`.
  - **הוראות טכניות ברורות:** צור רכיב עם מודעה חדשה, רשימת טיוטות והצעת ייבוא כאשר זמינה טיוטה מקומית. בחירה מוחזרת ל־caller; אין continuation אוטומטי.
  - **קריטריון קבלה:** חדש והמשך א/ב מחזירים בחירות נפרדות; הרכיב אינו כותב מעל טיוטה בעצמו.

- [x] **משימה 2.29: חיבור הבחירה לכפתור הפלוס**
  - **קבצים לעריכה/יצירה:** `web/src/components/navigation/ComposerNavigation.tsx`.
  - **הוראות טכניות ברורות:** כשיש טיוטות או ייבוא, פתח chooser; אחרת צור חדשה. חבר id וגרסה לטופס, וייבוא 2.22 רק לפעולה מפורשת. שמור origin מתחת ל־overlay; account switch מאפס state פרטי.
  - **קריטריון קבלה:** פלוס אינו דורס טיוטה; המשך פותח נכון; סגירה חוזרת לאותו מסך; הייבוא מוצע ומבוצע פעם אחת.

- [x] **משימה 2.30: מחיקה מפורשת של טיוטה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-actions.ts`, `web/src/lib/listings/draft-media.ts`, `web/src/components/listings/ListingDraftList.tsx`.
  - **הוראות טכניות ברורות:** חבר אישור מחיקה ושרת מורשה ל־2.18. מחק רק refs/objects פרטיים שאינם משויכים. ניסיון publish לא ודאי דורש בירור receipt לפני ניקוי. כשל ניקוי מתועד ל־retry מדויק.
  - **קריטריון קבלה:** מחיקת א אינה משנה ב או תמונות מודעה פעילה; משתמש זר נדחה; אין דיווח הצלחה מלאה על ניקוי שנכשל.

- [x] **משימה 2.31: מתאם מטיוטת ענן לפרסום הקיים**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-publish.ts`.
  - **הוראות טכניות ברורות:** טען snapshot מורשה עם expected_revision ותמונות. המר לקלט publishListing הקיים תוך שימוש חוזר במפתח הניסיון ובקבצי תמונה שהבעלים מורשה לקרוא. הקפא snapshot בזמן ניסיון; לאחר תשובה לא ודאית יש לברר receipt לפני שינוי payload. אין מסלול publish מקביל.
  - **קריטריון קבלה:** snapshot חוזר מפיק אותו request key ותמונות; טיוטה חלקית או תמונה זרה נדחית; הנתיב הקיים נשאר עובד.

- [x] **משימה 2.32: פרסום הטיוטה שנבחרה בלבד**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/actions.ts`, `web/src/app/(main)/compose/ComposeForm.tsx`, `web/src/lib/listings/draft-actions.ts`.
  - **הוראות טכניות ברורות:** חבר מתאם 2.31; רק receipt מאומת מסיים את הטיוטה. כשל סיום אחרי פרסום ניתן לפיוס בפתיחה הבאה ללא פרסום כפול. שאר טיוטות אינן משתנות. כפתור חדש הוא פרסום מודעה; מצב edit לא מפרסם אוטומטית.
  - **קריטריון קבלה:** א מתפרסמת פעם אחת וב נשארת; retry מחזיר אותה מודעה; תשובה לא ודאית שומרת מפתח ונתונים.

- [x] **משימה 2.7: מסך אישור הפרסום**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/published/PublishedPage.tsx`, `web/src/app/(main)/compose/published/[listingId]/page.tsx`, `web/src/app/(main)/en/compose/published/[listingId]/page.tsx`.
  - **הוראות טכניות ברורות:** העבר את המזהה שהשרת החזיר למסך Published; הוסף קישור מקומי לשפה אל המודעות שלי; View listing מוביל לנתיב השפה המתאים של הדירה שנוצרה.
  - **קריטריון קבלה:** פרסום בעברית ובאנגלית מסתיים במסך אישור, והקישור פותח את הדירה עם שני המחירים והתמונות הנכונים.

- [x] **משימה 4.1: קורא מודל עריכה לבעלים**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/editor.ts`, `web/src/app/(main)/my-listings/actions.ts`.
  - **הוראות טכניות ברורות:** טען את הדירה, החדרים, photo refs ו־revision לעריכה רק לבעלים; מיקום מדויק אינו הופך לשדה עריכה ציבורי.
  - **קריטריון קבלה:** בעלים טוען מודל מלא; בעלים אחר מקבל NOT_FOUND ואינו מקבל address.

- [x] **משימה 4.2: עדכון מודל אטומי**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261023200459_versioned_listing_edit.sql`, `supabase/tests/plan_listing_edit.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** RPC בעלים בודק expected_revision ומאמת את המודל הסופי; update של facts/rooms/photo refs יחד ומעלה revision פעם אחת. מיקום מפורסם אינו משתנה בעריכה רגילה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שינוי מחיר/תאריך נשמר; stale revision מקבל conflict; rollback משאיר מודל ותמונות ישנים.

- [x] **משימה 4.15: יצירת טיוטת עריכה ממודעה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/editor.ts`, `web/src/lib/listings/draft-actions.ts`, `supabase/migrations/20261023202753_open_listing_edit_draft.sql`, `supabase/tests/plan_listing_edit_draft.sql`.
  - **הוראות טכניות ברורות:** השתמש ב־4.1 וב־2.18 ליצור/להמשיך טיוטת edit אחת למודעה, עם sourceRevision ו־published refs. כל העריכה פרטית; אין שינוי כתובת מפורסמת או בעלים.
  - **קריטריון קבלה:** יצירה אינה משנה מודעה ציבורית; פתיחה חוזרת ממשיכה אותה טיוטה.

- [x] **משימה 4.3: חיבור טופס עריכה לטיוטה פרטית**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/EditListingForm.tsx`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`, `web/src/app/(main)/compose/ComposeForm.tsx`, `web/src/lib/listings/editor.ts`.
  - **הוראות טכניות ברורות:** חבר פתיחת טיוטת עריכה מ־4.15 לטופס המשותף ו־validation משותף. autosave לפרטי בלבד; ציבורי עדיין לא מחובר עד 4.16. אין החלפת כתובת/בעלים ואין טופס שונה בכללים.
  - **קריטריון קבלה:** מחיר/תאריך נשמרים בטיוטה ונפתחים שוב; המחיר הציבורי נשאר ישן עד 4.16.

- [x] **משימה 4.16: שמירת שינויים מפורשת למודעה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/draft-edit-publish.ts`, `web/src/lib/listings/edit-publication-model.ts`, `web/src/lib/listings/publication-media.ts`, `web/src/components/listings/EditListingForm.tsx`, `web/src/components/listings/ListingEditConflict.tsx`, הטופס והשחזור המשותפים, `supabase/migrations/20261024083041_listing_edit_draft_commit.sql`, `supabase/tests/plan_listing_edit_commit.sql`, `web/e2e/edit-listing-commit.spec.ts`.
  - **הוראות טכניות ברורות:** רק שמירת שינויים מפעילה RPC 4.2; autosave שומר draft בלבד. השתמש במתאם התמונות והאימות המשותף; conflict אינו מוחק קלט ודורש רענון/השוואה. סיום טיוטה רק אחרי receipt update מאומת.
  - **קריטריון קבלה:** טיוטת מחיר אינה משנה public; שמירה מפורשת כן; טאב ישן אינו דורס. תמונות/חדרים נשמרים באותה פעולת update.

- [x] **משימה 4.4: פעולת שרת לשינוי זמינות חדר**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261024140758_room_availability_controls.sql`, `supabase/tests/plan_room_availability.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** יישם רק owner RPC לשינוי זמינות חדר. inventory נפרד מ־intake, וסגירת כל החדרים מסמנת pending כטעון אישור מחדש לפי D18; accepted נשמר. intake עצמאי ב־4.17. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** חדר אחד נסגר והשני נשאר זמין; count/range נכונים; reopen אינו מאשר pending ישן.
  - **מצב 24 באוקטובר 2026:** המיגרציה החיה `20261024140758_room_availability_controls` הוחלה לאחר אישור מפורש; ה־PGlite SQL/RLS עבר, וה־RPC קיים. הוכנו תשעה חשבונות QA חדשים ומבודדים, אך כלי חיבור המסד דחה את SQL ה־provisioning ב־`INVALID_ARGUMENT` לפני כל כתיבה; לכן בדיקת לקוח רגיל טרם הושלמה. לפי הוראת הבעלים ה־source משתלב ומתפרסם עם פער הראיה המתועד הזה; המשימה נשארת פתוחה עד בדיקת owner/foreign/guest רגילה.

- [x] **משימה 4.5: פקדי זמינות חדרים**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/RoomAvailabilityControls.tsx`, `web/src/app/(main)/my-listings/actions.ts`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** חבר פקד לכל חדר ל־4.4; אמת תגובת שרת. אין פקד intake במשימה זו, ואין שינוי group/chat.
  - **קריטריון קבלה:** סגירה/פתיחה של חדר נשמרות לאחר reload; room אחר אינו משתנה.

- [x] **משימה 4.17: פעולת שרת לעצירת וחידוש פניות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261026143946_listing_inquiry_intake.sql`, `supabase/migrations/20261026174553_listing_inquiry_inventory_recheck.sql`, `supabase/tests/plan_listing_inquiry_intake.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הפרד intake מזמינות חדרים. עדכן send/accept checks; stop אינו מוחק accepted; pending אינם נעשים ניתנים לאישור מחדש רק בגלל reopen, לפי D18. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** intake אינו משנה חדרים; בעצירה אין פניות חדשות; שיחה מאושרת נשארת; pending הישן דורש reconfirm.

- [x] **משימה 4.18: פקד קבלת פניות במסך הניהול**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ListingIntakeControl.tsx`, `web/src/app/(main)/my-listings/actions.ts`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** חבר פקד intake בנפרד מחדרים והושכרה; הצג רק תוצאה מאומתת של שרת. שמור rented action הקיים ומצב pending unavailable.
  - **קריטריון קבלה:** עצירה וחידוש נשמרים ב־reload ללא שינוי חדרים/שיחות; כשל אינו מציג הצלחה.

- [x] **משימה 4.7: ניקוי reference צילום שהוסר**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261026224849_listing_photo_cleanup.sql`, `supabase/tests/plan_listing_photo_cleanup.sql`, `supabase/tests/plan_listing_edit.sql`, `supabase/tests/plan_listing_edit_draft.sql`, `supabase/tests/plan_listing_edit_commit.sql`, `supabase/tests/plan_listing_editor.sql`, `scripts/test-resident-sql.mjs`, `web/src/lib/listings/photo-cleanup.ts`, `web/src/lib/listings/draft-edit-publish.ts`, `web/scripts/listing-photo-cleanup.test.mjs`.
  - **הוראות טכניות ברורות:** תקן LISTING-PHOTO-CLEANUP-001 במסלול commit/reconcile האמיתי של edit; editor.ts נשאר קורא/פותח טיוטה ללא מחיקה. שמור מועמדי ניקוי עם owner/object identity ומקור commit ברשומה עמידה אטומית; קבל מועמדים רק לאחר commit מאומת, לעולם לא מנתיבי client או תוצאת פרסום עמומה. שרת שומר references במודעות אחרות, טיוטות פתוחות ו־publication/edit snapshots קפואים שטרם הוכרעו; קבלות completed כשלעצמן אינן שימוש חי. הוסף reservation/locking שגם attachment/commit ו־Storage DELETE מכבדים כדי למנוע read-then-delete race. רק objects מוכחים בבעלות ובלתי referenced מוסרים דרך Storage API; לא מוחקים storage.objects ב־SQL. כשל ניקוי נשמר ל־retry מוגבל ואידמפוטנטי ללא rollback של העריכה וללא שינוי API פרסום/מדיה פרטית שאינו נדרש. מיגרציה append-only אחרי live history טרי; reconcile לגרסה בפועל. הרץ גם node --test web/scripts/listing-photo-cleanup.test.mjs ואת שרשרת SQL, לא syntax בלבד.
  - **קריטריון קבלה:** שרשרת SQL/בדיקות ההרצה עוברות, ובדיקת לקוח רגיל מוכיחה שתמונה שהוסרה באמת נמחקת דרך Storage API; תמונה משותפת/משויכת/בטיוטה או snapshot פעיל נשמרת. raced attach/reserve אינו משאיר reference שבור; כשל/תגובה אבודה משאירים edit מוצלח ורשומת retry מדויקת, ו־retry לאחר auth change או כבעלים אחר אינו מוחק דבר. fixture/media זמניים מנוקים תחת TESTING; קוד/SQL בלבד אינם קבלה חיה.

- [ ] **משימה 6.1: יצירת פנייה אישית שנשמרת**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261027063143_core_individual_inquiry.sql`, `supabase/tests/plan_core_inquiry.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** התאם create_listing_inquiry באופן תואם לחתימה קיימת, עם intro אופציונלי עד 500 Unicode codepoints/default NULL. שמור חתימת uuid קיימת כ־wrapper המעביר NULL ל־overload עם שני פרמטרים נדרשים כדי למנוע עמימות ב־PostgREST; legacy retry משמר intro קיים, וטקסט חדש שונה נדחה ללא שינוי reconfirmation. session requester, listing פעיל/intake פתוח, nonself, pending יחיד בהקשר אישי. שמור נעילת parent ובדיקת inventory/block נפרדת לאחריה. אין chat/address לפני accept. המיגרציה נוצרה ב־CLI אחרי history20261026224849 ותותאם לגרסת apply בפועל; אין שינוי היסטוריה קיימת. חבר SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** פנייה עם/בלי הודעה נראית לבעלים אחרי reload; חתימה ישנה עובדת; אין גישה מוקדמת לכתובת.

- [ ] **משימה 6.2: אישור בעלים לפנייה אישית**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000008_core_accept_individual_inquiry.sql`, `supabase/tests/plan_core_inquiry_accept.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** התאם accept_listing_inquiry: בעל הדירה מאשר, recheck מצב, ושמירת conversation/members/address grant באותה פעולה. שמור חוזה קיים אם כבר עובד. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בעל הדירה מאשר; מתקבלת שיחה אישית אחת והפונה יכול לקרוא כתובת לפי D4. פונה אינו יכול לאשר לעצמו.

- [ ] **משימה 6.22: שדה הודעת פתיחה בפנייה**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/RequestViewing.tsx`, `web/src/lib/listings/inquiries.ts`.
  - **הוראות טכניות ברורות:** הוסף הודעה אופציונלית עד 500 Unicode codepoints, בדיקת שרת תואמת וחיבור ל־RPC 6.1. כשל שומר טקסט ו־retry identity; אין עריכת טקסט של pending קיים באמצעות retry.
  - **קריטריון קבלה:** פנייה עם/בלי הודעה נשמרת; retry אינו יוצר נוספת; הלקוח מציג הודעת שגיאה בלי למחוק טקסט.

- [ ] **משימה 6.3: בדיקת חיבור הפנייה ומצב ממתין**
  - **קבצים לעריכה/יצירה:** `web/e2e/owner-listing-inbox.spec.ts`.
  - **הוראות טכניות ברורות:** אמת רק חיבור 6.22 ו־pending שנשמר בשרת אחרי reload ו־guest sign-in return לאותה דירה. אין מימוש UI/RPC נוסף כאן.
  - **קריטריון קבלה:** הרצת Playwright ממוקדת למסלול send/reload/return עוברת.

- [ ] **משימה 6.23: קורא פניות מורשה לבעלים**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261022000006_owner_listing_inbox.sql`, `supabase/tests/plan_owner_listing_inbox.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** החזר פניות בבעלות caller עם listing id/title, state, time, optional intro, requester public projection ו־conversation id מאושר. סינון דירה/מצב ועימוד לפי TECHNICAL_DEFAULTS. בלי seen עד 6.24 ובלי הנחת טבלאות group עתידיות. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בעל שתי דירות מסנן אחת; זר אינו מקבל מידע; public projection אינו כולל טלפון/DOB/העדפות פרטיות.

- [ ] **משימה 6.24: סימון פנייה שנצפתה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261022000007_owner_inquiry_seen.sql`, `supabase/tests/plan_owner_inquiry_seen.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** שמור viewed marker לבעלים והרחב הקורא בחיווי חדש. פתיחת פרטי הכרטיס בלבד מסמנת צפייה; idempotent. אין שינוי inquiry state או chat unread. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** פתיחה מסירה חדש בלבד; pending אינו מאושר; זר אינו מסמן עבור בעלים.

- [ ] **משימה 6.25: שירות שרת למרכז הפניות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/owner-inbox.ts`.
  - **הוראות טכניות ברורות:** חבר קריאה מסוננת ועמוד המשך וסימון צפייה. session קובע בעלים; validate filter/cursor. החזר typed errors; אל תוסיף ownerId בשליטת לקוח.
  - **קריטריון קבלה:** פניות נטענות עם עימוד וסינון; פנייה זרה אינה נקראת/מסומנת.

- [ ] **משימה 6.26: כרטיס פנייה אישית**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/OwnerInquiryCard.tsx`.
  - **הוראות טכניות ברורות:** הצג projection ציבורי, דירה, הודעה אופציונלית, זמן, state וחדש. accepted עם קישור לשיחה. props/callbacks לפעולות יתחברו ב־6.4; אין העמדת כפתור דמה.
  - **קריטריון קבלה:** pending/accepted/declined/unavailable ללא הודעה או עם הודעה מוצגים; אין מידע פרטי.

- [ ] **משימה 6.20: שינוי מצב פנייה לפי actor**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000060_inquiry_state_transitions.sql`, `supabase/tests/plan_inquiry_transitions.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת RPC state transition לפניות אישיות, וקבוצתיות רק אם תשתיתן כבר קיימת; לאחר 6.6–6.10 משלימים תאימות קבוצתית בבדיקות 6.14: owner decline, requester withdraw/reconfirm לפי D18 והרכב תקף כשקיים context קבוצתי. אין החזרת accepted ל־pending או עקיפת סבב קבוצתי. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** decline/withdraw אינם יוצרים chat/grant; reopening קבוצתי דורש סבב הסכמה מחודש.

- [ ] **משימה 6.4: אישור ודחיית פנייה בכרטיס הבעלים**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/InquiryActionButtons.tsx`, `web/src/components/listings/OwnerInquiryCard.tsx`, `web/src/lib/listings/inquiries.ts`.
  - **הוראות טכניות ברורות:** חבר לכרטיס הקיים accept ו־decline RPC מורשים. decline מה־6.20 המקודם; accepted מוביל conversationId שהשרת החזיר. אין רשימת pending שנייה ב־Chats.
  - **קריטריון קבלה:** בעלים מאשר פעם אחת ופותח שיחה; דחייה אינה יוצרת שיחה; error משאיר מצב שרת קודם.

- [ ] **משימה 6.5: קריאת כתובת אחרי אישור**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ListingContact.tsx`, `web/src/app/(main)/chats/[conversationId]/page.tsx`.
  - **הוראות טכניות ברורות:** השתמש ב־listing_address_access ובקורא מורשה; אל תוסיף כתובת ל־PublicListing או ל־message payload.
  - **קריטריון קבלה:** משתתף מאושר רואה כתובת בשרשור הרלוונטי; המשתמש השני והעמוד הציבורי עדיין רואים רק אזור מקורב.

- [ ] **משימה 6.27: מרכז פניות מרוכז**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/OwnerInquiryInbox.tsx`.
  - **הוראות טכניות ברורות:** הרכב cards עם סינון דירה/סטטוס, עוד עמוד, loading/empty/error/retry. פעולת פתיחת פרטים מסמנת seen דרך service. השתמש באישור/דחייה מ־6.4.
  - **קריטריון קבלה:** סינון נכון; empty אינו error; retry עובד; פתיחה אינה אישור.

- [ ] **משימה 6.28: חיבור הפניות למסך ניהול הדירות**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** הוסף views למודעות/טיוטות/פניות עם query state פנימי בטוח. מכרטיס דירה בחר את אותו inbox עם listing filter; אין רשימה שנייה.
  - **קריטריון קבלה:** דירה א מסננת רק א; כל הדירות מציג גם ב; אישור פותח שיחת הדירה הנכונה.

- [ ] **משימה 4.20: החזרת מודעה שהושכרה — מעבר שרת מוגן**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261027000000_owner_listing_status.sql`, `supabase/tests/plan_listing_status_transitions.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** תקן LISTING-REOPEN-001 לפי D16/D18 וחוזה Reopen: מעבר מפורש taken לפעילות לבעל המודעה בלבד, עם נעילת הורה ובדיקת מגבלות. שמור זהות, חדרים/intake, שיחות והרשאות כתובת; אל תחדש תפוגה או תעקוף הגבלת בודק. מעבר ל־taken מסמן pending לאישור מחדש אטומית, כולל מסלול הכתיבה הישן; פתיחה לא מנקה את הסימון. עדכן revision פעם אחת על שינוי והגן גם על direct write. שמור תאימות למסך שפורסם עד4.21; שם המיגרציה הסופי חייב להיות append-only אחרי live history הטרי.
  - **קריטריון קבלה:** שרשרת SQL ולקוח רגיל owner/foreign/guest מאמתים taken→active, retry ללא שינוי כפול, חדרים/intake/chat/address ללא שינוי, pending לא ניתן לאישור עד reconfirmation, והגבלות/תפוגה אינן נמחקות. אין מחיקה או סימון מגורים אוטומטי.

- [ ] **משימה 4.21: החזרה לפעילות מתוך המודעות שלי**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/my-listings/actions.ts`, `web/src/app/(main)/my-listings/RentedButton.tsx`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** חבר את4.20 לפעולת החזרה לפעילות במודעה taken לצד פעולת הסימון כהושכרה. הצג מצב שרת מאומת ו־pending/error/retry בשתי שפות, ללא פתיחת חדר/intake מרומזת. הסבר אם עדיין אין חדר פנוי או קבלת הפניות מושהית; פניות ישנות נשארות unavailable עד אישור הפונה. אל תוסיף חידוש תקופה או הסרת מגבלות.
  - **קריטריון קבלה:** HE/EN390/desktop: סימון כהושכרה והחזרה לפעילות נשמרים ברענון, אותה מודעה וחדרים/chat/address נשמרים, כשל אינו מציג הצלחה; פונה ישן צריך reconfirmation ובעלים אחר אינו יכול לשנות.

- [ ] **משימה 2.33: בדיקת טיוטות בין מכשירים**
  - **קבצים לעריכה/יצירה:** `web/e2e/listing-drafts.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק שני browser contexts באותו חשבון: שתי טיוטות עם תמונות, המשך/ייבוא, פרסום אחת ושמירת השנייה; חשבון אחר אינו רואה. השתמש ב־TESTING, fixtures מדויקים ויעד מזוהה.
  - **קריטריון קבלה:** הרצת Playwright זו עוברת ללא mocks לאחסון או skipped; HE/EN וטלפון/מחשב מתועדים.

- [ ] **משימה 4.8: קבלת מסלול עריכה**
  - **קבצים לעריכה/יצירה:** `web/e2e/listing-edit.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק שני בעלים, שני טאבים, draft edit פרטי עד שמירה מפורשת, חדרים, intake reopen, taken→active מ־4.20/4.21, accepted chat ו־pending reconfirm. HE/EN בטלפון/מחשב.
  - **קריטריון קבלה:** npx playwright test e2e/listing-edit.spec.ts --workers=1 עובר; שיחת accepted נשארת; draft אינו מפרסם אוטומטית.

- [ ] **משימה 6.29: בדיקת מסלול בעלים ופניות**
  - **קבצים לעריכה/יצירה:** `web/e2e/owner-listing-inbox.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק בעל שתי דירות ושני פונים: intro, listing filter, seen, accept, decline ושיחה; אין self-inquiry ואין גישת בעלים אחר.
  - **קריטריון קבלה:** npx playwright test e2e/owner-listing-inbox.spec.ts --workers=1 עובר מול יעד מזוהה בשתי שפות; פניות ושיחות משויכות נכון.

- [ ] **משימה 4.19: אימות ופרסום אבן הדרך הראשונה**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/implementation-plan-SL04.md`, `docs/KNOWN_ISSUES.md`.
  - **הוראות טכניות ברורות:** אחד ראיות build/browser/ordinary-client וגרסאות SQL שכבר הוחלו במסגרת משימותיהן; אל תחיל מיגרציות שלא נבדקו כאן. אמת routine release לפי הרשאה ובדפדפן על הפריסה המדויקת. סמן רק פערים שאומתו כפתורים. אם כל תנאי SL04.2 עברו, עדכן את ראיות החבילה ב־execution-state כדי שהתור הרגיל ימשיך בלי בחירת בעלים נוספת; אחרת תעד את החסר המדויק.
  - **קריטריון קבלה:** SHA, deployment, target ומיגרציות עם HE/EN/390px/desktop רשומים; SL04.2 בלבד יכול להיות verified, לא SL04.1/full SL02/SL06 אוטומטית.

### אבן דרך שנייה — תלויות הליבה ושילוב פנייה קבוצתית

לאחר 4.19 ממשיכים לפי הסדר להלן לאימות בסיס הפרסום, מפה, שיחות, קבוצה ושיתוף הקיימים, ורק אז 6.6–6.12. אין שכפול backend או מסך פניות. 6.13 מקודמת לפני אישור הקבוצה ו־6.14 לפני קבלת אבן הדרך; אין דחיית membership/history authorization.

### SL02 — פרסום דירה שניתן למצוא ולשתף

תלוי בחוזי החשבון שאומתו. ההמשך הפעיל ב־SL02 חייב להיות מתואם לפני כל עריכה. חוזים: D1–D5/D19/A5/J9/I21.

**מעקב 21.10.2026:** המשימות שסומנו הוכחו בבדיקות המקומיות ובמסלול הפרסום החי המתועדות ב־`docs/workstreams/2026-10-20-sl02-listing-continuation.md`. שאר המשימות נשארות פתוחות עד שכל קריטריוני הקבלה שלהן ייבדקו; קוד קיים לבדו אינו הוכחת השלמה. תמונות הטיוטה נשמרות ב־IndexedDB במקום לדרוש העלאה מחדש; סעיף 2.8 עדיין דורש התאמה מפורשת של הקריטריון וראיות מלאות.

- [x] **משימה 2.1: תיקון חובת טלפון לדייר**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/actions.ts`, `web/src/lib/listings/validation.ts`.
  - **הוראות טכניות ברורות:** הסר חסימת פרסום רק בשל היעדר טלפון בדייר זכאי; שמור טלפון חובה במפרסם B10. אל תציג טלפון בציבור.
  - **קריטריון קבלה:** דייר זכאי ללא טלפון עובר validation; מפרסם חסר טלפון אינו משלים קליטה. אין איסוף טלפון נוסף בטופס דירה.

- [x] **משימה 2.2: אימות מודל דירה וחדרים**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/validation.ts`, `web/scripts/listing-validation.test.mjs`.
  - **הוראות טכניות ברורות:** אמת title, bedrooms, date, bills, כתובת/קואורדינטות ולפחות חדר זמין אחד עם מחיר. שמור שימוש במודל הדירה הקיים; אל תהפוך חדר לכרטיס נפרד.
  - **קריטריון קבלה:** node --test web/scripts/listing-validation.test.mjs עובר: דירה עם שני חדרים תקינה, מחיר חסר/שלילי וקואורדינטה לא מספרית נדחים.

- [x] **משימה 2.3: בחירת כתובת והשלמה ידנית**
  - **מעקב 21.10.2026:** תוקן LISTING-LOCATION-CONFIRM-001 באמצעות טעינה מוקדמת של עיצוב Leaflet. בדיקת `web/e2e/location-confirmation.spec.ts` עברה בעברית ובאנגלית ברוחב 390px באתר החי (2/2), כולל אישור, reload וביטולו בעריכה. בחירת כתובת אמיתית בעברית ובאנגלית אומתה בספק החי ב־19.10; פירוט ומגבלות ב־`docs/workstreams/2026-10-19-address-autocomplete.md`.
  - **קבצים לעריכה/יצירה:** `web/src/components/map/AddressField.tsx`, `web/src/components/map/PrivateLocationPicker.tsx`.
  - **הוראות טכניות ברורות:** השתמש בספק הקיים ובמסלול אישור ידני גלוי כאשר התוצאה לא מספקת. שינוי טקסט מבטל בחירה ישנה; אין כתובת מנוחשת מאחורי הקלעים.
  - **קריטריון קבלה:** ב־Compose אפשר לבחור כתובת אמיתית או לאשר ידנית pin ועיר; לחצן פרסום אינו משתמש בבחירה ישנה אחרי עריכה.

- [x] **משימה 2.4: העלאת תמונות הדירה**
  - **קבצים לעריכה/יצירה:** `web/src/utils/photos.ts`, `web/src/app/(main)/compose/ComposeForm.tsx`.
  - **הוראות טכניות ברורות:** השתמש בדחיסה הקיימת והגבל 3–8 תמונות; שמור שמות אובייקטים תחת בעל החשבון. הוסף הסבר שגיאה מקומי להעלאה שנכשלה בלי למחוק קלט.
  - **קריטריון קבלה:** במסלול רגיל שלוש תמונות עולות, מוצגות בתצוגה מקדימה ונשמרות; אפשר לתקן קובץ לא נתמך בלי למלא מחדש את הטופס.

- [x] **משימה 2.5: שמירה אטומית בסיסית של הפרסום**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261020204548_listing_retry_owned_photos.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** השתמש ב־publish_apartment; הרחב רק אם אינו שומר דירה וחדרים באותה פעולה מורשית. אשר בעלות על תמונות ומצב החשבון. אין שינוי בסכמת עבר.
  - **קריטריון קבלה:** Supabase מקומי: פרסום רגיל יוצר דירה אחת ושני חדרים תחת היוצר; לקוח רגיל אחר אינו יכול לפרסם בשמו. בדיקת SQL המקומית עוברת.

- [x] **משימה 2.6: חיבור פעולת הפרסום**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/actions.ts`, `web/src/app/(main)/compose/ComposeForm.tsx`.
  - **הוראות טכניות ברורות:** חבר מודל תקין ונתיבי תמונות ל־RPC הקיים/המורחב; בזמן בקשה disable submit ושמור קלט במקרה שגיאה. אין צורך כעת בבדיקת מרוץ מכוונת.
  - **קריטריון קבלה:** בדפדפן נשמרת דירה אחת בלחיצה רגילה; הצלחה מחזירה את מזהה הדירה; כשל גלוי משאיר את הטופס לתיקון.

### SL03 — מפה ופרטי דירה

חוזים: MAP_SEARCH, D4/D5/D14/J15. שמור CARTO ורכיבים קיימים.

- [ ] **משימה 3.1: שליפת מפה ציבורית מצומצמת**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000002_core_map_projection.sql`, `supabase/tests/plan_core_map.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** התאם query/RPC קיים כך שיחזיר רק דירות פעילות עם חדר זמין, מזהה, מחיר ומיקום ציבורי מקורב. אל תעביר קואורדינטות מקוריות ללקוח. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** לקוח רגיל מוצא דירת fixture פעילה ואינו מקבל שדה כתובת מדויקת; דירה ללא חדר זמין אינה בתוצאה.

- [ ] **משימה 3.2: בחירת pin וכרטיס תואמים**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/map/MapClient.tsx`, `web/src/components/map/LeafletMap.tsx`, `web/src/components/discovery/ListingCard.tsx`.
  - **הוראות טכניות ברורות:** חבר בחירת מזהה דירה אחד בין pin לכרטיס; הצג loading/error/retry כששליפה נכשלת. טפל גם ב־LISTING-OWNER-SEARCH-CUE-001: שליפת מזהי דירות בבעלות session נוכחי בלבד וסימון המודעה שלך/ניהול בכרטיס ובמודל; הדירה נשארת בחיפוש. אל תרחיב public projection בפרטי מפרסם. השתמש במפה הקיימת ללא restyle.
  - **קריטריון קבלה:** לחיצה על pin פותחת את אותה דירה ברשימה ובפרטים; streets/pins נראים בדפדפן. בעלים resident/lister רואה סימון וקישור ניהול, צופה אחר רואה כרטיס רגיל; HE/EN390/desktop ורענון. אין קבלה על סמך HTTP 200 של tile בלבד ואין שינוי בהרשאות פנייה עצמית.

- [ ] **משימה 3.3: פרטי דירה וחדרים**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/PublicListing.tsx`, `web/src/lib/listings/public.ts`.
  - **הוראות טכניות ברורות:** צרוך get_public_listing הקיים והצג מחירים/זמינות לכל חדר, תמונות, facts ואזור ציבורי. טען פרטים לפי מזהה ולא את כל הדירות.
  - **קריטריון קבלה:** דירת שני חדרים מציגה מחירים נפרדים, כמות זמינה ותמונות נכונות; פרטי בעלים פרטיים אינם נדרשים לתצוגה.

- [ ] **משימה 3.4: סינון חדר מתאים**
  - **קבצים לעריכה/יצירה:** `web/src/components/map/filters.ts`, `web/src/components/map/FilterBar.tsx`, `web/src/hooks/useApartmentFilters.ts`.
  - **הוראות טכניות ברורות:** חבר מחיר/תאריך/חשבונות למסנן המאושר; כל תנאי חדר חל על אותו חדר זמין. שמור את state בעת פתיחה וסגירה של פרטים.
  - **קריטריון קבלה:** בדירת 2000/2600 סינון 2100–2500 אינו מציג אותה רק מפני שהטווח הכולל חופף; איפוס מחזיר אותה.

- [ ] **משימה 3.5: נתיבי פרטים בשתי שפות**
  - **קבצים לעריכה/יצירה:** `web/src/app/listings/[listingId]/page.tsx`, `web/src/app/en/listings/[listingId]/page.tsx`.
  - **הוראות טכניות ברורות:** השתמש באותו renderer; העבר locale ונתיב חזרה מתאים. מצב unavailable מוביל לתצוגה מפורשת ולא לשגיאת שרת.
  - **קריטריון קבלה:** אותה דירה נפתחת בעברית ובאנגלית, ב־390px ובמחשב, בלי איבוד לחצני השיתוף והפנייה.


### SL05 — שמירה אישית

חוזים: G1/G2/E7. שמירה אינה פנייה ואינה הסכמה קבוצתית.

- [ ] **משימה 5.1: שמירה לפי משתמש**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000003_core_personal_save.sql`, `supabase/tests/plan_core_saves.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת/תקן toggle_apartment_save_and_interest: ייחודיות משתמש/דירה, גישה רק לשמורים האישיים וספירת שומרים פעילים. אל תיצור inquiry מהפעולה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** A שומר → מופיע בשמורים של A בלבד; אין פנייה חדשה; מונה הציבורי גדל באחד.

- [ ] **משימה 5.2: חיבור מצב שמירה בכרטיס ובמפה**
  - **קבצים לעריכה/יצירה:** `web/src/hooks/useFavorites.ts`, `web/src/components/discovery/ListingCard.tsx`, `web/src/components/listings/PublicListing.tsx`.
  - **הוראות טכניות ברורות:** השתמש במקור state אחד ל־Save/Unsave ול־favorite overlay; הצג שגיאה עם אפשרות ניסיון חוזר.
  - **קריטריון קבלה:** שמירה והסרה מתעדכנות ונשמרות אחרי reload; המשתמש השני אינו מוצג כאילו שמר.


### SL08 — הודעות בסיסיות שנשמרות

חוזים: F1/F3/F5, מימושי sequence/read הקיימים. אישורי קריאה, הקלדה ומקרי ניתוק מורכבים בהמשך.

- [ ] **משימה 8.1: שליחת טקסט דרך ה־RPC הקיים**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** צרוך send_chat_message עם session פעיל ומפתח בקשה יציב לשליחה; שמור draft במקרה שגיאה. תקלה CHAT-MULTILINE-001 מבקשת גם כתיבת כמה שורות בשדה ההודעה, עם פעולת שליחה מכוונת והתנהגות מקלדת ברורה. מחזר renderer קיים המשמר whitespace; אין insert ישיר שעוקף חברות, עריכת הודעות או redesign.
  - **קריטריון קבלה:** שני משתתפים מורשים מחליפים טקסט ושתי שורות נשמרות אצל שניהם אחרי reload; שגיאת שליחה אינה מוחקת טיוטה או ירידות שורה. הקלדה ושליחה נבדקו ב־HE/EN ובטלפון/מחשב; Enter/שילוב המקשים אינו שולח בטעות במהלך ירידת שורה לפי ההתנהגות שהוגדרה.

- [ ] **משימה 8.2: קבלת הודעה בחלון שני**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/chats/InboxSync.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** השתמש בערוץ inbox ובערוץ השרשור הפעיל עם setAuth, ובשליפת הודעות שמורות. תקן רק מסלול קבלה רגיל שבור.
  - **קריטריון קבלה:** A שולח ו־B רואה ללא רענון; לאחר רענון ההודעה עדיין מופיעה פעם אחת.

- [ ] **משימה 8.3: רשימת שיחות וכניסה לשרשור**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/chats/page.tsx`, `web/src/app/(main)/chats/[conversationId]/page.tsx`.
  - **הוראות טכניות ברורות:** צרוך list_chat_inbox הקיים, הצג שיחות אישיות/קבוצתיות ובהמשך apartment context; אל תחשב inbox מטעינת כל היסטוריית ההודעות.
  - **קריטריון קבלה:** המשתמש רואה שיחה קיימת ויכול לפתוח אותה; חשבון שלא משתתף בה אינו יכול לפתוח את השרשור.


### SL07 — גילוי והיכרות בסיסיים

משמרים את החוזים הקיימים send_introduction/accept_like; דירוג סופי ו־31 קטגוריות אינם תנאי להצגת המסלול.

- [ ] **משימה 7.1: היכרות על תג או bio**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/discover/DiscoverClient.tsx`, `web/src/components/discovery/SwipeCard.tsx`.
  - **הוראות טכניות ברורות:** חבר בחירת trait/bio ופתיחת היכרות עם טקסט אופציונלי ל־RPC הקיים. אל תחשב ציון חדש בדפדפן.
  - **קריטריון קבלה:** A יכול לשלוח היכרות ללא טקסט נוסף; B רואה אותה בשיחות הממתינות עם התג הנכון.

- [ ] **משימה 7.2: קבלת היכרות ושיחה אישית**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/chats/PendingLikes.tsx`, `web/e2e/core-discovery.spec.ts`.
  - **הוראות טכניות ברורות:** השתמש ב־accept_like ובחוזה הקיים לפתיחת שיחה; תרחיש רגיל מחבר Discover→accept→text. אל תיצור accepted connection רק ב־UI.
  - **קריטריון קבלה:** npx playwright test e2e/core-discovery.spec.ts --workers=1 עובר; שני המשתמשים רואים שיחה שנשמרת וניתנת לשימוש ביצירת קבוצה.

- [ ] **משימה 7.3: תצוגת התאמה כנה**
  - **קבצים לעריכה/יצירה:** `web/src/components/discovery/SwipeCard.tsx`.
  - **הוראות טכניות ברורות:** הצג רק ציון/coverage מהחוזה המאושר שבאמת זמין; בהיעדרו הצג מידע חלקי ועובדות קיימות. אין אחוז מומצא כדי למלא את הכרטיס.
  - **קריטריון קבלה:** פרופיל דל אינו מוצג כ־100%; אפשר עדיין לגלות ולהתחבר כשהציון המלא ממתין לשלב ב׳.


### SL09 — קבוצת שותפים בהסכמה

תלוי בחשבונות ובצ׳אט הבסיסיים. חוזים: E1–E6/E9/H1. אין המתנה לציון התאמה סופי.

- [ ] **משימה 9.1: יצירת קבוצה והזמנת קשר מאושר**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000004_core_group_invite.sql`, `supabase/tests/plan_core_group_invites.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** התאם create/invite group RPC קיימים: היוצר admin, הזמנה לקשר מורשה בלבד, invitee טרם חבר. השאר את השיחה האישית קיימת. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** A יוצר קבוצה ומזמין B; לפני אישור B אינו חבר; השיחה האישית A/B נשארת.

- [ ] **משימה 9.2: אישור הצטרפות וקו תחילת היסטוריה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000005_core_group_join.sql`, `supabase/tests/plan_core_group_join.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** התאם RPC קיים לקבלת הזמנה: הסכמת הנמען, cap ארבעה, חברות וקו visible_after_seq באותה פעולה. אין הוספה שקטה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** B מאשר ומופיע בקבוצה; הודעה שנשלחה אחרי הצטרפותו מוצגת לו, והשיחה הקודמת של A אינה מוצגת כשלו.

- [ ] **משימה 9.3: טופס יצירת קבוצה**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/GroupActions.tsx`.
  - **הוראות טכניות ברורות:** הצג בחירת קשרים מאושרים ושם/מדיניות קבלה לפי הקיים; חבר ל־RPC במשימה 9.1. אין מצב חשבון Solo/Group.
  - **קריטריון קבלה:** אפשר ליצור קבוצה מתוך Chats; הצלחה מציגה אותה ברשימה בלי להעלים את הפרופיל האישי.

- [ ] **משימה 9.4: אישור הזמנה קבוצתית ב־UI**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/GroupInvites.tsx`.
  - **הוראות טכניות ברורות:** הצג pending invites עם Accept/Decline; אחרי אישור רענן inbox ופרטי חברות. הצג שגיאה במקום הצלחה מדומה.
  - **קריטריון קבלה:** בחשבון B ההזמנה נשמרת אחרי reload, ואישור פותח את שיחת הקבוצה.

- [ ] **משימה 9.5: הצגת קבוצה ב־Discover**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/discover/DiscoverClient.tsx`, `web/src/components/discovery/SwipeCard.tsx`.
  - **הוראות טכניות ברורות:** צרוך projection קבוצתי קיים עם חברים בטוחים ו־discoverable; אל תגזור תקציב פרטי. שמור מעבר Individuals/Groups.
  - **קריטריון קבלה:** כרטיס הקבוצה מופיע בטאב Groups עם המשתתפים הנכונים; פרופילי המשתתפים עדיין נגישים בנפרד.

- [ ] **משימה 9.6: שיחה קבוצתית רגילה**
  - **קבצים לעריכה/יצירה:** `web/e2e/core-groups.spec.ts`.
  - **הוראות טכניות ברורות:** כתוב תרחיש ממוקד: יצירה, קבלת הזמנה, הודעה מכל חבר וטעינה מחדש. השתמש ב־fixtures מדויקים ובהרשאות רגילות.
  - **קריטריון קבלה:** npx playwright test e2e/core-groups.spec.ts --workers=1 עובר ללא skips; שני החברים רואים טקסט שמור.


### SL10 — שיתוף דירות בתוך צ׳אט

תלוי בקבוצה, פרטי דירה ושמירה. E7/E8/F3. זהו אחד הפיצ׳רים המבדלים, לפני השלמת מעטפות העמידות.

- [x] **משימה 10.1: חוזה הודעת כרטיס דירה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/chat/message-types.ts`, `web/src/types/database.ts`.
  - **הוראות טכניות ברורות:** הוסף/התאם union לטקסט ול־listing reference עם listing_id בלבד; snapshot אינו כולל כתובת/בעלים פרטיים. הפק types מחוזה מאומת, בלי any רחב.
  - **קריטריון קבלה:** TypeScript עובר; renderer יכול להבחין בטקסט ובכרטיס לפי kind, ללא שכפול private fields.

- [x] **משימה 10.2: שליחת reference מורשית**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000006_core_listing_card.sql`, `supabase/tests/plan_core_listing_card.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הרחב את פעולת שליחת ההודעה/פעולה נלווית תואמת: חברות פעילה, listing ציבורי, message sequence ואותו request key. שמור רק reference. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** A שולח דירה בקבוצה ושני החברים מקבלים הודעה אחת; אין save או inquiry שנוצרים מהשיתוף.

- [x] **משימה 10.3: בחירת יעד לשיתוף**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/ShareListing.tsx`, `web/src/components/listings/PublicListing.tsx`.
  - **הוראות טכניות ברורות:** הוסף chooser לשיחות מאושרות קיימות והפעל שליחת reference. אין ליצור קבוצה אוטומטית. עדכון בעלים 23.10: אפשר להעתיק קישור ציבורי מקומי לאורחים; אין אינטגרציה עם צ׳אט חיצוני.
  - **קריטריון קבלה:** המשתמש בוחר קבוצה או שיחה אישית; כרטיס מגיע רק ליעד שנבחר.

- [x] **משימה 10.4: תצוגת כרטיס בשרשור**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/ChatListingCard.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** הצג תמונה, מחיר, אזור וקישור locale באמצעות safe listing reader; תמוך ב־unavailable אם הדירה הוסרה. שמור את מזהה הקבוצה בהקשר הכרטיס.
  - **קריטריון קבלה:** הכרטיס נראה אחרי קבלה חיה ואחרי reload, ונפתח לפרטי הדירה הנכונה. אין חשיפת כתובת מדויקת בתוך תוכן ההודעה.

- [x] **משימה 10.5: שמירה אישית מתוך הכרטיס**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/ChatListingCard.tsx`.
  - **הוראות טכניות ברורות:** חבר useFavorites למשתמש הצופה בלבד. לחצן Save אינו vote של פנייה לבעלים ואינו משנה שמורים של שאר החברים.
  - **קריטריון קבלה:** A שומר מהכרטיס → A שמר ו־B לא; B יכול לשמור עצמאית. לא נשלחת פנייה.


### SL06 — פנייה אישית לבעל דירה

F4/D4/D18. ההזמנה ההפוכה של מפרסם תושלם בשלב ב׳; היא אינה תנאי לפניית דייר/קבוצה.

### SL06.3 — פנייה קבוצתית רק לאחר הסכמת כולם

החלטת הבעלים מ־20.10.2026: GROUP_LISTING_INQUIRIES, F4/E8. תלוי ב־6.1–6.5, SL09 וב־SL10. לא משתמשים ברוב/אישור מנהל במקום הסכמה מלאה.

- [ ] **משימה 6.6: אחסון סבב הסכמה קבוצתי**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000009_group_inquiry_consent_storage.sql`, `supabase/tests/plan_group_consent_storage.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף context group/listing, round עם membership_revision, snapshot חברים והסכמות ייחודיות לכל חבר. טבלאות מוגנות ופרטיות לקבוצה; לפני unanimity אין owner-facing inquiry. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שני חברים יכולים לקרוא סבב קבוצתם; בעל הדירה אינו רואה סבב פנימי שלא נשלח. נשמרת לכל חבר לכל היותר הסכמה אחת בסבב.

- [ ] **משימה 6.7: רישום הסכמה ושליחה בהסכמה מלאה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000010_group_inquiry_consent_action.sql`, `supabase/tests/plan_group_consent_action.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** ממש RPC אחד שמאשר בשם caller בלבד. בהסכמה האחרונה בדוק membership_revision ופעילות הדירה, ויצור פנייה קבוצתית אחת באותה transaction; retry מחזיר אותה. request key קשור ל־group/listing/round. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בקבוצה של שניים: אחרי A מוצג 1/2 ואין פנייה לבעלים; אחרי B מוצג 2/2 ובעלים רואה בדיוק פנייה אחת עם group context.

- [ ] **משימה 6.8: כפתור ומונה הסכמות בכרטיס**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/GroupInquiryConsent.tsx`, `web/src/components/chat/ChatListingCard.tsx`.
  - **הוראות טכניות ברורות:** בכרטיס בקבוצה הצג פנה לבעל הדירה, אישור אישי ומצב x/y; התחברות ל־RPC 6.7. כרטיס בשיחה אישית שומר פנייה אישית.
  - **קריטריון קבלה:** שני חברים מאשרים בנפרד; לפני האחרון אין sent state. שיתוף ושמירה אינם משנים x/y.

- [ ] **משימה 6.9: תצוגת פנייה קבוצתית לבעלים**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/OwnerInquiryCard.tsx`, `web/src/components/listings/GroupInquiryRequest.tsx`, `web/src/lib/listings/owner-inbox.ts`, `supabase/migrations/20261022000008_owner_group_inbox_projection.sql`, `supabase/tests/plan_owner_group_inbox.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** לאחר 6.6–6.8 הרחב קורא inbox בפניות group שנשלחו בלבד, ותצוגת סוג/קבוצה/חברים בטוחים באותו card. לפני unanimity אין רשומה/notification. GroupInquiryRequest adapter משותף, לא רשימת Chats נוספת. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בעלים רואה אחת אחרי כל ההסכמות ובמסנן הדירה הנכון; אין גישה לצ׳אט הפנימי או טלפונים.

- [ ] **משימה 6.13: תוקף הסכמות בעת שינוי הרכב**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000020_group_inquiry_membership_invalidation.sql`, `supabase/tests/plan_group_consent_revision.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** קשר join/leave/removal ל־membership_revision של סבב; אם השתנה לפני שליחה/accept, בטל תוקף הסכמות קודמות ודרוש סבב חדש. אין הוספת newcomer לשיחה/כתובת קיימות. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** חבר חדש אינו יורש אישור/כתובת/history; בעלים אינו מאשר pending עם הרכב ישן; חברים נוכחיים יכולים להתחיל סבב חדש.

- [ ] **משימה 6.10: אישור פנייה ויצירת שיחת בעלים קבוצתית**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000011_accept_group_listing_inquiry.sql`, `supabase/tests/plan_accept_group_inquiry.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** ממש accept מורשה לבעלים עם recheck לסבב ולהרכב: conversation apartment-context נפרד, owner וכל החברים שהסכימו, address grants אישיים. אין הוספת הבעלים לשיחת השותפים; אין העתקת היסטוריה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שני שותפים ובעלים רואים שיחה חדשה ושולחים טקסט; הבעלים אינו חבר בשיחת השותפים. בפנייה שטרם אושרה לא נפתחת שיחה.

- [ ] **משימה 6.11: חיבור ניווט לשיחה הקבוצתית החדשה**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/GroupInquiryRequest.tsx`, `web/src/components/listings/OwnerInquiryCard.tsx`, `web/src/lib/listings/group-inquiries.ts`, `web/src/app/(main)/chats/[conversationId]/page.tsx`.
  - **הוראות טכניות ברורות:** חבר accept מ־6.10 ל־inbox הקיים ול־conversationId החדש. הצג context דירה וחברים; personal/group ו־roommate-only נפרדים.
  - **קריטריון קבלה:** כל החברים והבעלים פותחים אותה שיחה חדשה; roommate history אינו מוצג לבעלים.

- [ ] **משימה 6.14: תחרות ואישור חוזר**
  - **קבצים לעריכה/יצירה:** `supabase/tests/plan_accept_group_inquiry.sql`, `supabase/tests/plan_core_inquiry_accept.sql`, `web/e2e/group-listing-inquiry.spec.ts`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** בדוק final-consent race, same key/different payload, accept כפול, block/unavailable/withdraw/reconfirm לפני accept; contexts אישיים וקבוצתיים אינם מתמזגים. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** מרוצים יוצרים בקשה ושיחה אחת לכל context; כשל אינו משאיר partial grants. unavailability דורשת חידוש הסכמות תקפות לפי D18.

- [ ] **משימה 6.12: בדיקת המסלול הקבוצתי הרגיל**
  - **קבצים לעריכה/יצירה:** `web/e2e/group-listing-inquiry.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק שלושה חשבונות רגילים: שיתוף, אישור ראשון, אישור אחרון, בקשת בעלים אחת, accept, הודעות ושמירה אחרי reload. בדוק גם שאין גישה לבעלים ל־roommate chat, ושהפנייה מופיעה במרכז הניהול ובמסנן הדירה הנכון.
  - **קריטריון קבלה:** npx playwright test e2e/group-listing-inquiry.spec.ts --workers=1 עובר ללא mocks/skips; 1/2 אינו שולח, 2/2 כן, והשיחה החדשה עובדת.

### הרחבת SL09 — כוונת דיור וכרטיס קבוצה עם דירה

חוזים: D12/E6/D18/D4 ו־docs/specs/GROUP_LISTING_INQUIRIES.md, סעיף Discover cards. הרחבה מאושרת בכיוון המוצר; הרשאת קישור מודעה אינה נגזרת מאישור פנייה לשכירות. אין תלות של פנייה קבוצתית ב־apartment_id של הקבוצה.

- [ ] **משימה 9.12: מצב דיור מפורש לקבוצה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/`, `supabase/tests/`, `scripts/test-resident-sql.mjs`, `web/src/types/database.ts`.
  - **הוראות טכניות ברורות:** אחרי 9.1 התאם את סכמת הקבוצה וקוראי השרת למצב מפורש מחפשים יחד/יש דירה/טרם נמסר; שמור apartment_id כקישור נפרד. NULL ישן אינו ״בלי דירה״; אין backfill מומצא או שינוי חברות. מחזר RPC וניהול מורשה קיימים, עם migration חדש תואם ומבחני ordinary admin/member/outsider/guest. אין מימוש הרשאת קישור שטרם הוכרעה.
  - **קריטריון קבלה:** מצב נשמר אחרי reload; מידע ישן נשאר לא ידוע; לקוח זר אינו משנה מצב; אין חשיפת העדפות פרטיות או כתובת. בדיקות SQL ולקוח רגיל נרשמו ביעד המזוהה.

- [ ] **משימה 9.13: קישור מודעה אמיתית בהרשאה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/`, `supabase/tests/`, `web/src/components/groups/GroupActions.tsx`, `web/src/types/database.ts`, `docs/specs/GROUP_LISTING_INQUIRIES.md`.
  - **הוראות טכניות ברורות:** אחרי 9.12 ורק לאחר הכרעת הרשאת הקישור ב־D12, חבר את המודעה האמיתית דרך שרת והצג פקדים מורשים. פנייה לשכירות אינה בקשת קישור, ואישור פנייה אינו יוצר קישור. בדוק בעלות/ניהול ותוקף בכל כתיבה; אין הענקת co-owner, העברת בעלות או גישה להיסטוריה/כתובת. הסרת מודעה או מילוי חדרים משמרים קבוצה ושיחות וכוונה, עם מצב לא זמין.
  - **קריטריון קבלה:** בקשות לא מורשות נדחות בצד השרת; רק מודעה מאומתת מופיעה בקישור; retry/שינוי זמינות/הסרה אינם יוצרים הבטחת חדר, מחיקת קבוצה או סגירת פניות אוטומטית. אם הרשאת הקישור לא הוכרעה, הכרטיס נשאר חסום בלבד.

- [ ] **משימה 9.14: כרטיס קבוצתי עם הקשר דיור אמיתי**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/discover/DiscoverClient.tsx`, `web/src/components/groups/GroupActions.tsx`, `web/src/types/database.ts`, `supabase/migrations/`, `supabase/tests/`.
  - **הוראות טכניות ברורות:** אחרי 9.5/9.13 צרוך projection ציבורי מורשה עם אנשים, כוונה ותקציר מודעה עדכני. השתמש בעיצוב הקיים ובמוקאפ כהיררכיה בלבד: תמונה, אזור ציבורי, מחיר חדר/טווח אמיתי וזמינות וקישור למודעה; היכרות קבוצתית קיימת נשמרת. אסוף כוונה מפורשת דרך ניהול מורשה; אין הסקת ״בלי דירה״ מ־NULL, תיבת קבוצות/מסך חיפוש חדשים או כפתור ללא מסלול עובד.
  - **קריטריון קבלה:** המשתמש מבדיל בין מסעות עם/בלי דירה; דירה ואנשים מוצגים יחד לפני הצטרפות; יש/אין מידע ומודעה מלאה/מוסרת מציגים אמת. אורח/זר אינם קוראים כתובת, תקציב פרטי או שיחה.

- [ ] **משימה 9.15: קבלת מסעות וכרטיסי דיור קבוצתיים**
  - **קבצים לעריכה/יצירה:** `web/e2e/core-groups.spec.ts`, `web/e2e/group-listing-inquiry.spec.ts`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** אחרי 9.14/6.12 בדוק ordinary actors במחשב ובטלפון HE/EN/RTL, טקסט ארוך, נתון חסר ו־reload; צלם ובדוק פיקסלים. אמת בנפרד קבוצה מגייסת עם מודעה וקבוצה מחפשת שפונה למודעה של אחר בלי apartment_id. שתי קבוצות ויחיד פונים לאותה מודעה; ביטול/אישור של אחת אינם סוגרים לאחרים או משתפים היסטוריה. אין המרת אישור שיחה לאכלוס.
  - **קריטריון קבלה:** הראיות כוללות כרטיס, דף דירה, הסכמה מלאה, תיבת בעלים ושיחה נפרדת נשמרת; הרשאות זר והיסטוריית מצטרף נבדקו; מצב לא זמין ושיחה מאושרת נותרים מובנים. חסם בדירות הדמו אינו מכשיר נתון מומצא או סגירת בדיקה שלא בוצעה.

### SL11 — הקבוצה אינה סוגרת דירה

D18/E4/E10. נשארת בעלות אישית על נכס.

- [ ] **משימה 11.1: הפרדת שיתוף/פנייה מזמינות**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/GroupActions.tsx`, `web/src/app/(main)/my-listings/actions.ts`, `web/e2e/core-lifecycle.spec.ts`.
  - **הוראות טכניות ברורות:** הסר רק side effect קיים שמסמן דירה כתפוסה עקב יצירת קבוצה, שיתוף או accept inquiry. שמירת מצב חדר היא פעולה נפרדת של בעלים.
  - **קריטריון קבלה:** תרחיש core-lifecycle: קבוצה משתפת ופונה, בעלים מאשר, החדר נשאר זמין עד פעולת בעלים מפורשת.

- [ ] **משימה 11.2: סימון חדרים בלתי זמינים במפורש**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/my-listings/RentedButton.tsx`, `web/src/app/(main)/my-listings/MyListingsPage.tsx`.
  - **הוראות טכניות ברורות:** חבר את פעולת הסגירה הקיימת לאישור בעלים בלבד; הצג מצב עדכני וקישור לדירה/לשיחה. אל תארכב קבוצה.
  - **קריטריון קבלה:** בעלים מסמן unavailable; הדירה יוצאת מחיפוש חדש, והשיחה המאושרת וקבוצת השותפים עדיין נפתחות.


### SL16 — שער יכולת הצגה

זה subset מוקדם להדגמה, לא השלמת packet SL16.1. אין משימת צילום/הפקת דמו.

- [x] **משימה 16.31: שחזור גישה לארבעת חשבונות הדמו המאושרים**
  - **קבצים לעריכה/יצירה:** `web/scripts/recover-demo-access.mjs`, `web/.qa/demo-recovery/credentials.json`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** השתמש בכלי הקיים בלבד ובמניפסט שהוכן; אל תייצר סיסמאות חדשות או תבנה SQL relay. אישור הבעלים לשחזור ארבעת מזהי de100001 ending 1–4 כבר קיים. חסר מפתח שרת בקובץ הפרטי בלבד; בלי מפתח אין פעולת Auth. אחרי preflight יעד וכל ארבע הזהויות הפעל recovery עם checkpoint וכניסה רגילה; אין שינוי תוכן הפרופיל.
  - **קריטריון קבלה:** ארבע הזהויות המדויקות עוברות ordinary sign-in; ריצה חוזרת אינה משנה שוב סיסמה תקינה; credentials נשארים ignored ואין פגיעה בשני חשבונות הדמו הנוספים.

- [x] **משימה 16.32: ארבע תמונות אדם סינתטיות להצגה**
  - **קבצים לעריכה/יצירה:** `web/public/demo-content/portraits/`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** הכן ארבע תמונות מובחנות של בגירים בדיוניים בלבד, ממקור generated/licensed מתאים. רשום מקור/זכויות, path, hash ומידות ברשומת assets פרטית תחת .qa/demo-recovery. אל תעלה לשרת ואל תשנה פרופילים. אין scraping של אנשים או שימוש בתמונת 1x1/placeholder.
  - **קריטריון קבלה:** ארבע תמונות תקינות נפתחות ומציגות אנשים סינתטיים מובחנים; לפחות 480×600; מקור ושיוך לכל קובץ מתועדים ואין מידע אישי אמיתי.

- [x] **משימה 16.33: גלריות תמונה לשלוש דירות דמו**
  - **קבצים לעריכה/יצירה:** `web/public/demo-content/apartments/`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** הכן שלושה סטים מובחנים ועקביים של פנים דירה בדיונית עם 3–8 תמונות בכל סט, מקור generated/licensed מותר ומידות לפחות 1200×800. שמור מקור/hash/path ברשומת assets הפרטית הקיימת. בלי כתובות אמיתיות, פרסום או העלאה לשרת.
  - **קריטריון קבלה:** כל סט מציג cover וגלריה באיכות צפייה; קבצים נפתחים, מקורם מתועד ואין placeholder או מצג של נכס אמיתי מוצע להשכרה.

- [x] **משימה 16.34: השלמת ארבעת פרופילי הדמו דרך מסלול בעלים קיים**
  - **קבצים לעריכה/יצירה:** `web/scripts/ensure-demo-content.mjs`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** אחרי 16.31 ו־16.32, השלמת שדות מאושרים ותמונה בבעלות דרך ordinary owner sessions, gallery ו־save_resident_profile הקיימים. שמור מזהים/קבלות upload פרטיים; הרץ לפני שינוי בדיקת existing content כדי לעדכן רק חוסר. אין schema/config, שינוי שאלון, reset לחשבונות או חשיפת שדות פרטיים.
  - **קריטריון קבלה:** ארבעה פרופילים מלאים ותמונה מאושרת נשמרים ונקראים מה־projection הציבורי; outsider אינו קורא private DOB/phone/preferences; ריצה שנייה אינה מייצרת חשבון או media כפולים.

- [ ] **משימה 16.35: פרסום שלוש דירות דמו בבעלות דרך המסלול הקיים**
  - **קבצים לעריכה/יצירה:** `web/scripts/ensure-demo-content.mjs`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** אחרי 16.31 ו־16.33, השתמש ב־ordinary owner session וב־publish_apartment_once/מסלול הפרסום הקיים; דייר רשאי לפרסם בלי המרה למפרסם. נתוני דמו מסומנים, כתובת/תנאי פרסום תקינים לפי החוזה, room/cover/gallery מהסט המאושר ומפתח פרסום קבוע לכל דירה. אם חסרה כתובת מאושרת או יכולת ספק, עצור את הפרסום הזה ולא תמציא קואורדינטות/בעלות.
  - **קריטריון קבלה:** שלוש דירות מציגות room data וגלריות תקינות; מזהי הדירות/מפתח הפרסום נשמרים פרטית; ניסיון חוזר אינו מכפיל דירה/תמונות ואין שינוי נכס או משתמש אחר.

- [ ] **משימה 16.36: קבלת תמונות ותוכן הדמו בממשק**
  - **קבצים לעריכה/יצירה:** `web/e2e/demo-content.spec.ts`, `docs/KNOWN_ISSUES.md`, `docs/workstreams/2026-10-25-mvp-focus-audit.md`.
  - **הוראות טכניות ברורות:** אחרי 16.34/16.35, בדוק את אותם מזהים ב־Discover/Map/cards/details ב־HE/EN בטלפון ובמחשב. אמת image load/dimensions, refresh persistence ו־rerun ללא כפילות. הפרד missing content, object/URL permission ו־renderer failure. אין redesign או יצירת cohort נוסף.
  - **קריטריון קבלה:** האנשים והדירות נפתחים עם תמונות אמיתיות במסלול; תמונה לא שבורה/placeholder, refresh נשמר והרצה חוזרת ללא כפילות. ציין ראיות או חסם מדויק לכל assertion; build אינו קבלת תמונות.

- [ ] **משימה 16.1: קבלת מפת חשבונות ונתוני ההצגה**
  - **קבצים לעריכה/יצירה:** `docs/workstreams/2026-10-25-mvp-focus-audit.md`, `docs/KNOWN_ISSUES.md`.
  - **הוראות טכניות ברורות:** זו קבלת התוצאה של 16.31–16.36 בלבד. אמת ראיות שנשמרו, תפקידי גישה, מקור ופרטיות; אל תבצע שוב את כל הכנת הדמו ואל תיצור מסמך חדש. קדימות owner 16.1 נשלחת בפועל לתת־משימה הזכאית הקטנה הבאה. לאחר קבלה וסימון 16.1 בלבד, שנה owner_priority_override.status ל־completed ב־execution-state כדי להחזיר את התור הרגיל בלי תיווך הבעלים.
  - **קריטריון קבלה:** כל שש תתי־המשימות מאומתות, יש נתונים שמישים ומקורות תמונה חוקיים, credentials פרטיים וראיות תמונה HE/EN/mobile/desktop. אין סימון SL16 או ה־MVP כולו כהושלם מכוח הדמו.

- [ ] **משימה 16.2: תרחיש core אחד מקצה לקצה**
  - **קבצים לעריכה/יצירה:** `web/e2e/demo-core.spec.ts`.
  - **הוראות טכניות ברורות:** חבר reuse של פעולות UI: גילוי, קשר, קבוצה, דירה, share, personal save, individual inquiry, unanimous group inquiry, owner accept, text/reload. בלי בדיקות עומס או הזרקת כשל.
  - **קריטריון קבלה:** npx playwright test e2e/demo-core.spec.ts --workers=1 עובר במסלול רגיל. השיתוף והפנייה הקבוצתית עובדים בפועל; עד השלמתם אין תווית core-demo-ready.

- [ ] **משימה 16.3: הוראות הפעלה קצרות להצגה**
  - **קבצים לעריכה/יצירה:** `docs/DEMO_CORE.md`, `docs/KNOWN_ISSUES.md`.
  - **הוראות טכניות ברורות:** תעד כתובת app, מקור/SHA/backend, סדר לחיצות קצר, תפקידי חשבונות והגבלות אמיתיות. רשום פערים נדחים עם מספרי משימות שלב ב׳, בלי לדרוש לבצע עכשיו הצגה או סרטון. רק לאחר שכל משימות א׳ וקבלת המסלול 16.2 עברו, שמור stage_acceptance.A ב־execution-state עם status=verified, source_sha מדויק, verified_at, handoff קיים ובדיקות passed. המעבר לב׳ נגזר מכך; ראיות חסרות נשארות pending.
  - **קריטריון קבלה:** אדם אחר יכול להיכנס ולעבור במסלול הקיים; אין טענה שהדמו מוכיח משתמשים פעילים, עמידות, אישור משפטי או הבטחת השקעה.


## שלב ב׳ — השלמת MVP, התאוששות ועמידות

מתחילים רק אחרי 16.3. אין למחוק פערים שנדחו; סוגרים אותם לפי בדיקות בפועל. התלויות הנדרשות כבר נבנו בשלב א׳; מפרט חסר עדיין אינו רשות להמציא מדיניות.

### SL00 — חוזים משותפים מלאים

J1–J7/J10–J14, TAXONOMY ו־TECHNICAL_DEFAULTS. אין שינוי בערכי מוצר לצורך בדיקה.

- [ ] **משימה 0.4: אימות manifest קיים של הטקסונומיה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/contracts/taxonomy.ts`, `scripts/test-contracts.mjs`, `scripts/generate-profile-schema.mjs`.
  - **הוראות טכניות ברורות:** בדוק 31 מזהי קטגוריות, אפשרויות HE/EN, none לעומת unknown, facts לעומת preferences ו־disclosure. תקן רק פער מול TAXONOMY.
  - **קריטריון קבלה:** node --test scripts/test-contracts.mjs ו־node scripts/generate-profile-schema.mjs --check עוברים; אין שינוי משקולות או מיזוג זהויות.

- [ ] **משימה 0.5: הגדרות טיפוסיות וגבולות חשיפה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/contracts/config.ts`, `docs/CONFIG_KEY_INVENTORY.md`, `scripts/test-contracts.mjs`.
  - **הוראות טכניות ברורות:** מפה ערכי runtime מול constants; אמת type/range/fallback/public allowlist לפי החוזה. מקור נוסף: רשומת App Config ב־PROJECT_STATUS וענף f62b3aa של e21c; בדוק מה כבר שולב ותאם בעלות לפני שינוי כדי לא לשחזר עבודה קיימת או לדרוס את inventory. תעד כל key חדש; secrets נשארים environment בלבד. אין כאן הרשאה למיזוג גורף של ענף ישן או להפעלת מיגרציות.
  - **קריטריון קבלה:** בדיקה מוכיחה ש־key לא מוכר נשאר private, וערך שגוי מטופל לפי fallback מאושר. לא שונו ערכי config משותפים ב־QA.

- [ ] **משימה 0.6: חוזה cursor ושגיאות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/contracts/api.ts`, `scripts/test-api-contracts.mjs`.
  - **הוראות טכניות ברורות:** הוסף types/adapters לחוזה items/next_cursor/has_more/projection_version ולשגיאות המוגדרות. אימות cursor בצד שרת בלבד; signature HMAC ו־query/account/version/expiry.
  - **קריטריון קבלה:** node --test scripts/test-api-contracts.mjs עובר: cursor תקין נקרא, הקשר שונה/חתימה שגויה/תפוגה מוחזרים כ־CURSOR_STALE ללא private fields.


### SL01 — טיוטה, עריכה, הגדרות וגבולות פרופיל

B1/B2/B5/B6/B9/B10/I9/I16/I22. אין שכתוב של הפרופיל הקנוני שכבר עובד.

- [ ] **משימה 1.5: שמירת טיוטה וחזרה לעריכה**
  - **קבצים לעריכה/יצירה:** `web/src/components/profile/ResidentProfileForm.tsx`, `web/src/app/(main)/profile/edit/EditProfileForm.tsx`, `web/e2e/canonical-profile.spec.ts`.
  - **הוראות טכניות ברורות:** אמת draft/resume ושמור פרטי שדות/תמונות קיימים; עריכה מעבירה revision/request_key ל־RPC. טפל ב־VERSION_CONFLICT בלי overwrite.
  - **קריטריון קבלה:** טיוטה נטענת אחרי signout/login; טאב ישן מקבל conflict; הנתונים שנשמרו בטאב החדש נשארים.

- [ ] **משימה 1.6: גלריה ותמונה אחרונה**
  - **קבצים לעריכה/יצירה:** `web/src/components/profile/ResidentProfileForm.tsx`, `web/scripts/qa-profile-photo-guard.mjs`.
  - **הוראות טכניות ברורות:** אמת primary/remove ודרישת תמונה בבעלות לפרופיל מושלם; תקן UI בלבד אם השרת כבר אוכף. בדוק Storage רגיל על fixture חדש ייעודי.
  - **קריטריון קבלה:** primary נשמר; מחיקת תמונה אחרונה בפרופיל מושלם נדחית ובדיקת bytes חוזרת עדיין מצליחה. לא משתמשים בדמו שמור לבדיקה הרסנית.

- [ ] **משימה 1.7: גיל ופרטיות מול השרת**
  - **קבצים לעריכה/יצירה:** `scripts/test-canonical-profile-sql.mjs`, `web/scripts/qa-canonical-age.mjs`.
  - **הוראות טכניות ברורות:** הרחב רק בדיקות חסרות לגבול גיל לפי שעון DB, public/private columns ו־disclosure; בדוק גם direct client, ולא רק form.
  - **קריטריון קבלה:** בדיקת canonical SQL ולקוח רגיל דוחים גיל מתחת ל־18 ושינוי verified פרטי; outsider אינו מקבל שם מלא/העדפות.

- [ ] **משימה 1.8: בחירת מסך פתיחה ושפה**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/settings/DefaultHomeSelect.tsx`, `web/src/app/(main)/settings/LanguageStatus.tsx`, `web/src/utils/navigation.ts`.
  - **הוראות טכניות ברורות:** שמור העדפת Discover/Map ונתיבי HE/EN; ל־lister startup נשאר My Listings. חבר signout לניקוי session/ערוצים הקיימים.
  - **קריטריון קבלה:** העדפה נשמרת אחרי כניסה מחדש בשתי שפות; דייר ומפרסם מגיעים ליעדם בלי redirect loop.

- [ ] **משימה 1.9: המרת דייר למפרסם**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/settings/ConvertToLister.tsx`, `web/e2e/lister-conversion.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק את convert_to_lister הקיים: הסבר, טלפון פרטי, סירוב בקבוצה פעילה ושימור היסטוריה/פרופיל פרטי. אין הוספת המרה הפוכה.
  - **קריטריון קבלה:** הבדיקה עוברת: חבר קבוצה מסורב ללא mutation; דייר זכאי מומר, מוסתר מגילוי וממשיך היסטוריה ישירה מותרת.

- [ ] **משימה 1.10: אימות Google ונתיבי auth תקולים**
  - **קבצים לעריכה/יצירה:** `web/e2e/resident-auth-guest.spec.ts`, `docs/workstreams/implementation-plan-SL01.md`.
  - **הוראות טכניות ברורות:** הרץ roundtrip Google אמיתי כשיש חשבון מורשה; בדוק ביטול/קישור שפג/return חיצוני. אם חסר שלב אנושי, רשום assertion חסר במפורש בלי לסגור packet.
  - **קריטריון קבלה:** תוצאת כניסה אמיתית או blocker מדויק מתועדים; 302 לספק אינו מסומן כהשלמת Google. בדיקות callback/safe return העצמאיות עברו.


### SL02 — טיוטת דירה, אמינות פרסום וכתובת

D2/D3/D4/D19/J9; על אותה דירה ובעלים.

- [ ] **משימה 2.8: רגרסיית טיוטות מרובות ומקור פתיחה**
  - **קבצים לעריכה/יצירה:** `web/e2e/listing-drafts.spec.ts`.
  - **הוראות טכניות ברורות:** בדיקת המשך מקור/חשבון לאחר מימוש 2.16–2.33: סגירה/reopen/reload/signout/login של טיוטת ענן מרובה, עם תמונות. אין מימוש נוסף של account-only IndexedDB; הוא מקור ייבוא בלבד.
  - **קריטריון קבלה:** הנתונים והתמונות נשמרים; חשבון אחר אינו טוען אותם; מקור המסך מתחת ל־overlay נשמר.

- [ ] **משימה 2.9: פתיחה וסגירה כ־overlay**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/ComposePage.tsx`, `web/src/components/navigation/BottomNav.tsx`.
  - **הוראות טכניות ברורות:** שמור origin בעת פתיחת Plus, הצג composer כ־overlay וחזור למסך/מצב הקודם בסגירה. direct URL נשאר מסלול נתמך.
  - **קריטריון קבלה:** פתיחה מ־Map ומצ׳אט חוזרת לכל מקור בסגירה בלי לאבד בחירה/scroll; direct compose עדיין נפתח.

- [ ] **משימה 2.10: מפתח פרסום וניסיון חוזר**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000012_publish_request_key.sql`, `supabase/tests/plan_publish_retry.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף idempotency ל־publish: actor/operation/key, normalized payload hash ו־result reference; אותו key/payload מחזיר אותה דירה, payload אחר conflict. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שתי קריאות חוזרות ושתי קריאות במקביל יוצרות דירה אחת; כשל בתוך write אינו משאיר דירה/חדרים ציבוריים חלקיים.

- [x] **משימה 2.11: שחזור פרסום אחרי תשובה שאבדה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/actions.ts`, `web/src/app/(main)/compose/ComposeForm.tsx`, `web/e2e/sl02-local.spec.ts`.
  - **הוראות טכניות ברורות:** החזק request key עד תוצאה ידועה והשתמש בו ב־retry; אל תמחק תמונות ששויכו לפרסום שהצליח כאשר רק התשובה אבדה.
  - **קריטריון קבלה:** בדיקת publish-retry מדמה response lost; Retry מגיע לאותו listing ID, עם תמונות קיימות וללא פרסום כפול.

- [ ] **משימה 2.12: ניקוי תמונות שלא שויכו**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/actions.ts`, `web/src/lib/listings/photo-cleanup.ts`, `web/scripts/listing-photo-cleanup.test.mjs`.
  - **הוראות טכניות ברורות:** עקוב אחרי paths שיצרה הפעולה והסר דרך Storage API רק uploads שהוכח שלא שויכו; אל תמחק metadata ב־SQL או תמונות של פעולה אחרת.
  - **קריטריון קבלה:** node --test web/scripts/listing-photo-cleanup.test.mjs עובר; העלאה שנכשלה אינה משאירה object יתום והעלאה משויכת נשמרת.

- [ ] **משימה 2.13: הגנות lookup ומדיניות provider**
  - **קבצים לעריכה/יצירה:** `web/src/app/api/geocode/route.ts`, `web/src/lib/listings/geocoding.ts`, `web/scripts/address-lookup.test.mjs`.
  - **הוראות טכניות ברורות:** אמת debounce/timeout/cancel ותקציב RPC קיים; >=3 תווים, עד חמש תוצאות, 30/account/min לפי TECHNICAL_DEFAULTS. כשל/key חסר מפעילים manual fallback; אין Nominatim autocomplete.
  - **קריטריון קבלה:** node --test web/scripts/address-lookup.test.mjs עובר כולל out-of-order response ו־429. תוצאת ספק ישנה אינה מחליפה כתובת שנבחרה.

- [x] **משימה 2.14: חתימת בחירת כתובת**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/geocoding.ts`, `web/src/lib/listings/actions.ts`, `web/scripts/address-lookup.test.mjs`.
  - **הוראות טכניות ברורות:** אמת token הקשור ל־actor, טקסט מנורמל, coords, provider ו־TTL 15 דקות; אישור ידני מסומן ככזה ולא כאימות ספק.
  - **קריטריון קבלה:** actor אחר, coords ששונו ו־token שפג נדחים; מסלול ידני תקין עדיין מפרסם דירה.

- [ ] **משימה 2.15: בדיקת ספק ותצוגת עובדות דירה**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/compose/ComposeForm.tsx`, `web/src/lib/listings/validation.ts`, `docs/workstreams/implementation-plan-SL02.md`.
  - **הוראות טכניות ברורות:** אמת facts של דירה מול TAXONOMY ו־HE/EN; בדוק כתובת אמיתית בבאר שבע ותל אביב ומספר בית חסר. אין חסימת עיר מחוץ למוקד השיווק.
  - **קריטריון קבלה:** דירה תקינה מחוץ לבאר שבע מתקבלת, עובדות נשמרות באותם IDs, וראיות ספק אמיתי נבדלות מ־mocks; מגבלת ספק מצוינת.


### SL03 — פרטיות מיקום, עימוד וחיפוש מלא

MAP_SEARCH ו־TECHNICAL_DEFAULTS. שינוי פרטיות חי מחייב review/history/תיאום עם בעל העבודה, לא replay עיוור.

- [ ] **משימה 3.6: נקודה ציבורית אקראית יציבה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000013_persisted_public_location.sql`, `supabase/tests/plan_public_location.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** החלף רק מנגנון חסר/פגום בנקודה אקראית קריפטוגרפית נשמרת ב־300–700m, מופרדת מהנקודה המדויקת; ללא seed/כיוון הנגזרים מ־public ID. תכנן מעבר יחיד ללא dual-point API. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בדיקה סינתטית מוכיחה יציבות reload/edit, טווח הסטה והיעדר inversion באמצעות public ID; אין ריצה על נתוני דייר אמיתיים.

- [ ] **משימה 3.7: בדיקת כל משטחי הדליפה**
  - **קבצים לעריכה/יצירה:** `web/e2e/listing-privacy.spec.ts`, `docs/workstreams/implementation-plan-SL03.md`.
  - **הוראות טכניות ברורות:** בדוק guest/outsider API, HTML, metadata, cursor, card ו־logs מול listing fixture; רשום גם סיכון טקסט/צילום שאינו נפתר מהסטת נקודה.
  - **קריטריון קבלה:** אין exact address/lat/lng או seed באף payload ציבורי; תוצאת privacy/averaging/boundary מתועדת ללא טענת אנונימיות מוחלטת.

- [ ] **משימה 3.8: חוזה viewport מוגבל**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000014_bounded_viewport_search.sql`, `supabase/tests/plan_viewport_bounds.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת bounds מספריים, cap 500, truncated ומסנני חדר באותה שורה; public coords בלבד. שמור תאימות ל־caller קיים באמצעות adapter. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** fixture מעל cap מחזיר truncated; bounds לא תקינים נדחים; המחירים/התאריכים מסננים על אותו חדר.

- [ ] **משימה 3.9: Search this area ופתיחת cluster**
  - **קבצים לעריכה/יצירה:** `web/src/components/map/LeafletMap.tsx`, `web/src/app/(main)/map/MapClient.tsx`.
  - **הוראות טכניות ברורות:** הצג בקשת Search this area אחרי pan, zoom-in כשהתוצאות חלקיות ובחירה נגישה בין pins חופפים. בטל תוצאה ישנה בזמן שינוי query.
  - **קריטריון קבלה:** כל דירה ב־cluster ניתנת לפתיחה גם במקלדת; pan אינו מחליף בחירה בתשובה ישנה; city switch יכול להציג דירה מחוץ לעיר הקודמת.

- [ ] **משימה 3.10: metadata וכתובות לא פעילות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/public.ts`, `web/src/app/listings/[listingId]/layout.tsx`, `web/src/app/en/listings/[listingId]/layout.tsx`, `web/e2e/listing-slices.spec.ts`.
  - **הוראות טכניות ברורות:** אמת SSR/OG/locale ולינקים לא קיימים/מוסרים; אין cache משותף למידע פרטי או stale listing מוסתר.
  - **קריטריון קבלה:** guest רואה metadata בטוח, IDs חסרים/מוסרים מקבלים 404/מצב unavailable מאושר; שתי השפות עוברות.


### SL04 — עריכה ומחזור חיים של דירה

משימות עריכה וחדרים הועברו לרצף SL04.2 בשלב א׳. כאן נשארת תפוגה/חידוש 4.6; אין מסלול עריכה נוסף.

- [ ] **משימה 4.6: תפוגה וחידוש**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000017_listing_expiry_renewal.sql`, `supabase/tests/plan_listing_renewal.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף read-time expiry של 45 יום ו־renew מפורש שמחליף renewed_at/cohort. ordinary edit אינו renew; restriction של reviewer גובר על renewal. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** בדיקות יום 44/45 וחידוש עוברות; עריכת כותרת אינה מאריכה תוקף; חידוש אינו עוקף חסימת reviewer.

### SL05 — עמידות ופרטיות שמורים

G1/G2/J4; אין רשימת זהויות שומרים לבעלים.

- [ ] **משימה 5.3: toggle חוזר וספירה ייחודית**
  - **קבצים לעריכה/יצירה:** `supabase/tests/plan_core_saves.sql`, `web/e2e/saves.spec.ts`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף בדיקות retries/concurrent saves, unique current count והיעדר inquiry; אם נמצא כשל תקן במיגרציה חדשה במשימת תיקון נפרדת לפני סגירה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** פעמיים אותו save לא מגדיל פעמיים, unsave מפחית אחד; identities לא ניתנים enumeration מצד owner/outsider.

- [ ] **משימה 5.4: תצוגת שמורים לא זמינים**
  - **קבצים לעריכה/יצירה:** `web/src/components/discovery/ListingCard.tsx`, `web/src/hooks/useFavorites.ts`.
  - **הוראות טכניות ברורות:** הצג unavailable לכרטיס שכבר אינו ציבורי; שמור יכולת unsave פרטית. אין שחזור כתובת/תמונה פרטית מ־snapshot ישן.
  - **קריטריון קבלה:** הסתרת listing לא שוברת שמורים; A מסיר את השמירה בלי להפעיל inquiry או לשנות state של B.


### SL08 — unread, reconnect, הקלדה ועזיבה

F1/F2/F5/F8; קיים מימוש sequence/read שיש לשמר.

- [ ] **משימה 8.4: קבלת מונה קריאה קיים**
  - **קבצים לעריכה/יצירה:** `scripts/test-resident-sql.mjs`, `web/e2e/chat-unread.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק own-sender exclusion, focused visible render, GREATEST read marker ושני טאבים. אל תחליף DB marker במונה client.
  - **קריטריון קבלה:** SQL ו־chat-unread עוברים עם שני דפדפנים; own send אינו מוסיף unread ו־hidden tab אינו מסמן read.

- [ ] **משימה 8.5: עימוד היסטוריה ו־catch-up**
  - **קבצים לעריכה/יצירה:** `web/src/lib/chat/history.ts`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** שלוף סדרות מוגבלות לפי seq, join cutoff ו־cursor; reconnect משלים gap ושומר dedupe ID/sort server seq. no fetch-all.
  - **קריטריון קבלה:** ניתוק והתחברות משחזרים הודעות פעם אחת; טעינת עמוד קודם לא מציגה prejoin history.

- [ ] **משימה 8.6: קבלות קריאה**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/ReadReceipt.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** הצג markers מורשים לפי participant והודעה, כולל קבוצה; אל תציג marker של מי שאין הרשאת צפייה במצבו. receipt אינו הודעה.
  - **קריטריון קבלה:** A רואה receipt לאחר B קורא בחלון ממוקד; receipt אינו משנה סדר או unread.

- [ ] **משימה 8.7: מחוון הקלדה פרטי**
  - **קבצים לעריכה/יצירה:** `web/src/hooks/useConversationTyping.ts`, `web/src/components/chat/TypingIndicator.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** private channel מורשה; broadcast לכל היותר פעם ב־2s, תפוגה 5s, clear ב־blur/send/exit. אין persistence.
  - **קריטריון קבלה:** משתתף רואה הקלדה שנעלמת אחרי idle/exit; אין message/unread/outbox עקב typing.

- [ ] **משימה 8.8: עזיבה ופתיחה מחדש**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000018_conversation_leave_reopen.sql`, `supabase/tests/plan_conversation_leave.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** RPC caller מסתיר thread ועוצר notifications; הודעה נכנסת אינה מחזירה thread; reopen מפורש לפי F5/H1/history. אין delete-for-all. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** leave מסתיר רק אצל היוזם; peer שומר היסטוריה; הודעה חדשה אינה מבטלת leave, reopen משחזר רק היסטוריה מותרת.

- [ ] **משימה 8.9: פקדי עזיבה ופתיחה**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/LeaveConversation.tsx`, `web/src/app/(main)/chats/page.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** חבר leave/reopen עם הסבר שהם שונים מ־block; שמור גישה למצב השיחות שעזבו דרך פעולה מפורשת.
  - **קריטריון קבלה:** משתמש יכול לעזוב ולפתוח מחדש בלי לחסום peer ובלי למחוק את שיחתו.

- [ ] **משימה 8.10: מגבלת שליחת הודעות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000019_message_rate_limits.sql`, `supabase/tests/plan_message_throttle.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אכוף F8 בגבול DB: 30/account/min מתגלגל ו־5/5s, בדיקת חברות קודם, retry_after; request-key retry אינו send חדש. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** גבולות זמן מוזרקים מקומית; חריגה נדחית ללא message נוסף או אובדן draft; מותר לענות בשיחות קיימות במסגרת המכסה.

- [ ] **משימה 8.11: הרשאת Realtime אחרי שינוי גישה**
  - **קבצים לעריכה/יצירה:** `web/scripts/qa-chat-authorization.mjs`, `web/e2e/chat-revocation.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק ordinary REST וערוץ ישן אחרי block/logout/member removal; אם הערוץ אינו חוסם payload בזמן, העבר רק signal ושלוף מידע דרך API מורשה.
  - **קריטריון קבלה:** socket ישן אינו מספק תוכן חדש אסור; אין קבלה על סמך unsubscribe ב־UI בלבד. תוצאת hosted/local נרשמת בנפרד.


- [ ] **משימה 8.12: תרגום הודעות מערכת מוכרות בצ׳אט**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`, `web/e2e/chat-system-locale.spec.ts`.
  - **הוראות טכניות ברורות:** מקור CHAT-SYSTEM-LOCALE-001 ברשומת התקלות. אחרי 8.3, התאם הצגת אירוע אישור פנייה מוכר ל־HE/EN בגבול התצוגה, עם kind=system ומזהה אירוע יציב או allowlist מדויק לתבנית legacy מוכרת. אין זיהוי באמצעות substring של טקסט רגיל, אין תרגום הודעות משתמשים או כתיבה להיסטוריה. ערך לא מוכר נשמר ב־fallback הקיים; אל תשנה הרשאות/כרטיס כתובת או SQL.
  - **קריטריון קבלה:** בדיקת שרשור ב־HE/EN וב־390px/desktop מציגה את אירוע האישור המוכר בשפת המסך גם אחרי reload. הודעת משתמש עם אותו טקסט נשמרת כפי שנכתבה, system לא מוכר נשמר, וכרטיס הכתובת נשאר מוגבל לבעלים/פונה שאושר. מקור/יעד ותוצאות הבדיקה נרשמים; תיקון אינו מוצג כאילו כבר בוצע.

### SL06 — אמינות פניות והזמנה הפוכה

משלימים לאחר שפנייה אישית וקבוצתית כבר ניתנות להצגה. POSTER_OUTREACH ו־GROUP_LISTING_INQUIRIES.

- [ ] **משימה 6.15: אחסון הזמנת מפרסם לדירה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000021_poster_invitation_send.sql`, `supabase/tests/plan_poster_invitation_send.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** ממש poster_listing נפרד: B10 או דייר בעל דירה, listing בבעלות פעיל, recipient, טקסט אופציונלי ו־request key. צרוך C7 במשותף עם intros; אין שיחה לפני אישור. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** מפרסם מזמין עם דירה שלו; ניסיון עם דירת אחר נדחה. retry לא צורך slot נוסף ולא מופיע ברשימת שיחות accepted.

- [ ] **משימה 6.16: אישור ודחיית הזמנת מפרסם**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000022_poster_invitation_decide.sql`, `supabase/tests/plan_poster_invitation_decide.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** recipient בלבד מקבל/דוחה; accept אטומי conversation/members/grant ומצבים מאומתים. decline אינו pass; room reference אינו reservation. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** accept פותח context נכון ומעניק כתובת רק לנמען; decline אינו יוצר שיחה ואינו מסתיר אדם כ־pass.

- [ ] **משימה 6.17: בחירת דירה להזמנה**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/InviteWithListing.tsx`, `web/src/app/(main)/discover/DiscoverClient.tsx`.
  - **הוראות טכניות ברורות:** הוסף CTA למפרסם ובחר רק דירה פעילה שלו; הצג זהות מפרסם בטוחה ו־pending/error. אין רשימת שומרים או אחוז התאמה מומצא למפרסם.
  - **קריטריון קבלה:** מפרסם חשבון־בלבד ומפרסם שהומר יכולים להזמין; resident recipient רואה דירה וזהות בטוחה בלבד.

- [ ] **משימה 6.18: קבלת הזמנה הפוכה ב־UI**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/PosterInvitation.tsx`, `web/src/app/(main)/chats/page.tsx`, `web/e2e/poster-invitation.spec.ts`.
  - **הוראות טכניות ברורות:** הצג Accept/Decline/Report/Block והעבר לתוצאת conversation; בדוק מסלול אמיתי ושפה. שמור distinction מפנייה אישית/קבוצתית.
  - **קריטריון קבלה:** poster-invitation עובר; נמען מאשר לפני פתיחת שיחה, pending אינו מאפשר טקסט, save identity אינו נחשף.

- [ ] **משימה 6.21: חיבור מצבי דחייה ומשיכה**
  - **קבצים לעריכה/יצירה:** `web/src/lib/listings/inquiries.ts`, `web/src/lib/listings/group-inquiries.ts`, `web/src/components/listings/GroupInquiryRequest.tsx`, `web/src/components/listings/RequestViewing.tsx`.
  - **הוראות טכניות ברורות:** חבר מצבי שרת לפקדים לפי בעל הפעולה; reconfirm קבוצתי פותח סבב אישורים חדש ולא מאשר בשם כולם.
  - **קריטריון קבלה:** withdraw/decline נשמרים אחרי reload; אין פנייה מחודשת בשם כל הקבוצה מפעולה יחידה.

- [ ] **משימה 6.19: הכוונת בטיחות קצרה**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/FirstContactSafety.tsx`, `web/src/components/listings/ListingContact.tsx`.
  - **הוראות טכניות ברורות:** הצג פעם אחת לפי H7 והפוך את ההסבר לזמין שוב; אין חסימת Report ואין claim לזהות מאומתת.
  - **קריטריון קבלה:** ההסבר נגיש במקלדת ובשתי שפות, אינו מופיע מחדש בכל הודעה ואינו מונע דיווח.


### SL09 — ניהול, הצבעות ויציאה מקבוצה

E3/E9/H1. הסכמה פה אחד לפנייה לבעלים נשארת נפרדת מכללי קבלת חברים.

- [ ] **משימה 9.7: הצבעת קבלה וחברות אטומית**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000023_group_admission_revision.sql`, `supabase/tests/plan_group_admission.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת admin/any/strict-majority ב־RPC עם electorate_revision, consent applicant ו־cap; join cutoff ומembership יחד. preserve baseline send_introduction. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** רוב מחושב לפי electorate התקף; vote ישן אינו מצטרף אחרי שינוי חברים; שני מועמדים לכיסא אחרון אינם יוצרים חמישה.

- [ ] **משימה 9.8: פקדי מדיניות וקבלה**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/GroupActions.tsx`, `web/src/app/(main)/chats/PendingLikes.tsx`.
  - **הוראות טכניות ברורות:** הצג מדיניות, pending votes ו־conflict/reload; admin/any/majority אינם משפיעים על מונה הפנייה לדירה.
  - **קריטריון קבלה:** admin יכול לשנות מדיניות תחת הרשאה; משתמש רגיל רואה רק פעולות מותרות; פנייה לבעלים עדיין דורשת את כולם.

- [ ] **משימה 9.9: העברת מנהל בהסכמה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000024_group_admin_transfer.sql`, `supabase/tests/plan_admin_transfer.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הוסף transfer invite לחבר קיים עם revision ו־TTL שבעה ימים; admin נשאר עד accept; expiry/decline אינם מעבירים תפקיד. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** דחייה משאירה admin קיים; אישור מעביר פעם אחת רק לחבר זכאי; משתמש חיצוני אינו מקבל ניהול.

- [ ] **משימה 9.10: ממשק העברת ניהול ועזיבה**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/AdminTransfer.tsx`, `web/src/components/groups/GroupActions.tsx`.
  - **הוראות טכניות ברורות:** מקור GROUP-LEAVE-ADMIN-001 ברשומת התקלות; אחרי 9.9 חבר שליחה/אישור/דחייה של transfer; admin ordinary departure דורש transfer שהושלם. last member archive לפי החוזה. שחזר תחילה את ההבדל בין Leave הקיים לחבר רגיל לבין admin; אין בנייה מחדש של יציאה שכבר קיימת ואין שימוש בה כתחליף לניקוי QA.
  - **קריטריון קבלה:** בדיקת ordinary actors מאמתת שחבר רגיל יכול לעזוב לפי החוזה, admin לא יוצא ומשאיר קבוצה ללא מנהל, transfer מאושר מאפשר עזיבה, ואין מינוי successor ללא הסכמה. אמת reload/גישה לאחר היציאה ו־outsider denial ורשום יעד/תאריך; לפני כן התקלה נשארת reported/source-confirmed.

- [ ] **משימה 9.11: תקציב פרטי וקבוצה מוסתרת**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000025_group_visibility_private_preferences.sql`, `supabase/tests/plan_group_privacy.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת private group search budget לחברים בלבד ו־discoverable נפרד מ־chat active; הסרת חבר/חסימה מפסיקה קריאות לא מורשות. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** הסתרה מוציאה כרטיס מ־Discover ושומרת שיחה; outsider אינו מקבל budget, votes או רשומות פנימיות.


### SL10 ו־SL11 — כרטיסים מתעדכנים ותוצאות חיפוש

אין shared wishlist או shared listing ownership.

- [ ] **משימה 10.6: כרטיס לא זמין וגבול היסטוריה**
  - **קבצים לעריכה/יצירה:** `web/src/components/chat/ChatListingCard.tsx`, `web/e2e/chat-listing-cards.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק שינוי listing אחרי שליחת card, newcomer history, duplicate share ו־save אישי; אותו group/listing card צורך אותו consent context.
  - **קריטריון קבלה:** כרטיס מוסר מוצג unavailable, newcomer אינו רואה card מלפני join, והעתק card אינו מאפס הסכמות/שולח פנייה כפולה.

- [ ] **משימה 11.3: תוצאת חיפוש מדווחת עצמית**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000026_self_reported_search_outcome.sql`, `supabase/tests/plan_search_outcome.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** שמור explicit outcome לפי actor/group controller מורשה, בלי להסיק אותו מ־chat/accept/lease. שדה אינו משנה בעלות או חדר. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** משתמש יכול לסמן found-place כ־self-reported; דירה וקבוצה אינן נסגרות אוטומטית.

- [ ] **משימה 11.4: שליטת discoverability ותוצאת חיפוש**
  - **קבצים לעריכה/יצירה:** `web/src/components/groups/GroupSearchStatus.tsx`, `web/src/components/groups/GroupActions.tsx`.
  - **הוראות טכניות ברורות:** הפרד hide/show group, חיפוש דירה ו־outcome; הסבר שדיווח מציאת מקום אינו אישור חוזה.
  - **קריטריון קבלה:** admin יכול להסתיר קבוצה ולהמשיך chat; דיווח outcome אינו מבטל intake של בעל דירה אחר.


### SL12 — חסימה ודיווח עם טיפול אמיתי

H1–H7/D7/D10. הרשאות בסיסיות נשמרו בשלב א׳; כאן משלימים תרחישי abuse ו־reviewer.

- [ ] **משימה 12.1: חסימה סימטרית ושחזור**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000027_symmetric_block_enforcement.sql`, `supabase/tests/plan_blocking.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת block/unblock מול גילוי, intro, inquiry אישי/קבוצתי ו־chat reads/writes. בקבוצה קיימת שני הצדדים מנועים, אחרים ממשיכים; אין expulsion אוטומטי. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שני חסומים אינם מקבלים תוכן/preview חדש דרך REST/Realtime; חבר שלישי ממשיך; unblock מחזיר history לפי הרשאה רגילה.

- [ ] **משימה 12.2: ממשק חסימה וניהול חסומים**
  - **קבצים לעריכה/יצירה:** `web/src/components/safety/BlockUser.tsx`, `web/src/app/(main)/settings/BlockedUsers.tsx`, `web/src/app/(main)/settings/page.tsx`.
  - **הוראות טכניות ברורות:** הצג consequence לקבוצה משותפת, block/unblock ורשימת החסומים של caller; הוסף constrained group-management link בלי לפתוח chat חסום.
  - **קריטריון קבלה:** אפשר לבצע block/unblock בשתי שפות; לא ניתן לשנות רשימת חסומים של אחר.

- [ ] **משימה 12.3: דיווח פרטי לפי קטגוריה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000028_protected_reports.sql`, `supabase/tests/plan_reports.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** persistent report עם actor/subject/category allowlist, explanation מוגבל, idempotency והרשאות reporter/reviewer. user_metadata אינו מעניק reviewer. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** reporter רואה receipt שלו, subject/outsider אינם קוראים reporter/evidence; דיווח חוזר באותו key אינו כפול.

- [ ] **משימה 12.4: טופס דיווח משותף**
  - **קבצים לעריכה/יצירה:** `web/src/components/safety/ReportDialog.tsx`, `web/src/components/listings/PublicListing.tsx`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** חבר Report לרכיב אחד עם subject context וקטגוריות H2, ללא raw private evidence מיותר וללא הבטחת SLA.
  - **קריטריון קבלה:** דיווח מדירה ומשיחה נשמר ומקבל receipt; כשל מציג retry ואינו מדווח כהצלחה.

- [ ] **משימה 12.5: שלושה דיווחי דירה תפוסה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000029_taken_report_cohorts.sql`, `supabase/tests/plan_taken_reports.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** רק listing_unavailable של שלושה reporters זכאים שונים באותו renewal cohort מסתיר. self/duplicate אינם תורמים; renewal צורך cohort ישן; reviewer restriction גובר. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שלושה שונים מסתירים, שלושה duplicates לא; scam אינו נספר; renewal לא מוסתר מיד מאותם דיווחים ישנים.

- [ ] **משימה 12.6: פעולות reviewer מנומקות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000030_reviewer_actions_audit.sql`, `supabase/tests/plan_reviewer_actions.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** מקור תפקיד מוגן; RPC hide/suspend/reverse עם reason/audit, אכיפה בקריאות/כתיבות/חידוש realtime. אין גישת reviewer כללית לכל צ׳אט/פרופיל. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** nonreviewer נדחה גם עם metadata מזויף; reviewer משנה מצב ויכול reverse עם audit מלא.

- [ ] **משימה 12.7: תור טיפול מוגן**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/review/page.tsx`, `web/src/components/safety/ReviewQueue.tsx`.
  - **הוראות טכניות ברורות:** טען queue רק לאחר server reviewer authorization; הצג מידע מינימלי ופעולות מה־RPC. אין חשיפת תור דרך client-only hide.
  - **קריטריון קבלה:** reviewer רואה דיווח ומטפל בו; משתמש רגיל אינו מקבל נתוני queue גם בטעינה ישירה.

- [ ] **משימה 12.8: בדיקת טיפול וחסימת קבוצה**
  - **קבצים לעריכה/יצירה:** `web/e2e/moderation.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק reporter/subject/reviewer/outsider, shared group ושינוי sanction/reversal. underage report מפנה ל־suspension/deletion rules בלי איסוף תעודות.
  - **קריטריון קבלה:** moderation עובר עם השפעה אמיתית על גישה ו־audit; אין auto permanent ban או SLA מומצא.


### SL13 — התראות נשלטות

F7/L5/K2/J13 ו־NOTIFICATIONS_AND_MEASUREMENT. משלוח אמיתי רק ליעד בדיקה מורשה; אינו תנאי לדמו הליבה.

- [ ] **משימה 13.1: אחסון העדפות ואירועים**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000031_notification_preferences_events.sql`, `supabase/tests/plan_notification_prefs.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** צור prefs master/event/channel ומודל event/outbox מינימלי עם unique event ID/recipient/channel, RLS ו־off migration. endpoint/device credentials פרטיים. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** master off קיים נשאר off; חשבון אחר אינו משנה prefs; rollback של פעולה אינו משאיר event.

- [ ] **משימה 13.2: אירועי הודעה ופנייה באותה transaction**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000032_message_inquiry_outbox_events.sql`, `supabase/tests/plan_notification_enqueue.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** חבר events להצלחת send/inquiry/accept ול־group inquiry רק בשלב unanimously-dispatched; לא על כל vote. אין provider בתוך transaction. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** message/inquiry מצליחים יוצרים event אחד; retry אינו מכפיל; 1/2 consent אינו שולח התראה לבעלים.

- [ ] **משימה 13.3: אירועי הזמנות ומחזור חיים**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000033_lifecycle_outbox_events.sql`, `supabase/tests/plan_notification_lifecycle.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** חבר intro/group invite/admission/listing hidden/expiring/delete-request events בנקודת commit. שמור payload generic ללא text/address/budget. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** לכל פעולה מחויבת נוצר event מתאים אחד; פעולה שהתבטלה אינה נרשמת כמסירה.

- [ ] **משימה 13.4: מסך העדפות התראות**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/settings/NotificationsToggle.tsx`, `web/src/app/(main)/settings/NotificationPreferences.tsx`, `web/src/app/(main)/settings/page.tsx`.
  - **הוראות טכניות ברורות:** הרחב UI ל־master/event/channel בלי לשנות opt-outs קיימים; push כבוי עד רשות/מכשיר. אין שיווק או area alerts.
  - **קריטריון קבלה:** כיבוי ושינוי event נשמרים לאחר reload; משתמש משנה רק את העדפותיו.

- [ ] **משימה 13.5: claim/lease/retry ב־worker**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000034_outbox_claim_lease.sql`, `supabase/tests/plan_outbox_claim.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** צור פעולות worker פרטיות ל־claim, lease 2m, attempts/backoff לפי החוזה ו־dead state; worker כפול אינו claim פעיל זהה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** מרוץ claim מקצה פעם אחת; lease שפג מאפשר recovery; attempt limit מוביל ל־dead עם error מסונן.

- [ ] **משימה 13.12: אחסון heartbeat מורשה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000061_conversation_reading_heartbeat.sql`, `supabase/tests/plan_reading_heartbeat.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** צור heartbeat actor/conversation עם expiry ו־RPC חבר פעיל בלבד; worker קורא בהרשאה מוגנת. presence אינו message או מידע ציבורי. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** heartbeat תקף 30s לפי server time; outsider אינו קורא/כותב presence; expiry נבדק בשעון בדיקה מקומי.

- [ ] **משימה 13.13: שליחת heartbeat מהשרשור**
  - **קבצים לעריכה/יצירה:** `web/src/hooks/useReadingHeartbeat.ts`, `web/src/app/(main)/chats/[conversationId]/ChatThread.tsx`.
  - **הוראות טכניות ברורות:** שלח heartbeat אחת ל־15s רק כשהשרשור מוצג וממוקד; הפסק ב־blur/exit/logout והשתמש ב־RPC 13.12.
  - **קריטריון קבלה:** חלון ברקע מפסיק עדכון וה־heartbeat פג; אין message או unread מהפעולה.

- [ ] **משימה 13.6: dispatcher עם בדיקת הרשאה מאוחרת**
  - **קבצים לעריכה/יצירה:** `web/src/lib/notifications/dispatch.ts`, `scripts/test-notification-dispatch.mjs`.
  - **הוראות טכניות ברורות:** לפני כל send בדוק account/block/leave/prefs/read marker; heartbeat 15s/30s וחלון burst 60s לפי TECHNICAL_DEFAULTS. outage לא משנה message.
  - **קריטריון קבלה:** node --test scripts/test-notification-dispatch.mjs עובר עם block/opt-out שנוספו בזמן retry ו־active reading suppression.

- [ ] **משימה 13.7: מתאם דוא״ל ונתיב worker מוגן**
  - **קבצים לעריכה/יצירה:** `web/src/lib/notifications/email.ts`, `web/src/app/api/jobs/notifications/route.ts`, `docs/CONFIG_KEY_INVENTORY.md`.
  - **הוראות טכניות ברורות:** בדוק sender transaction קיים ותיעוד current/free; חבר interface מסירה ו־job auth server-only. no arbitrary recipients או raw provider errors.
  - **קריטריון קבלה:** בדיקה עם mock מפיקה הודעה כללית וקישור פנימי בטוח; בקשה ללא הרשאת job נדחית; action המקורי שורד sender failure.

- [ ] **משימה 13.11: אחסון subscription בבעלות**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000062_owned_push_subscriptions.sql`, `supabase/tests/plan_push_subscriptions.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** צור store פרטי עם actor/device/endpoint/keys ו־uniqueness; server בלבד קורא credentials. detach/rebind אינו משאיר שני בעלי חשבון באותו device binding. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** A שומר subscription שלו בלבד; B אינו קורא keys או משנה רשומה; detach משבית משלוח.

- [ ] **משימה 13.8: רישום מכשיר push לפי חשבון**
  - **קבצים לעריכה/יצירה:** `web/src/app/api/push/subscriptions/route.ts`, `web/src/lib/notifications/push.ts`.
  - **הוראות טכניות ברורות:** שמור subscription בבעלות current user, validation ל־endpoint דרך ספריית web-push מתועדת ולא fetch חופשי; logout/switch מנתק rebind קודם. תעד config חדש.
  - **קריטריון קבלה:** חשבון B אינו קורא/משנה endpoint של A; endpoint מתבטל ב־404/410 ואינו מקבל מידע אחרי logout/rebind.

- [ ] **משימה 13.9: בקשת רשות ו־service worker**
  - **קבצים לעריכה/יצירה:** `web/src/components/notifications/PushPermission.tsx`, `web/public/sw.js`, `web/src/app/manifest.ts`, `web/src/app/(main)/settings/page.tsx`.
  - **הוראות טכניות ברורות:** הסבר opt-in לפני permission, רישום subscription, push/click לקישור app מורשה. אל תוסיף offline cache של Auth/API/chat/address.
  - **קריטריון קבלה:** במכשיר נתמך אפשר לאשר/לבטל; service worker אינו שומר תגובות פרטיות והקישור מבצע auth שוב.

- [ ] **משימה 13.10: משלוח אמיתי ואפשרות כיבוי**
  - **קבצים לעריכה/יצירה:** `web/e2e/notification-settings.spec.ts`, `docs/workstreams/implementation-plan-SL13.md`.
  - **הוראות טכניות ברורות:** בדוק email אחד ליעד מורשה ו־push אחד במכשיר עם רשות כשזמינים; תעד provider/device/מסירה. בדוק off לפני retry. חוסר sender נרשם כ־verification-incomplete.
  - **קריטריון קבלה:** מובחנים mock reliability וראיית קבלה אמיתית; Auth SMTP לבדו אינו נרשם כהתראות מוצר עובדות. אין משלוח לקהל קיים.


### SL14 — יציאה ומחיקה בטוחות

B7/F6/E3; baseline product ברור, retention משפטי נפרד. אין purge אמיתי אוטומטי מכוח התכנית.

- [ ] **משימה 14.1: בקשת מחיקה והשבתה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000035_account_deletion_request.sql`, `supabase/tests/plan_deletion_request.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** RPC caller משבית מיד account/discovery/access/queued sending, שומר delete_requested_at ו־job progress; קבוצת admin ללא transfer מועברת לארכוב לפי E3. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** חשבון מושבת אינו ממשיך פעולות עם token ישן; היסטוריית שותף מורשה אינה נמחית וחשבונות אחרים לא משתנים.

- [ ] **משימה 14.2: מסך השלכות ואישור**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/settings/DeleteAccountNotice.tsx`, `web/src/app/(main)/settings/page.tsx`.
  - **הוראות טכניות ברורות:** החלף notice בפעולת אישור מודעת עם grace 30d, shared history ו־group fallback. אין הבטחת מחיקת מידע שכבר נראה.
  - **קריטריון קבלה:** בקשה מוצגת עם מועד וסטטוס ברור, ללא כפתור שמפעיל purge מיידי; cancellation path מוסבר.

- [ ] **משימה 14.3: ביטול לפני purge**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000036_account_deletion_cancel.sql`, `supabase/tests/plan_deletion_cancel.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** מנגנון ביטול מאומת של בעל החשבון לפני 30d ולפני claim purge; אין פתיחת חשבון מחדש דרך session לא מורשה. ביטול אינו מחייה listing/grant אוטומטית. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** יום 29 ניתן לבטל, בגבול 30d/claim לא; שחזור גישה אינו מחזיר הרשאות/מודעות שבוטלו בלי פעולה מפורשת.

- [ ] **משימה 14.7: ממשק ביטול בקשת מחיקה**
  - **קבצים לעריכה/יצירה:** `web/src/components/accounts/CancelDeletion.tsx`, `web/src/app/(main)/settings/page.tsx`.
  - **הוראות טכניות ברורות:** הצג בקשה ומועד grace דרך מסלול מאומת של בעל החשבון וחבר cancel ל־RPC 14.3; השתמש ב־recovery מאושר אם login הוגבל, ללא bypass של השבתה.
  - **קריטריון קבלה:** בעל החשבון מבטל בתקופה המותרת; אחר אינו יכול; אחרי claim מוצגת סיבה ולא הצלחה.

- [ ] **משימה 14.4: תור purge ו־checkpoint**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000037_account_purge_job.sql`, `supabase/tests/plan_purge_job.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** job actor מוגן, lease/attempts/phase/cursor ובאצ׳ים 100 לפי החוזה; claim דורש grace שעבר. tombstone לפני auth removal. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** restart מאותו cursor ממשיך בלי מחיקה כפולה/מקבילה; צורך מפעיל נרשם אחרי retries לפי החוזה.

- [ ] **משימה 14.5: ניקוי משאבים פרטיים בבעלות**
  - **קבצים לעריכה/יצירה:** `web/src/lib/accounts/purge.ts`, `scripts/test-account-purge.mjs`.
  - **הוראות טכניות ברורות:** ממש שלבי owned Storage API, private rows ו־identity anonymization לפי מדיניות מאושרת; אין cascade של שיחות אחרים. שלבי abuse/shared-content retention נשארים gated לביקורת המתאימה.
  - **קריטריון קבלה:** node --test scripts/test-account-purge.mjs עובר עם partial failure/retry; object של אחר לא נמחק והיסטוריה מורשית נשמרת.

- [ ] **משימה 14.8: כניסת job מוגנת ל־purge**
  - **קבצים לעריכה/יצירה:** `web/src/app/api/jobs/account-purge/route.ts`, `web/src/lib/accounts/purge.ts`, `docs/CONFIG_KEY_INVENTORY.md`.
  - **הוראות טכניות ברורות:** חבר route server-only ל־claim ולשלבי purge עם job credential ושמות config מתועדים; אין מחיקה שרירותית לפי user ID מהדפדפן.
  - **קריטריון קבלה:** user/guest נדחים; executor מפעיל רק job שעבר grace; retry ממשיך ללא broad cascade.

- [ ] **משימה 14.6: הרצת מחיקה מבודדת**
  - **קבצים לעריכה/יצירה:** `web/e2e/account-exit.spec.ts`, `docs/workstreams/implementation-plan-SL14.md`.
  - **הוראות טכניות ברורות:** הרץ בקשה/ביטול/purge רק בנתונים סינתטיים מבודדים עם שעון בדיקה; admin transfer נדחה לא חוסם מחיקה. תעד object counts והיבטי retention לא מוכרעים.
  - **קריטריון קבלה:** account-exit עובר ללא פגיעה בדמו שמור/משתמש אחר; אין טענה שבדיקות סוגרות M1/M2 או אישור purge על real data.


### SL15 — אימות סטודנט אמיתי

B3/B4/B9. אינו דרישת פתיחת מוצר לסטודנטים בלבד ואינו תנאי לדמו הליבה.

- [ ] **משימה 15.1: חוזה דומיינים ו־OTP**
  - **קבצים לעריכה/יצירה:** `web/src/utils/studentEmail.ts`, `docs/specs/STUDENT_VERIFICATION.md`.
  - **הוראות טכניות ברורות:** הקפא רשימת BGU/Sami Shamoon מאושרת במקור; בדוק קונפיגורציה קיימת וספק. תעד expiry/attempt/resend/reverify מתוך החלטה קיימת; אם ערך מוצר חסר, בקש אותו כמקבץ לפני מימוש, בלי להמציאו.
  - **קריטריון קבלה:** חוזה מכיל ערכים מאושרים או blocker מסוים; אין הרחבה אוטומטית לכל ac.il ואין טענה שהחוזה ממומש.

- [ ] **משימה 15.2: challenge פרטי קשור למשתמש**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000038_student_email_challenges.sql`, `supabase/tests/plan_student_challenge.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אחרי ערכי 15.1 שמור hash קוד עם account/email/context/expiry/attempts ו־resend limit; אין plaintext קוד או signup אוטומטי של זהות חדשה. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** לקוח רגיל אינו קורא challenge של אחר; expired/attempt limit/replay נדחים; email אינו מופיע ב־public projection.

- [ ] **משימה 15.3: start route לשליחת challenge**
  - **קבצים לעריכה/יצירה:** `web/src/app/api/verify-student-email/start/route.ts`, `web/src/lib/verification/student-email.ts`.
  - **הוראות טכניות ברורות:** החלף רק מסלול OTP לא קשור אם קיים: caller מאומת, email domain מאושר, challenge אישי, sender interface מסונן. אין שליחת magic-login שמחליף זהות.
  - **קריטריון קבלה:** start שומר challenge למשתמש הקיים; sender failure גלוי וניתן לחידוש לפי rate limit, ללא false verified.

- [ ] **משימה 15.4: confirm אטומי ופרטי**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000039_student_verify_atomic.sql`, `supabase/tests/plan_student_verify.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** בדוק hash/actor/email/TTL/attempts, consume challenge ועדכן private verification באותה פעולה. client אינו יכול להציב verified ישירות. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** wrong/expired/replayed code נדחים; קוד תקין מאמת את caller בלבד פעם אחת; אין partial timestamp/badge update.

- [ ] **משימה 15.7: חיבור confirm לאימות אטומי**
  - **קבצים לעריכה/יצירה:** `web/src/app/api/verify-student-email/confirm/route.ts`, `web/src/lib/verification/student-email.ts`.
  - **הוראות טכניות ברורות:** אחרי פונקציית 15.4 חבר POST עם actor מה־session, validation ושגיאות מסוננות; החלף שתי כתיבות admin נפרדות בקריאה אטומית.
  - **קריטריון קבלה:** קוד תקין מאמת caller בלבד, verification/status נשמרים יחד ו־replay אינו משנה נתונים.

- [ ] **משימה 15.5: ממשק ו־badge בהסכמה**
  - **קבצים לעריכה/יצירה:** `web/src/components/profile/StudentVerification.tsx`, `web/src/app/(main)/profile/page.tsx`.
  - **הוראות טכניות ברורות:** הוסף start/confirm/resend/error state והצגת verified badge opt-in לפי הגדרות קיימות; student email נשאר פרטי.
  - **קריטריון קבלה:** verification מסתיים במצב שמור; hide badge אינו מבטל האימות הפרטי; הציבור אינו מקבל את האימייל.

- [ ] **משימה 15.6: בדיקת קבלה ומשלוח סטודנט**
  - **קבצים לעריכה/יצירה:** `web/e2e/student-verification.spec.ts`, `docs/workstreams/implementation-plan-SL15.md`.
  - **הוראות טכניות ברורות:** הרץ מטריצת code/domain/replay ובדיקת קבלה אמיתית לכתובת דומיין מורשית אם זמינה; הפרד sender mock מראיה אמיתית.
  - **קריטריון קבלה:** בדיקות מקומיות עברו; אם אין תיבת דואר מאושרת חסרה רק ראיית המסירה והיא נשארת פתוחה, בלי הצהרת אימות זהות/לימודים מעבר לשליטה בדוא״ל.


### SL07 — דירוג סופי והסברים

C1–C13, MATCHING, TAXONOMY; SQL הוא בעל חישוב production היחיד. כללי פנייה קבוצתית אינם נקבעים לפי ציון.

- [ ] **משימה 7.4: מטריצת השוואה ו־oracle**
  - **קבצים לעריכה/יצירה:** `scripts/lib/scoring-reference.mjs`, `scripts/test-contracts.mjs`.
  - **הוראות טכניות ברורות:** ממש/אמת reference test-only של directional preferred/accepted, mutual min, compound fields, weights ו־unknown לפי TAXONOMY. gender/relationship/military אינם ציון.
  - **קריטריון קבלה:** node --test scripts/test-contracts.mjs עובר: 57% בדוגמה 4/7, cat allergy mismatch, unknown אינו התאמה, משקל קטגוריה לא נספר פעמיים.

- [ ] **משימה 7.5: פונקציית ציון SQL**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000040_versioned_lifestyle_score.sql`, `supabase/tests/plan_scoring_parity.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** פונקציית SQL versioned מחזירה score/coverage/explanations allowlist; מינימום שלוש קטגוריות ומשקל שש, weights total 15. אין score מ־bio או private budget. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** fixtures משווים ל־oracle; אין אחוז מפרט יחיד, אין דליפת input פרטי, וכל דוגמאות MATCHING שוות לצפי.

- [ ] **משימה 7.6: feed מורשה לפני עימוד**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000041_scored_discovery_feed.sql`, `supabase/tests/plan_discovery_paging.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** הרחב discover RPC תואם: eligibility/block/pass/pending לפני score, סדר coverage/score/activity/id, cursor query/version-bound, page 20/max50. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** שני עמודים עם ties אינם משכפלים/מאבדים מזהים; score revision/filter change דורש refresh מפורש; אין fetch-all.

- [ ] **משימה 7.7: ציון קבוצתי מינימלי**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000042_group_lifestyle_score.sql`, `supabase/tests/plan_group_scoring.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** השווה לציבורי חברים מורשים והחזר minimum supported member score עם coverage; אם חבר חסר סף, אין aggregate ודאי. אין נגזרת תקציב ציבורית. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** 84/72/91 מחזיר 72; חבר חסר coverage מציג incomplete; private group budget אינו בתוצאה.

- [ ] **משימה 7.8: pass ומכסת הזמנות מאוחדת**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000043_introduction_quota_pass.sql`, `supabase/tests/plan_intro_quota.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** אמת 30d pass לאדם/קבוצה ו־C7 20/day Asia/Jerusalem במשותף עם poster outreach; retries אינם צורכים, accepted sent invitations עדיין נספרות. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** 19/20/21 במקביל שומר מכסה; pass שורד session ופג בזמן; פנייה renter אישית/קבוצתית אינה מתחפשת ל־intro.

- [ ] **משימה 7.9: צריכת ציון והסברים ב־UI**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/discover/DiscoverClient.tsx`, `web/src/components/discovery/SwipeCard.tsx`, `web/src/components/discovery/TagFilter.tsx`.
  - **הוראות טכניות ברורות:** הצג server score/coverage, 2–3 הסברים מורשים ומידע חלקי; no-smoking/no-pets free constraints בלבד. פרטיות apartment suitability נפרדת.
  - **קריטריון קבלה:** UI אינו מחשב נוסחה משלו; לא נוסף gender filter או paywall; חשיפת unknown/mismatch תואמת לתוצאת שרת.

- [ ] **משימה 7.11: התאמת דירה פרטית לצופה**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000063_private_apartment_suitability.sql`, `supabase/tests/plan_private_suitability.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** RPC משווה העדפות caller בלבד לעובדות דירה ולחדר זמין באותה שורה: תקציב/תאריך/דרישות. החזר התאמות וחוסרים בלי אחוז חדש או inputs של אחרים. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** תקציב1800–2300 מתאים לחדר2000 ולא2600; אי אפשר להגיש viewer_id אחר; preferences אינם בתוצאה.

- [ ] **משימה 7.12: תצוגת התאמה פרטית**
  - **קבצים לעריכה/יצירה:** `web/src/components/listings/PrivateSuitability.tsx`, `web/src/components/listings/PublicListing.tsx`.
  - **הוראות טכניות ברורות:** הצג לצופה מחובר את התאמת החדר לדרישותיו ממקור שרת; אל תשמור את התוצאה ב־metadata ציבורי או כרטיס משותף.
  - **קריטריון קבלה:** A/B רואים התאמות אישיות; guest והכרטיס בקבוצה אינם מקבלים תקציב או דרישות של A.

- [ ] **משימה 7.10: קבלת מסלול גילוי מלא**
  - **קבצים לעריכה/יצירה:** `web/e2e/canonical-discovery.spec.ts`, `web/e2e/discovery-scoring.spec.ts`.
  - **הוראות טכניות ברורות:** בדוק pagination/pass/constraint/intro/accept/chat HE/EN ו־group coverage; בדוק התאמת חדר מול תקציב הצופה בפרטי בלבד.
  - **קריטריון קבלה:** discovery-scoring עובר עם fixtures ידועים; accepted intro יוצר chat אחד, והסברים אינם חושפים תקציב/תאריך מעבר של אדם אחר.


### SL16 — מדידה, תפעול ובדיקת MVP מלאה

מגיע אחרי כל הליבה וההשלמות, לרבות SL06.3. אין תלות בהשקה רחבה או התחייבות למימון.

- [ ] **משימה 16.4: חוזה אירועי מדידה מינימלי**
  - **קבצים לעריכה/יצירה:** `web/src/lib/measurement/events.ts`, `docs/specs/NOTIFICATIONS_AND_MEASUREMENT.md`.
  - **הוראות טכניות ברורות:** הגדר event IDs/enum/actor/object/cohort/source_version/UTC ומכנים למדדי onboarding, supply, inquiries, replies, two-way conversations, return ו־self-report; no private content.
  - **קריטריון קבלה:** חוזה מדד מציין חלון/מונה/מכנה/QA-demo-pilot; pending אינו rejection ו־demo אינו משתמש אמיתי.

- [ ] **משימה 16.5: אחסון ופליטת אירועים מתוך commit**
  - **קבצים לעריכה/יצירה:** `supabase/migrations/20261021000044_pilot_business_events.sql`, `supabase/tests/plan_measurement_events.sql`, `scripts/test-resident-sql.mjs`.
  - **הוראות טכניות ברורות:** store first-party owner-read, event id ייחודי ו־allowlist; חבר emits לפעולות commit המאושרות כולל unanimous group dispatch ולא לכל vote. client אינו קובע actor/cohort כרצונו. חבר את המיגרציה וה־SQL assertions ל־runner הקיים; הרץ node scripts/test-resident-sql.mjs ובנפרד בדיקת לקוח רגיל ביעד המזוהה.
  - **קריטריון קבלה:** retry/rollback אינם מנפחים ספירה; אין message text/address/phone/private budget; business actions לא תלויות בשירות analytics חיצוני.

- [ ] **משימה 16.6: דוח מצומצם לבעלים**
  - **קבצים לעריכה/יצירה:** `web/src/app/(main)/pilot/page.tsx`, `web/src/lib/measurement/report.ts`.
  - **הוראות טכניות ברורות:** server-authorized report aggregates לפי cohort/window; פרט pending/unresolved ומדדי reply median/p90, בלי להבטיח correlation=causation.
  - **קריטריון קבלה:** נתוני fixture ידועים מפיקים מספרים תואמים ל־committed actions; משתמש רגיל אינו טוען דוח בעלים.

- [ ] **משימה 16.7: נראות jobs ומדריך תפעול**
  - **קבצים לעריכה/יצירה:** `docs/PILOT_OPERATIONS.md`, `docs/TESTING.md`.
  - **הוראות טכניות ברורות:** תעד reviewer owner, outbox/deletion stuck state, kill-switch לשליחה, logs מסוננים, מקור/DB/deploy ונוהל שחזור. אין SLA/ערוץ תמיכה מומצאים.
  - **קריטריון קבלה:** יש דרך מוגדרת לזהות job dead/failed ולנסות מחדש באופן מורשה; אחריות/תלות חיצונית חסרה מסומנת בשמה.

- [ ] **משימה 16.8: חיבור שערי CI לפרויקט**
  - **קבצים לעריכה/יצירה:** `.github/workflows/ci.yml`, `web/package.json`.
  - **הוראות טכניות ברורות:** אם אין pipeline תואם, חבר type/build/targeted lint ו־SQL/contract checks הנדרשים בלי schema mutation או shared config experiments אוטומטיים. לא שינוי dependency לצורך נוחות.
  - **קריטריון קבלה:** pipeline מקומי/CI נכשל ב־type או SQL failure אמיתי; אינו דורש secret ב־client ואינו מחיל migrations על backend משותף.

- [ ] **משימה 16.9: מטריצת MVP מלאה**
  - **קבצים לעריכה/יצירה:** `web/e2e/mvp-acceptance.spec.ts`, `docs/workstreams/implementation-plan-SL16.md`.
  - **הוראות טכניות ברורות:** הרץ כלל מסעות הדומיין מול מקור/יעד מזוהים: HE/EN,390px/desktop, owner/requester/group/outsider, persistence/retry/revocation. ספקים אמיתיים בנפרד.
  - **קריטריון קבלה:** לכל assertion יש passed/failed/blocked עם תאריך; אין skipped=passed. רשומים fixtures שנשמרו וניקוי exact-ID של זמניים בלבד.

- [ ] **משימה 16.10: תרגול שחזור מבודד**
  - **קבצים לעריכה/יצירה:** `docs/PILOT_OPERATIONS.md`, `docs/workstreams/implementation-plan-SL16.md`.
  - **הוראות טכניות ברורות:** תרגל backup/restore/forward repair של נתוני fixture ביעד מבודד; מדוד מה שוחזר, גרסאות והגבלות. אין reset/shared target או מחיקת דמו.
  - **קריטריון קבלה:** אפשר לשחזר records/owned-photo references בפועל; תוצאה אינה נלמדת מקובץ runbook בלבד ולא שונה backend המשותף.

- [ ] **משימה 16.11: סגירת ראיות וגבול השקה**
  - **קבצים לעריכה/יצירה:** `docs/DEMO_CORE.md`, `docs/PILOT_OPERATIONS.md`, `docs/planning/execution-state.json`.
  - **הוראות טכניות ברורות:** רכז implementation/verified/integrated/deployed בנפרד עם SHA/ref/deployment ID והבדיקות החסרות. full pilot/public access כפופים ל־M1/M2/M3/provider/capacity בפועל. אם כל משימות ב׳ וקבלתן עברו, שמור stage_acceptance.B עם מקור/תאריך/handoff ובדיקות passed; אין מעבר אוטומטי לג׳. אל תסמן verified עבור שלב עם משימות פתוחות.
  - **קריטריון קבלה:** הדמו נשאר זמין עם ליבה אמיתית; חבילה נסגרת רק כשכל קבלותיה עברו. ספק חסר אינו מסתתר מאחורי build והשלמת MVP אינה אישור public launch.


## שלב ג׳ — סלייסים נדחים: הכנה בלבד

לא מתחילים אוטומטית אחרי שלב ב׳. נדרש dispatch מפורש של הבעלים להכנת הסלייס הנדחה. המשימות להלן מגדירות את העבודה שאפשר לתכנן בלי להמציא תשובות OPEN/RESEARCH; הן אינן אישור לכתוב תשלום, native, scraper, upload או רכיב מסחרי. משימת קוד עתידית תתווסף רק אחרי החלטה וחוזה מדויקים. זהו גבול מפורש של הקטלוג, לא חוסר בפירוק.

### SL17 — היצע טבעי בסיוע מפעיל

needs-decision; תלוי SL02/SL04/SL06. D0 נשאר in-app, פעילות outreach נדחתה.

- [ ] **משימה 17.1: חוזה הרשאת מקור והפעלת מפרסם**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL17-assisted-inventory.md`.
  - **הוראות טכניות ברורות:** פרט actor/state matrix עבור authorized private draft→publisher review→claim→activation; רשום שאלות provenance/consent/sunset שדורשות החלטת בעלים.
  - **קריטריון קבלה:** כל transition כולל מי רשאי ובאיזה אישור; אין אישור scraping, בעלים פיקטיבי או public unclaimed listing.

- [ ] **משימה 17.2: מפרט טוקן claim והרשאות**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL17-assisted-inventory.md`.
  - **הוראות טכניות ברורות:** לאחר תשובות 17.1 תכנן token owner-binding/expiry/use-once, העברת draft לבעלים וביטול; ציין שמות מוצעים ולא RPC קיים.
  - **קריטריון קבלה:** מפרט כולל wrong actor/expired/used והקצאת inquiry receiver אמיתי; אין SQL/תוכן אישי שהועתק.

- [ ] **משימה 17.3: מטריצת ניסוי והפסקה**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL17-assisted-inventory.md`.
  - **הוראות טכניות ברורות:** הגדר תרחיש consenting publisher→activate→inquiry→reply, הפרדת assisted/organic ומועד עצירת הניסוי המאושר.
  - **קריטריון קבלה:** קריטריונים כתובים ומסומנים pending runtime; implementation נשאר חסום עד אישור מפורש של הסלייס.


### SL20 — Pro ומיקומים מסחריים

needs-decision; G2–G6/M6. אין מחיר/entitlement מאושרים.

- [ ] **משימה 20.1: מטריצת entitlement מוצעת**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL20-commercial.md`.
  - **הוראות טכניות ברורות:** הפרד resident controls, professional lister ו־business map placement; רשום free baseline, חסמי החלטה וראיות willingness-to-pay נדרשות.
  - **קריטריון קבלה:** אין מחיר או paywall מוצגים כמאושרים; block/address/safety אינם benefit שניתן לקנות.

- [ ] **משימה 20.2: חוזה billing במצב sandbox**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL20-commercial.md`.
  - **הוראות טכניות ברורות:** רק אחרי אישור 20.1 פרט state machine של active/expiry/cancel/refund ו־webhook idempotency/server ownership; סמן provider/tax/legal כבלתי סגורים עד ראיה.
  - **קריטריון קבלה:** מטריצת transitions כוללת duplicate/out-of-order webhook, ואין הוראה ליצור חיוב אמיתי.

- [ ] **משימה 20.3: חוזה שכבת ספונסר ובדיקות**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL20-commercial.md`.
  - **הוראות טכניות ברורות:** פרט sponsored label, שכבת מפה נפרדת, הסכמת מפרסם ותרחישי חיפוש חינם; scope לכל ניסוי מסחרי נפרד.
  - **קריטריון קבלה:** אי אפשר לטעות בין מודעת עסק ל־housing pin; קריטריוני sandbox כתובים בלי feature שפורסם.


### SL21 — Native לאחר אימות web

needs-decision; K1/K6. אין scaffold Expo כחלק מה־MVP.

- [ ] **משימה 21.1: מפת חוזים לשיתוף**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL21-native.md`.
  - **הוראות טכניות ברורות:** מפה domain IDs/validators/API contracts קיימים לשיתוף וסמן platform UI כלא משותף; רשום journeys נדרשים בהחלטה.
  - **קריטריון קבלה:** רשימת reuse מצביעה על קבצים אמיתיים; לא שוכפלו auth identities ולא נוצר native project.

- [ ] **משימה 21.2: מפרט session ו־deep links**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL21-native.md`.
  - **הוראות טכניות ברורות:** לאחר אישור 21.1 פרט secure session, login return, permission/push ו־offline boundaries לפי תיעוד הפלטפורמות בזמן הביצוע.
  - **קריטריון קבלה:** לכל platform יש מסלול revoke/recovery והפניה לתיעוד official שנבדק; אין claim תאימות מחוויית web.

- [ ] **משימה 21.3: מטריצת מכשירים והפצה**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL21-native.md`.
  - **הוראות טכניות ברורות:** פרט physical-device acceptance מול web: membership/history/block/address, background/push/store/payment research.
  - **קריטריון קבלה:** נדרשת ראיית מכשיר אמיתי; עלות/חשבון store או שינוי מדיניות אינם מאושרים משתיקת המסמך.


### SL22 — ריהוט ופריטים צמודי דירה

needs-decision; D15/D1/F3/H2, מחוץ ל־MVP.

- [ ] **משימה 22.1: חוזה בעלות ומחיר פריט**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL22-furniture.md`.
  - **הוראות טכניות ברורות:** פרט שאלות attached לעומת independent item, seller/manager, bundle price, media ו־sold lifecycle. אין הנחה שכל חבר קבוצה הוא בעל פריט.
  - **קריטריון קבלה:** כל state/permission מופרד מבעלות דירה; עלות ריהוט אינה מוצגת כשכר דירה.

- [ ] **משימה 22.2: מפרט קשר ומחזור חיים**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL22-furniture.md`.
  - **הוראות טכניות ברורות:** אחרי החלטות 22.1 תכנן in-app buyer→seller consent ושימור שיחה בהסרה/השכרה; אין payments/escrow אלא אם יאושרו.
  - **קריטריון קבלה:** marked rented של דירה לא מוחק פריט של אחר; sold אינו מקבל פנייה על זמינות מדומה.

- [ ] **משימה 22.3: מטריצת קבלה לפריטים**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL22-furniture.md`.
  - **הוראות טכניות ברורות:** רשום שני מוכרים/קונה/outsider: edit, contact, sold, report, media ownership ו־removed-card behavior.
  - **קריטריון קבלה:** לכל תרחיש צפי מוגדר; הראיה מסומנת not executed ואין שינוי schema/Storage.


### SL23 — פרסום מקצועי וייבוא

needs-decision; B10/D1/D11/G4/M6.

- [ ] **משימה 23.1: גבולות פורטפוליו וייבוא**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL23-professional-import.md`.
  - **הוראות טכניות ברורות:** תכנן actor/portfolio ownership, authorized publisher source ושאלות duplicate identity; אין third-party scraping.
  - **קריטריון קבלה:** כל listing פעיל דורש owner/contact route/provenance; מנהל פורטפוליו אינו מקבל בעלות גלובלית.

- [ ] **משימה 23.2: מפרט preview/validate/commit**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL23-professional-import.md`.
  - **הוראות טכניות ברורות:** אחרי אישור 23.1 פרט schema של row, preview errors, idempotent commit ו־partial-failure report עם expansion compatibility.
  - **קריטריון קבלה:** retry אינו מוגדר כיצירת property חדש; שורה לא תקינה אינה half-public; אין upload/import בפועל.

- [ ] **משימה 23.3: מטריצת dataset מאושר**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL23-professional-import.md`.
  - **הוראות טכניות ברורות:** הגדר dataset synthetic bounded ותרחישי cross-owner denial, duplicate/retry/rollback ומקור לכל row.
  - **קריטריון קבלה:** התרחישים ברי־הרצה ב־packet עתידי; אין הכנסה למאגר של כתובות/טלפונים מיובאים.


### SL24 — קיבולת ושאילתות בקנה מידה

needs-research; J2–J8/K3. אין migration PostGIS ללא צורך שנמדד.

- [ ] **משימה 24.1: הגדרת benchmark ומדדים**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL24-scale.md`.
  - **הוראות טכניות ברורות:** כתוב dataset/concurrency/latency/payload targets כהצעה לאישור, מפת query access paths ופרטיות; הבחן בין יעד שוק לעומס שצריך להוכיח.
  - **קריטריון קבלה:** יש commands מוצעים ודפוסי נתונים, ומוגדר מי מאשר סף; אין טענת capacity מהנוכחות של index.

- [ ] **משימה 24.2: מחקר מגבלות ותכנית ניסוי**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL24-scale.md`.
  - **הוראות טכניות ברורות:** רענן current official provider quotas/free terms ו־Realtime limits; תכנן ניסוי isolated ללא עומס על shared/public backend.
  - **קריטריון קבלה:** מקורות מתוארכים והנחות מחיר מפורשות; אין התחייבות כספית או free-tier guarantee.

- [ ] **משימה 24.3: דוח EXPLAIN ומועמד לשיפור**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL24-scale.md`.
  - **הוראות טכניות ברורות:** רק אחרי אישור ניסוי הרץ baseline synthetic ביעד מבודד ותעד p50/p95/payload/connections; הצע index/PostGIS רק לממצא נמדד.
  - **קריטריון קבלה:** דוח כולל commands/results/limitations ובדיקת paging/privacy; אין index/migration production כחלק ממשימת המחקר.


### SL25 — השקה ציבורית ורכישה

needs-decision; L1–L7/K3–K5/M1–M6. דמו למשקיעים אינו אישור השקה.

- [ ] **משימה 25.1: גבולות הפעלה ואחריות**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL25-public-launch.md`.
  - **הוראות טכניות ברורות:** רכז access/abuse/support/incident/supply/staffing/budget ושאלות owner; הפנה למדיניות קיימת במקום להמציא SLA/יעד 1000 דירות.
  - **קריטריון קבלה:** מסמך מבחין ידוע/דורש החלטה/דורש ראיה; אין חסימה רטרואקטיבית לדמו הסינתטי.

- [ ] **משימה 25.2: שערי משפט, פרטיות וקיבולת**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL25-public-launch.md`.
  - **הוראות טכניות ברורות:** מפה לכל gate מקור דרישה, אחראי ותוצר נדרש; domain/terms/providers/restore נשארים עם actual evidence, בלי תחליף אוטומטי לייעוץ.
  - **קריטריון קבלה:** כל gate ניתן לבדיקה ולא מוצג כסגור משום ש־build עבר; אין purchase domain או פתיחת קהל.

- [ ] **משימה 25.3: תכנית אישור ו־rollback להשקה**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL25-public-launch.md`.
  - **הוראות טכניות ברורות:** תכנן preflight SHA/backend/deploy, feature availability, incident rollback/forward repair ודרך קבלת אישור מפורש.
  - **קריטריון קבלה:** תכנית public launch מסתיימת באישור מפורש אחרי ראיות, ואינה מבצעת פרסום/קמפיין/הודעות.


### SL26 — חיפושים שמורים והתראות דירה חדשה

needs-decision; F7/L5/C4. אינו חלק מהתראות הודעות MVP.

- [ ] **משימה 26.1: חוזה relevance והסכמה**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL26-saved-search.md`.
  - **הוראות טכניות ברורות:** פרט private saved search, מה נחשב new/reopen/edit, תדירות/digest/opt-out ו־completed-search suppression כהכרעות נדרשות.
  - **קריטריון קבלה:** אין הסכמה משתמעת מהודעת chat notifications; תקציב נשאר פרטי.

- [ ] **משימה 26.2: מפרט matching ו־outbox**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL26-saved-search.md`.
  - **הוראות טכניות ברורות:** לאחר החלטות 26.1 תכנן filter-by-room server-side, unique search/listing/event ומדיניות reevaluation לפני send.
  - **קריטריון קבלה:** listing בלתי זמין/מוגבל או search ששונה אינו נשלח; אין יצירת outbox חי או monitor אוטומטי.

- [ ] **משימה 26.3: מטריצת קבלה למשלוח**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL26-saved-search.md`.
  - **הוראות טכניות ברורות:** רשום fixtures רלוונטי/לא רלוונטי/retry/opt-out/השלמת חיפוש ודוגמת payload כללי עם קישור מורשה.
  - **קריטריון קבלה:** הצפי לכל תרחיש מוגדר; מסירה אמיתית נשארת שער נפרד ליעד מאושר.


### SL27 — מדיה בצ׳אט ומודרציה עתידית

needs-decision; F3/H4/J9. text ו־listing cards נשארים סוגי MVP.

- [ ] **משימה 27.1: חוזה מדיה ומדיניות review**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL27-media.md`.
  - **הוראות טכניות ברורות:** רכז allowed formats/limits/ownership/scan-review/retention ואחראי; אין public bucket או AI moderation מאושרים אוטומטית.
  - **קריטריון קבלה:** כל כלל מקורו בהחלטה או שאלה פתוחה; אין הפעלת העלאות לפני מדיניות.

- [ ] **משימה 27.2: מפרט upload פרטי והצגה**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL27-media.md`.
  - **הוראות טכניות ברורות:** לאחר החלטות 27.1 תכנן pending upload→validate→attach→authorized read ו־retry cleanup, לפי chat membership/join cutoff/block.
  - **קריטריון קבלה:** אין מצב partial-visible; signed access אינו עוקף revocation/history; reviewer access מוגבל ומתועד.

- [ ] **משימה 27.3: מטריצת מדיה והרשאות**
  - **קבצים לעריכה/יצירה:** `docs/deferred/SL27-media.md`.
  - **הוראות טכניות ברורות:** הגדר spoofed type, outsider read/write, prejoin, block, removal, failed upload ו־cross-owner cleanup, עם supported real files לניסוי עתידי.
  - **קריטריון קבלה:** יש צפי לכל תרחיש ו־Storage API boundary; שום payload/thumbnail mock לא מסומן כהוכחת media security.


## סיום התור

השלמת שלב א׳ פירושה שאפשר להציג את מסעות הליבה במערכת האמיתית עם משתמשים סינתטיים מסומנים. השלמת שלב ב׳ דורשת ראיות נפרדות לכל חבילת MVP. שלב ג׳ הוא תכנון נדחה ואינו המשך אוטומטי. אין מקור במסמך זה למספר משתמשים, התחייבות השקעה, תמחור או אישור פעילות ציבורית.
