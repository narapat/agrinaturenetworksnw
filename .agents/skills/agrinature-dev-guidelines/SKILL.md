---
name: agrinature-dev-guidelines
description: >-
  Essential engineering guide, architecture constraints, data privacy rules, and
  automated regression testing workflow for AI developers and agents working on the
  Nakhon Sawan Agri-Nature Network (quick-rutherford) codebase. Activate this skill
  whenever implementing new features, modifying authentication or LINE LIFF flows,
  updating data structures, or running regression tests.
---

# Nakhon Sawan Agri-Nature Hub: AI Developer & Regression Testing Guide

This skill serves as the foundational runbook and architecture guide for AI developers working on the **Nakhon Sawan Agri-Nature Network** (`nakhonsawan-agrinature-hub`) application.

Follow these instructions and constraints to maintain zero-regression, privacy, and security integrity.

---

## 1. System Architecture Overview

* **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
* **Identity & Member Access**: LINE Front-end Framework (`@line/liff`) via [`src/services/liffService.ts`](file:///Users/narapat/Documents/antigravity/quick-rutherford/src/services/liffService.ts)
* **Data Layer**: Cloud Firestore + LocalStorage Hybrid with offline cache via [`src/services/dataService.ts`](file:///Users/narapat/Documents/antigravity/quick-rutherford/src/services/dataService.ts)
* **Admin Authentication**: Server-Side HMAC-SHA256 signed session tokens stored in `HttpOnly`, `SameSite=Strict` cookies via [`src/app/api/admin/auth/route.ts`](file:///Users/narapat/Documents/antigravity/quick-rutherford/src/app/api/admin/auth/route.ts)
* **Test Runners**:
  * **Vitest**: Unit, Security, and RBAC tests (`npm test`)
  * **Puppeteer**: Headless Browser End-to-End Smoke tests (`npm run test:e2e`)

---

## 2. Non-Negotiable Architectural Invariants (Must NEVER Break)

### 🔒 Invariant 1: Zero Data Leakage Policy (Anti-Scammer Protection)
Farmers' personal information must be protected at all costs:
1. **Exact GPS Coordinates**:
   - `internalCoordinates` (`lat`, `lng`) is strictly for authenticated network admins.
   - `getPublicFarms()` and `getFarmById()` **MUST ALWAYS** strip `internalCoordinates`. Only `publicZone` approximate coordinates (3–5 km radius) may be sent to public visitors.
2. **Contact Privacy**:
   - If `isPublicPhone === false`, the `.phone` property **must be omitted/undefined** in public views.
   - If `isPublicLine === false`, the `.lineId` property **must be omitted/undefined** in public views.
   - Verified by: [`tests/unit/data-privacy-roles.test.ts`](file:///Users/narapat/Documents/antigravity/quick-rutherford/tests/unit/data-privacy-roles.test.ts)

### 🛡️ Invariant 2: Zero Secrets in Client Bundles
1. **Never prefix admin secrets with `NEXT_PUBLIC_`**:
   - `ADMIN_PASSCODE` and `ADMIN_SESSION_SECRET` reside on the server only (`.env.local`).
2. **Timing Safe Comparison**:
   - Passcode verification in `/api/admin/auth` must use `crypto.timingSafeEqual` to prevent timing attacks.
3. **Session Cookie**:
   - Admin session cookie `nsw_admin_auth_session` must be signed with HMAC-SHA256, and marked `httpOnly`, `sameSite: 'strict'`, `path: '/'`.
   - Verified by: [`tests/unit/admin-auth.test.ts`](file:///Users/narapat/Documents/antigravity/quick-rutherford/tests/unit/admin-auth.test.ts)

### 🔄 Invariant 3: Anti-Loop & Sign-Out State Management
To prevent infinite redirect loops in mobile browsers and LINE LIFF in-app browser:
1. **Sign-Out Flag**:
   - When user triggers sign out, `localStorage` and `sessionStorage` set `nsw_user_logged_out = 'true'`.
   - `liffService.init()` and `AdminLayout.tsx`'s `checkAdminAuth()` **must check `nsw_user_logged_out` first** and abort auto-login if true.
2. **Safe DELETE Request**:
   - Calls to `DELETE /api/admin/auth` during logout must include `{ keepalive: true }` so the browser completes the request even if the page unloads/navigates.
3. **Clearing on Login**:
   - Both `liffService.login()` and `AdminLayout.tsx` (`handleLogin`) must remove `nsw_user_logged_out` upon intentional login.

---

## 3. Automated Regression Testing Commands

Every AI developer must execute and verify the following tests before declaring any task complete:

```bash
# 1. Run Unit, Security & RBAC Tests (< 0.5s)
npm test

# 2. Run E2E Smoke Tests in Headless Browser (~3-5s)
npm run test:e2e

# 3. Verify Next.js Production Compilation
npm run build
```

---

## 4. Test Suite Structure & Writing New Tests

```text
tests/
├── unit/
│   ├── admin-auth.test.ts          # Server HMAC token generation, tampering, expiry, cookies
│   ├── data-privacy-roles.test.ts   # Sanitization, phone masking, GPS hiding, RBAC logic
│   └── line-matching.test.ts        # Smart & partial matching for LINE accounts
└── e2e/
    └── admin-smoke.mjs             # Puppeteer E2E: Home, Gate rejection, Login, Logout
```

### When Adding a New Feature:
1. **New Service Method / Business Logic**:
   - Add corresponding test cases in `tests/unit/`.
   - Mock minimal state without external dependencies.
2. **New Public Endpoint or UI Component**:
   - Verify that private farmer contacts and GPS coordinates are not accidentally exposed in HTML/JSON responses.
3. **New Admin Feature**:
   - Ensure the feature is protected under `src/app/admin/layout.tsx` or checks `hasAdminRole(user)`.

---

## 5. Standard Verification Checklist for AI Devs

Before committing code or replying to the user:
- [ ] Ran `npm test` and confirmed all test suites pass (21+ tests).
- [ ] Ran `npm run test:e2e` and confirmed all Puppeteer smoke tests pass.
- [ ] Ran `npm run build` and confirmed exit code 0.
- [ ] Verified no sensitive passcodes or keys are hardcoded in client components.
- [ ] Verified `isPublicPhone` and `internalCoordinates` privacy rules remain unbroken.
