# Shutaf — תוכנית הבנייה

Updated: 17 October 2026 (Asia/Jerusalem).
State: technical/moderation defaults, poster invitations, ordinary pilot signup and taxonomy baseline approved. No identified major MVP product architecture question remains. Local implementation contracts are distinct from actual runtime/provider/legal release evidence.

## היעד

אב־טיפוס עובד לפיילוט סגור ולהצגת החזון למשקיעים/גופי תמיכה: מקום אחד לחיפוש דירה וחדרים, מציאת שותפים, יצירת קבוצה ותקשורת בתוך האפליקציה. באר שבע היא מוקד ההתחלה; אין חסימת פרסום מערים אחרות. מנוי Pro, אפליקציה native ומרקטפלייס כללי אינם תנאי לסיום אב־הטיפוס.

הצלחה בתכנון: לסוכן המבצע יש מפרט שמגדיר התנהגות, הרשאות, נתונים, מצבי כשל ובדיקות לכל מסע. אין להסיק שהמוצר כבר עובד רק משום שהמפרט קיים. אין הבטחה שהיקף מסוים יביא השקעה.

## Where each fact lives

For an autonomous next-feature request start with [START_NEXT_WORK](START_NEXT_WORK.md); the read-only selector `node scripts/next-work.mjs --json` chooses from actual recorded progress. Keep detailed evidence in owning workstreams.

| Question | Authoritative location |
| --- | --- |
| What has the owner approved? | DECISIONS.md; OPEN/RESEARCH are not approved answers |
| What is the pilot intended to prove and include? | PILOT_SCOPE.md; proposed allocations explicitly labeled |
| What exactly does a domain do? | specs/ linked below; subordinate to DECISIONS.md |
| Which independently deliverable slice do I execute? | SLICES.md; consume only execution-ready entries |
| What was actually run and where? | Per-workstream handoff + evidence; PROJECT_STATUS.md is navigation |
| What are the business hypotheses? | BUSINESS_MODEL.md; approved behavior also gets a canonical decision row |
| Why are old prompts not sufficient? | PLANNING_READINESS_AUDIT.md and LEGACY_SLICE_MAP.md |
| How do I execute/recover/finish? | EXECUTION_PROTOCOL.md and TESTING.md |
| What do I do next, in which order? | WORK_PLAN.md and EXECUTION_PACKETS.md; packets.json records bounded local readiness |

Do not make BUILD_PLAN, STATUS_SEED, copied chat prompts or a Notion mirror a competing authority. Keep original inputs intact as historical evidence. An old slice ID maps into the new catalog, not directly into implementation authorization.

## Domain specifications

- [Pilot scope and acceptance](PILOT_SCOPE.md)
- [Ordered work plan and remaining decisions](WORK_PLAN.md)
- [Initial bounded execution packets](EXECUTION_PACKETS.md)
- [Remaining MVP execution packets](REMAINING_MVP_PACKETS.md)
- [Delegated technical defaults](specs/TECHNICAL_DEFAULTS.md)
- [Poster invitation and capability contract](specs/POSTER_OUTREACH.md)
- [Consolidated owner review choices](REVIEW_CHOICES.md)
- [MVP decision questionnaire, 16 October](MVP_DECISION_QUESTIONNAIRE.md)
- [Owner answers and plain-language explanations](MVP_DECISION_ANSWERS.md)
- [Reported defects](KNOWN_ISSUES.md)
- [Local isolated testing workflow](LOCAL_TESTING_WORKFLOW.md)
- [Data/API/rollout blueprint](specs/DATA_CONTRACTS.md)
- [Matching proposal](specs/MATCHING.md)
- [Concrete taxonomy and bilingual field/options proposal](specs/TAXONOMY.md)
- [Availability, privacy, blocking and deletion](specs/LIFECYCLE_AND_PRIVACY.md)
- [Map and address search](specs/MAP_SEARCH.md)
- [Notifications and measurement](specs/NOTIFICATIONS_AND_MEASUREMENT.md)
- [Agent execution protocol](EXECUTION_PROTOCOL.md)
- [Slice catalog](SLICES.md)
- [Legacy task coverage](LEGACY_SLICE_MAP.md)
- [All 142 decision rows: coverage snapshot](DECISION_COVERAGE.md)
- [Business record](BUSINESS_MODEL.md)

## Closed choices and remaining evidence

| Gate | What is unresolved | Safe planning behavior before answer |
| --- | --- | --- |
| Q-ACCESS | Closed A11: ordinary signup, limited marketing | No invite-code/approval system; preserve B10 short intake |
| Q-TAXONOMY | Closed C2: TAXONOMY baseline adopted | Generate typed manifest/locale from approved table; wording refinement cannot change semantics silently |
| Q-MATCH | Closed C3/C13: typed comparisons/weights/coverage fixed | SQL scoring implementation, deterministic fixtures and privacy acceptance still required |
| Q-MODERATION | No remaining owner architecture question after explicit adoption | D10/H2/H4/H6 approved; implement protected queue, report cohorts and operator reversal with acceptance tests |
| Q-DELETE | B7/F6/E3 product baseline approved; legal retention/redaction/job recovery not proven | Complete research and testable details, no new 30-day product question |
| Q-PLATFORM | Technical defaults adopted; actual free-provider eligibility/capacity not proven | Execute approved local contracts; verify named live gates. No paid resources or silent acceptance downgrade |

Closed/deferred in direct answers: free-only budget, student verification MVP, provisional identity/minimum profile, private group budget, multiple groups/admin transfer/shared-group block UI, pending-inquiry behavior, save-based interest count, expiry/three-report hiding, no owner address-revoke control, no inactive-user hiding, read receipts+typing, leave semantics, furniture/area monitors later. Initial supply outreach deferred, not MVP code blocker. Canonical rows hold details; product approval is not implementation/test evidence.

E7 follow-up resolved: share listing card in chat; each member saves independently; no separate group wishlist in MVP and no automatic group-member counter inflation.

## Delivery criteria for the planning package

- Every legacy item mapped once as primary ownership; secondary dependencies may reference it.
- Every new slice has prerequisites, exact tasks, acceptance, evidence expectations and stop conditions.
- Cross-cutting privacy, RTL/LTR, errors and mobile behavior belong to each slice; a later quality pass does not excuse missing basics.
- No execution-ready label with blocking OPEN choices, unresolved domain examples or unidentified backend.
- No existing capability is rebuilt just because status is unverified: inspect evidence and close the specific gap.
- Work is local/uncommitted until publication is explicitly authorized; this package does not deploy or migrate anything.

Structural check: `node scripts/check-planning.mjs`. After an authorized canonical decision edit, refresh its generated coverage with `node scripts/check-planning.mjs --write-decisions` (new IDs need explicit owner-slice assignment in the coverage manifest first). Generated dates/counts describe this planning snapshot, not feature verification.


Current priority: working MVP and university-funding demonstration. Follow WORK_PLAN order, preserve settled rules, and keep cosmetic polish/general launch/legal preparation from blocking independent local implementation. Privacy/authorization are concrete correctness requirements in each journey. 21 local packets cover required SL00–SL16; no runtime completion inferred.
