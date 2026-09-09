# AI Developer Directives: Nakhon Sawan Agri-Nature Hub

Welcome AI Developer! This project is the official web application for the **Agri-Nature Network of Nakhon Sawan Province** (`nakhonsawan-agrinature-hub`).

To ensure the safety of our farmers, protect user privacy, and prevent regression bugs, all AI developers and autonomous agents working on this codebase **MUST strictly follow these guidelines**.

---

## 🛑 Top 4 Core Commandments (Never Violate)

1. **Zero Data Leakage for Farmers (Anti-Scammer Guarantee)**
   - Never expose `internalCoordinates` (real GPS) to public users. Only `publicZone` approximate coordinates may be displayed publicly.
   - Never expose `phone` or `lineId` unless `isPublicPhone === true` or `isPublicLine === true`.
   - Always run queries through `sanitizeFarmForPublic()` / `sanitizeProductForPublic()`.

2. **No Secrets in Client Bundles**
   - Never use `NEXT_PUBLIC_` for `ADMIN_PASSCODE` or `ADMIN_SESSION_SECRET`.
   - All admin access must be verified on the server via `POST /api/admin/auth` using HMAC-SHA256 and HTTP-Only cookies.

3. **Prevent Auth & Redirect Loops**
   - Honor the `nsw_user_logged_out` flag in both `liffService.ts` and `AdminLayout.tsx`.
   - Never initiate automatic redirection or auto-login if the user has explicitly logged out.
   - Always use `{ keepalive: true }` when calling `DELETE /api/admin/auth` during logout.

4. **Always Run Regression Tests Before Finishing Work**
   - Unit & Security Tests: `npm test`
   - E2E Smoke Tests: `npm run test:e2e`
   - Production Build Check: `npm run build`

---

## 📚 Detailed Skill Documentation

For complete architecture details, test runner instructions, and data schemas, refer to:
👉 [`.agents/skills/agrinature-dev-guidelines/SKILL.md`](file:///Users/narapat/Documents/antigravity/quick-rutherford/.agents/skills/agrinature-dev-guidelines/SKILL.md)
