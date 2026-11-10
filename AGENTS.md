# AI Developer Directives: Nakhon Sawan Agri-Nature Hub

Welcome AI Developer! This project is the official web application for the **Agri-Nature Network of Nakhon Sawan Province** (`nakhonsawan-agrinature-hub`).

To ensure the safety of our farmers, protect user privacy, and prevent regression bugs, all AI developers and autonomous agents working on this codebase **MUST strictly follow these guidelines**.

---

## 🛑 Core Commandments & Architectural Invariants (Never Violate)

1. **Zero Data Leakage for Farmers (Anti-Scammer Guarantee)**
   - Never expose `internalCoordinates` (real GPS) to public users. Only `publicZone` approximate coordinates may be displayed publicly.
   - Real GPS coordinates and sensitive contact info must reside strictly in `farms/{farmId}/private/contact`.
   - Never expose `phone` or `lineId` to unauthenticated users. Sensitive PII (`phone`, `lineId`) must reside strictly in `members/{memberId}/private/pii`.
   - **Profile Photo Intentional Placement**: `facePhotoUrl` in the public `members` collection is **intentionally retained** for applicant profile photos to foster community trust and peer identification across the network. The subcollection `members/{memberId}/private/pii` also stores `facePhotoUrl` as backup.
   - Always run queries through `sanitizeFarmForPublic()` / `sanitizeProductForPublic()`.

2. **Ownership Model Invariant (`ownerUid`)**
   - In Firebase Auth, `request.auth.uid` corresponds to the farmer's LINE User ID.
   - Firestore document IDs (`mem-xxx`, `farm-xxx`, `prod-xxx`) do NOT equal the user's UID.
   - ALL security rules and queries checking document ownership MUST check `resource.data.ownerUid == request.auth.uid`, NEVER `resource.id == request.auth.uid`.
   - `members`, `members/private/pii`, `farms`, `farms/private/contact`, and `products` MUST store `ownerUid`.

3. **Approval Lifecycle & Status Immutability**
   - Both `MemberProfile` and `Farm` require admin approval (`status: 'pending' | 'approved' | 'rejected'`).
   - Normal users cannot self-approve or create documents with `status: 'approved'`.
   - Normal users cannot alter `status` in update rules (`request.resource.data.status == resource.data.status`). Only admins (`isAdmin()`) can transition status to `approved` or `rejected`.

4. **Server-Only Document Creation (`members` & `farms`)**
   - Client-side creation of `members` and `farms` documents is strictly forbidden in `firestore.rules` (`allow create: if false`).
   - All member registrations and farm creations MUST execute via atomic Server API route handlers (`POST /api/member/register` and `POST /api/farm/create`).
   - Registration enforces idempotency (`idempotency/{requestId}`) and atomic anti-duplicate guards (`registrations/{ownerUid}`).

5. **No Secrets in Client Bundles**
   - Never use `NEXT_PUBLIC_` for `ADMIN_PASSCODE` or `ADMIN_SESSION_SECRET`.
   - All admin passcode access must be verified on the server via `POST /api/admin/auth` using HMAC-SHA256 and HTTP-Only cookies.
   - **Never trust a raw `lineUserId` sent by the client** (body, query string, header). LINE User IDs are not secrets — they are stored as `ownerUid` on publicly readable `farms`/`products` docs. Identity must come from the `sub` of a LINE ID Token verified server-side (`verifyLineIdToken()` in `@/lib/lineIdToken`, sent as `Authorization: Bearer <LINE_ID_TOKEN>`) or from the HMAC admin session cookie (`@/lib/adminSession`).
   - The `/admin` gate is decided by the server only. Never fall back to client-side flags (`nsw_admin_session_token` in local/sessionStorage) to grant admin UI access.
   - `POST /api/audit` requires authentication. `actorRole`, `actorUid`, and `authMethod` are derived on the server; client-supplied `actorRole` is ignored. If the Admin SDK is unavailable it must return 500, never a fake success.
   - Client writes to public parent docs must send only an explicit allowlisted patch — never a full in-memory object (e.g. `updateFarm` only writes `FARM_PUBLIC_UPDATABLE_FIELDS`), because in-memory objects may be hydrated with private subcollection data.

5a. **Admin Actions Go Through the Server (`/api/admin/*`)**
   - Every admin read and write uses an Admin API route wrapped in `runAdminRoute()` (`@/lib/adminRoute`), which calls `requireAdmin()` first and returns 500 when the Admin SDK is unavailable. The admin UI calls these through `adminApi` (`@/services/adminApi`) and must `await` the result and show errors — never fire-and-forget client Firestore writes from admin screens. The old `dataService` admin mutators are `@deprecated`.
   - Admin UI structure: `src/app/admin/layout.tsx` (login gate) → `AdminDataProvider` (loads the snapshot once, shared by all sub-pages via `useAdminData()`, exposes `runAction()`) → `AdminShell` (header, banners, menu) → one sub-page per section under `src/app/admin/*/page.tsx`. Add new admin sections as new sub-pages with their own local state; put only cross-page data in the provider.
   - Each mutation commits its data change and its audit log in **one batch** (`buildAdminAuditDoc()` in `@/lib/adminAudit`).
   - **Admin identity source of truth is `ADMIN_LINE_USER_IDS` (server env).** There is no UI to grant/revoke admin, and nothing may write `role: 'admin'` to member docs. To add an admin: get their LINE UID (shown in the member dashboard), add it to the env on Vercel, redeploy, and have them log in with LINE again.
   - Two ways in: LINE (session 7 days, re-checked against the whitelist on every request) and the **backup passcode** (session 3 hours, requires an actor name for the audit log). Session lifetime is bound to the method inside the signed cookie.
   - Irreversible actions (delete member, delete category/practice, delete news) use `requireLine: true` — passcode sessions get 403. Keep it that way: the passcode is a shared secret and cannot identify who acted.
   - Passcode brute-force protection (`@/lib/passcodeRateLimit`): 5 failures/15 min per IP and 20/15 min globally lock passcode login for 15 min (LINE unaffected). It fails closed when Firestore is unavailable. Do not move the counters to memory — Vercel instances do not share it.
   - Permanent member delete must remove `members/{id}`, `private/pii`, linked farms + `private/contact`, their products, and `registrations/{ownerUid}`.

6. **Admin Auth vs Admin Firestore Isolation (No Auth in Pages/SSR)**
   - Never import `getAdminAuth` or `@/lib/firebaseAdminAuth` from Server Components, layouts, or pages.
   - Admin Auth is strictly restricted to API Route Handlers (`src/app/api/...`) to prevent bundling `jwks-rsa` into public SSR trees.
   - Server Components may only import `getAdminDb` from `@/lib/firebaseAdmin`.

7. **Firebase Admin SDK & Dependency Lock Invariant**
   - `firebase-admin` must remain locked at version `13.10.0` (with nested CommonJS `jose@4.15.9` under `jwks-rsa`).
   - Never modify package resolutions or lockfile dependencies in ways that force ES Module resolution of `jose` into Node CommonJS runtimes.

8. **Node.js 24.x Runtime on Vercel**
   - Vercel production deployment must execute on Node.js 24.x (matching `package.json` engines `"node": ">=20.0.0"`).

9. **Always Run Regression Tests Before Finishing Work**
   - Firestore Security Rules: `npm run test:rules` (Emulator-based unit tests - mandatory for any rule edit)
   - Unit & Security Tests: `npm test` (Zero silent fallback & RBAC validation)
   - E2E Smoke Tests: `npm run test:e2e`
   - Production Build Check: `npm run build`
   - NEVER weaken rules or mock tests to bypass code issues; fix the underlying application code instead.

---

## ⚠️ Recognized Technical Debt (Documented for Future Phases)

1. **Admin Dual-Auth Structural Debt (mostly resolved)**
   - The admin screen now runs entirely through `/api/admin/*`, so a passcode-only admin (no Firebase custom claim) can work. The remaining overlap: some shared client code (e.g. `ensureFirestoreSync`) still reads Firestore directly and relies on the LINE custom claim for admin-only collections.

2. **Line ID Phone Fallback Vector**
   - Legacy fallback of `cleanLineId` to `cleanPhone` or `tokenPayload.name` has been audited and removed in Task D to prevent phone numbers from leaking into public `lineId` fields.

---

## 📚 Detailed Skill Documentation

For complete architecture details, test runner instructions, and data schemas, refer to:
👉 [`.agents/skills/agrinature-dev-guidelines/SKILL.md`](file:///Users/narapat/Documents/antigravity/quick-rutherford/.agents/skills/agrinature-dev-guidelines/SKILL.md)
