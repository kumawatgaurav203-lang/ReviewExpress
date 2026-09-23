# Antigravity Operating Rules & Strict Directives for ReviewXpress SaaS

## 1. Strict Scope Discipline ("Jitna Command Ho Utna Hee Kaam")
- NEVER do unrequested refactoring, architecture redesign, or unnecessary cosmetic modifications.
- Execute strictly what the user commands — no more, no less.
- Working pages, APIs, and features must never be rewritten or touched unless specifically ordered.

## 2. Zero Data Loss Policy (Existing Accounts & Stores Protection)
- All existing merchant accounts (e.g., `kumawat clothing`, future real client stores) MUST NEVER be deleted, overwritten, or corrupted.
- Store details (Business Name, Category, 8-character password, Email, Google Maps Review URL) MUST be preserved across all updates:
  1. Supabase PostgreSQL `businesses` table (Primary Source of Truth)
  2. Supabase Cloud Accounts Vault (`sys-accounts-vault`)
  3. Redis Cache (`sys:accounts-vault`)
  4. Local `data/accounts.json`
- In any future integration, redeploy, or update, NEVER reset or overwrite merchant credentials or scan analytics.

## 3. NFC & QR Link Integrity Guarantee
- Customer review URLs (`/r/[slug]`, `/r/[slug]?source=qr`, `/r/[slug]?source=nfc`) and printable QR standee URLs (`/qr/[slug]`) must ALWAYS remain active, responsive, and properly routed.
- If a customer taps the NFC card or scans the QR standee at a counter, it must always resolve to the correct business profile and redirect 4/5-star reviews to their Google Maps review URL without fail.
- All scan logging (`/api/log-scan`) and analytics must remain active for both `source=qr` and `source=nfc`.

## 4. Host Downtime & Container Restart Resilience
- The application is hosted on Render with an ephemeral container filesystem.
- Local ephemeral disk files must NEVER be considered the sole authority.
- The cloud database (Supabase Cloud PostgreSQL) and cloud Redis cache are the permanent sources of truth.
- If Render or the hosting server restarts, crashes, or is redeployed:
  - All merchant accounts, passwords, review links, complaints, and review logs MUST automatically hydrate and remain 100% intact from Supabase and Redis.
  - Zero data loss, zero link breakages.

## 5. Permanent Deletion & Anti-Resurrection Shield
- When an account is deleted by the Master Admin:
  - It must be deleted from Supabase `businesses` table, `review_logs`, Redis cache, and `sys-accounts-vault`.
  - It must NEVER be hardcoded into Git repository files (`data/accounts.json`, `data/reviews.json`, route fallbacks).
  - Deleted accounts (e.g., `photify-studio`) are permanently blacklisted via tombstones and can never be resurrected across any number of updates or redeployments.
