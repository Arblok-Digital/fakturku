# Security Audit Notes - FakturKu

Date: 2026-10-16  
Scope: Read-only manual deep-dive (DB boundary, API, FE/XSS, admin access, repo secrets).  
Target: master @ 89a9d80 (Production baseline).  
Status: **Documentation only - no code or pipeline changes.**

## 1. Audit Summary
- Repo visibility: public. Git history scanned: no service_role/SUPABASE_SERVICE/jwt credential ever committed.
- Live DB anon probe: public catalog readable as intended; private tables return [] or 401. Privileged RPCs (`adjust_credits`, `set_role`, `approve_topup`, `reject_topup`, `update_category`) blocked for anon.
- RLS/RBAC: Frontend uses `is_admin()` DB RPC; all admin mutations pass through DB `is_admin()` else raise `hanya admin`. Fail-closed in UI.
- AI assistant: backend `api/gemini-assistant.js` protects GEMINI_API_KEY via serverless (`process.env`). Auth header required; daily quota enforced.
- FE rendering: `innerHTML` widely used, but all user-controlled fields passed through `esc`/`admEsc`/manual escaping. AI suggestions applied via `target.value = suggestion.value` (property assignment).
- Inputs: Password fields are `type="password"` and rely on Supabase Auth.
- Output/PDF/Print: Templates use `h.esc()` for all dynamic strings; base64 logo in `<img src>` escaped.
- Session: Supabase client session persisted (localStorage), standard behavior, requires XSS mitigation (covered).

## 2. Findings

| # | Severity | Title | Evidence | Notes/Remediation |
|---|---|---|---|---|
| 1 | Low | Hardcoded HMAC secret in offline ledger | `js/modules/credit-ledger.js:2` | `const SECRET = "FakturKuSecret2026"` used for `adminCode(requestId)`. Only impacts local/offline admin redemption; no financial impact. If desired, randomize or suppress offline code path. |
| 2 | Info | Comment revealing DB password location | `js/config.js:4` | `/* DB password: lihat .env.local ... */` discloses where password is stored. Remove comment. Anon key is public by design. |
| 3 | Low | `verifyCode` not crypto-grade | `js/modules/format.js:43` | Uses djb2 (non-cryptographic) hash. Display-only invoice code; no security expectation. Keep or migrate to crypto.subtle if must be tamper-resistant. |
| 4 | Low | Cloud sync logic bypassable client-side | `js/modules/backend.js:263` | `saveInvoice()` skips on `state._serverNumberRequired`; attacker could manipulate local state to skip/reserved number blocking. RLS prevents cross-user writes (`user_id = auth.uid()`). Severity low: UX-only drift, not data exfiltration. |
| 5 | Low | Precached/offline `/admin` + local admin panel | `admin.html` + `sw.js` SHELL | Offline admin panel remains reachable. No DB coupling; processing local ledger. Optional cleanup: remove `/admin` from sw SHELL if strict production pruning needed. |
| 6 | Info | Missing hardened HTTP headers | `vercel.json` (headers) | No CSP/XFO/XCTO. Adding CSP directly may break inline template injection; start with `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. |
| 7 | Low | In-memory IP rate limiter non-shared | `api/gemini-assistant.js:14-26` | Per-lambda instance map. Per-user daily quota remains DB authoritative, so abuse is bounded. May tighten with e.g. Supabase KV edge if traffic scales. |
| 8 | Info | Off-by-one escaping in items inputs | `js/app.js` item table | `.replace(/"/g,...)` removes `"`, but does not escape `'`. Template uses double-quotes, so lower risk. Use `esc()` for consistency across all injected attributes. |
| 9 | Info | Optional DOM element injection risk | Several templates | Only `h.esc()` used; ensure any future new templates keep double escaping (e.g., inside attribute quotes). Test with `"><script>` inputs. |

## 3. Verified Good Behavior (no change needed at this time)
- Public repo contains no secrets.
- Private tables are not visible to anonymous requests.
- RPCs enforce `is_admin()`.
- UI fails closed on admin checks.
- Templates prevent XSS through `h.esc`.
- AI assistant avoids direct markdown/rendered html, uses DOM text nodes.
- Service worker version policy unaffected by this audit.

## 4. Recommended Automated Checks (future CI / DeepSeek continuation)
- `gitleaks` history + filesystem scan.
- `semgrep` rule pack for: `innerHTML`, `dangerouslySetInnerHTML` equivalents, `eval`, `new Function`.
- `npm audit` / `snyk` (CDN-deps scanning manually since no node_modules used).
- `codeql` JavaScript/TypeScript suite.
- OWASP ZAP baseline against Preview/Production (read-only paths).
- CSP incremental rollout: measure innerHTML paths and add nonces gradually.

## 5. Exclusions & Intentional Non-Fixes
- `.sample-editor-banner` [hidden] bug - left intentionally as per prior requirement.
- Local-mode `admin.html` panel - not ported to app by design.
- Migration file documents function already existing in live DB - not re-applied.

## 6. Ownership & Next Steps
- Prepared for: DeepSeek/security continuation (already familiar with pipeline & numbering/billing).
- No commits pushed, no production changes made in this audit.  
- If patching is approved: create feature branch, implement 2/6/8 first (comment removal + headers + attribute escaping), preview verify, then promote in separate step.

## 7. Validation Log (2026-10-17, local, not pushed)

Local commits ahead of `origin/master` (Production still at `89a9d80`):
- `14cdd04` chore(security): remove password-location comment + add XFO/XCTO/Referrer/Permissions headers
- `0c30488` docs(security): add this audit note
- `7bdce8d` fix(auth): clear stale session when Supabase refresh token invalid

Static validation:
- `vercel.json` parses as valid JSON; security header block present (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy).
- `js/config.js`: `.env.local` hint removed; no env file tracked by git.
- `node --check` passes for `js/modules/backend.js` and `js/config.js`.
- `git diff origin/master..master` touches only 4 files; working tree clean.

Runtime validation (Playwright, local static server `http://127.0.0.1:5500`):
- Injected a realistic expired JWT + bogus refresh token into `localStorage` key `sb-pcydwlfyughwasyqglwq-auth-token`, then reloaded.
- Reproduced the reported failure exactly once: `POST .../auth/v1/token?grant_type=refresh_token => 400`.
- After that, the invalid session was removed from storage, the login modal was shown (`#auth-modal` visible, `#workspace` hidden), and the app stayed functional (`get_categories => 200`).
- Second reload: zero auth requests, zero console errors → the bad session does not repeat/linger.

Caveats / not yet verifiable locally:
- The single 400 comes from supabase-js internal auto-refresh on a genuinely revoked token; the fix removes the lingering session and prevents repetition, but the first attempt still happens once.
- HTTP security headers are served by Vercel; they can only be verified end-to-end after a Preview deployment (requires push).
- Item 8 (single-quote attribute escaping in `js/app.js` item inputs) was intentionally left unchanged to avoid touching render logic.