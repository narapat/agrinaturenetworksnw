# AI Developer Directives: Nakhon Sawan Agri-Nature Hub

Welcome AI Developer! This project is the official web application for the **Agri-Nature Network of Nakhon Sawan Province** (`nakhonsawan-agrinature-hub`).

To ensure the safety of our farmers, protect user privacy, and prevent regression bugs, all AI developers and autonomous agents working on this codebase **MUST strictly follow these guidelines**.

---

## 🛑 Top 5 Core Commandments (Never Violate)

1. **Zero Data Leakage for Farmers (Anti-Scammer Guarantee)**
   - Never expose `internalCoordinates` (real GPS) to public users. Only `publicZone` approximate coordinates may be displayed publicly.
   - Real GPS coordinates and sensitive contact info must reside strictly in `farms/{farmId}/private/contact`.
   - Never expose `phone`, `lineId`, or face photo to unauthenticated users. Sensitive PII must reside in `members/{memberId}/private/pii`.
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

4. **No Secrets in Client Bundles**
   - Never use `NEXT_PUBLIC_` for `ADMIN_PASSCODE` or `ADMIN_SESSION_SECRET`.
   - All admin access must be verified on the server via `POST /api/admin/auth` using HMAC-SHA256 and HTTP-Only cookies.

5. **Always Run Regression Tests Before Finishing Work**
   - Firestore Security Rules: `npm run test:rules` (Emulator-based unit tests)
   - Unit & Security Tests: `npm test`
   - E2E Smoke Tests: `npm run test:e2e`
   - Production Build Check: `npm run build`
   - NEVER weaken rules to bypass code issues; fix the data model or application code instead.

---

## 📚 Detailed Skill Documentation

For complete architecture details, test runner instructions, and data schemas, refer to:
👉 [`.agents/skills/agrinature-dev-guidelines/SKILL.md`](file:///Users/narapat/Documents/antigravity/quick-rutherford/.agents/skills/agrinature-dev-guidelines/SKILL.md)
