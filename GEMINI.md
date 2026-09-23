# ReviewXpress Strict Engineering Rules & Operating Protocols

## 1. Strict Scope & Command Discipline ("Jitna Command Ho Utna Hi Kaam Karein")
- **Minimal Surgical Changes Only**: Modify ONLY the specific file(s), line(s), or feature(s) explicitly requested by the user.
- **Do Not Touch Working Code**: Never refactor, reformat, "improve", or rewrite working pages, components, or API routes without an explicit user instruction.
- **Preserve Existing UI/UX**: Do not introduce unrequested visual styles, colors, layouts, or library upgrades.

---

## 2. Zero Data Loss & Merchant Account Protection
- **Permanent Account Preservation**: Existing client merchant accounts (e.g., `kumawat clothing` and any merchants registered in production) must NEVER be lost, overwritten, truncated, or removed during any update, integration, or redeployment.
- **Supabase as Single Source of Truth**:
  - The Supabase `businesses` table and `sys-accounts-vault` row are the canonical sources of truth.
  - Never overwrite cloud vaults with stale local fallback files.
- **Customer Logs & Scans Protection**: All customer reviews, ratings, private feedback, scan statistics, and NFC/QR records stored in Supabase `review_logs` must remain intact at all times.
- **Zero Resurrection of Deleted Accounts**: When an account is deleted by the Master Admin, it must remain permanently deleted across all databases, cloud vaults, and caches. Never re-insert or resurrect deleted accounts from legacy files.

---

## 3. Customer Complaint Retention Policy
- Unhappy customer complaints must **NOT** be auto-deleted immediately when marked "resolved".
- Resolved complaints must remain preserved for at least **10 days** before any auto-cleanup, allowing store owners to review historical feedback.

---

## 4. Integration, Build & Deployment Protocols
- **No Premature Final Integration**: Do NOT perform final deployment or announce completion until the user explicitly confirms readiness.
- **Build Verification**: Always run `npm run build` to verify 0 TypeScript errors and successful static/dynamic generation before any git commit.
- **Clean Git Remotes**: After pushing with credentials or Personal Access Tokens (PAT), immediately sanitize and reset the remote URL (`git remote set-url origin https://github.com/kumawatgaurav203-lang/ReviewExpress.git`) so no credentials remain in `.git/config`.
