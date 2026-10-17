# FakturKu — Architecture & Agent Workflow Map

Purpose: let any agent (or human) make a scoped change **without reading the whole codebase**.
Read `AGENTS.md` first (rules), then this file (where things live). If this map and the code disagree, the code wins — fix the map.

---

## 1. Layer map — who owns what

| Layer | Files | Owns | Must NOT do |
|---|---|---|---|
| UI shell | `index.html`, `css/app.css`, `css/landing.css` | DOM structure, editor fields, mobile bottom nav, styles | Embed business logic |
| Controller | `js/app.js` | App state wiring, tab switching (Edit/Preview/Contoh), example mode, template picker, event binding | Define documents or call the DB directly |
| State / draft | `js/modules/invoice-engine.js` | Document state shape (`blankState`), `getPath`/`setPath`, `totals`, local drafts (localStorage), `hydrate`, `saveCurrent` | Render HTML |
| Render registry | `js/modules/template-engine.js` | `TEMPLATES`, `CATEGORY_MAP`, `getCategory`, `getTemplate`, **`renderDoc`** (single render entry) | Know about the network |
| Templates | `js/templates/*` | Per-document layout + field metadata + print HTML | Fetch data, mutate state |
| Formatting | `js/modules/format.js` | `esc`, `rupiah`, `formatDate`, `terbilang`, `verifyCode` (pure) | Side effects |
| Numbering | `js/modules/numbering.js` | Local prefixes + next number | Remote calls |
| Output | `js/modules/output.js` | `printDoc`, `shareImage`, `openWhatsApp`, `copySummary`, `downloadImage` | Change state |
| Remote adapter | `js/modules/backend.js` | Supabase: auth/session, `saveInvoice`, `nextDocumentNumber`, `tryDebit` (billing), `getCategories`, `getPackages`, `admin*` | Render, own UI state |
| Offline ledger | `js/modules/credit-ledger.js` | Local-mode credits, `PACKAGES`, `CONTACT`, offline top-up | Assume Supabase exists |
| Service worker | `sw.js` | Precache SHELL, offline | — (bump cache version only when it matters) |
| Serverless API | `api/gemini-assistant.js` | AI assistant endpoint (Gemini key from env), quota RPC, IP rate limit | Expose secrets |
| Backend schema | `supabase/` (`schema.sql`, `migrations/`) | Tables, RLS, RPCs, seeds | — (high impact; approval required) |
| Deploy config | `vercel.json` | Rewrites (`/admin`), headers | — |

---

## 2. Pipeline (data flow)

```
user edits  ──►  js/app.js (state, tab switching)
                        │
                        ▼
              js/modules/invoice-engine.js   (state shape, totals, draft persistence)
                        │
                        ▼
              js/modules/template-engine.js  renderDoc(state)
                        │  resolves template → template.render(state, helpers)
                        ▼
              js/templates/*  (HTML string, all user text escaped via format.esc)
                        │
                        ▼
                    #doc.innerHTML  ──►  js/modules/output.js  (print / save / WhatsApp / image)
```

- **Billing / persist** (remote mode): `backend.tryDebit(ref, category, template, data)` then `backend.saveInvoice(state)`; number from `backend.nextDocumentNumber(category)`.
- **Offline mode**: `credit-ledger.js` + `numbering.js` handle credits and numbering locally.
- `renderDoc` is the **only** rendering entry point. Never render documents anywhere else.

---

## 3. Files / routes

| Route / file | Served by | Notes |
|---|---|---|
| `/` | `index.html` | Main app |
| `/admin` | `admin.html` (via `vercel.json` rewrite) | Admin panel |
| `/api/gemini-assistant` | `api/gemini-assistant.js` | Serverless |
| `/sw.js` | `sw.js` | PWA shell cache |

`js/config.js` holds the Supabase URL + anon key — **public client values by design** (protected by RLS). Never put secrets there.

---

## 4. Template system contract

Two kinds of templates, one registry:

- **Special (4)**: `js/templates/faktur-a4.js`, `invoice-digital.js`, `kwitansi-a4.js`, `struk-ansuran.js`.
- **Business (32)**: `js/templates/business-documents.js` — `definitions[]` + shared renderers (`renderDocument`, `itemRows`, `signatureBlock`, `renderThermal`, `renderPayroll`).

Shared field metadata lives in `business-documents.js`:
- `labels` — human label per detail key.
- `definitions[].fields` — which details a template shows, in order.
- `moneyFields` — keys formatted as Rupiah.

Per-template render hints (all optional, backwards compatible):

| Property | Meaning |
|---|---|
| `uses:[...]` | Feature flags: `client`, `items`, `payment`, `due`, `terms`, `business-core`, `business-*` |
| `total:true` | Show subtotal/tax/grand-total block (only with `items`) |
| `itemMode:"priced"` \| `"qty"` \| `"pricelist"` | Table columns. `priced`=No/Uraian/Qty/Harga/Jumlah; `qty`=No/Uraian/Qty; `pricelist`=No/Uraian/Harga |
| `hidePrices:true` | Legacy alias → behaves as `itemMode:"qty"` |
| `partyLabel:"..."` | Overrides the party block heading (default "Kepada / Pihak Terkait") |
| `signatures:[left,right]` | Signature block labels (defaults exist, but set them explicitly) |
| `legalNote:true` / `disclaimer:"..."` | Adds the "not legal/official advice" footer |
| `payroll:true` / `output:"thermal"` | Alternate renderers |

### Adding or changing a template — READ THIS

Rendering is frontend-only, **but issuing is not**. `issue_document` validates the template id against
`public.document_templates` in the DB. So:

> A new template id added only in the frontend will **preview fine but fail on "terbit"** (billing/issue error).

Correct order: prepare the `document_templates` migration **and** the frontend together, and get explicit
approval before the migration runs. Category also drives the document-number prefix
(`document_categories.prefix`), so moving a template between categories changes its numbering prefix.

Rule of thumb: **preview = frontend; terbit = frontend + DB.** Never split those across a release boundary.

---

## 5. Invariants (do not break)

1. Category selection stays **inside** the template dropdown.
2. The template selector stays available.
3. Print / Save-as / WhatsApp actions live at the **bottom** of the workflow, not the header.
4. The user's live draft is preserved across Edit → Preview → Contoh → Edit.
5. **Contoh** renders fictional data and must **not** mutate user state; output/share is disabled in example mode.
6. Generic tax/legal templates are **never** presented as official, certified, or guaranteed compliant.
7. **Every** user-provided string that reaches the DOM is escaped (`format.esc`). No raw interpolation.
8. Backend / schema / auth / billing / RPC / migration changes require **explicit** approval.
9. No secrets in the repo. `js/config.js` anon key is public by design.
10. `sw.js` cache version is bumped only when a cached-asset change actually needs it.

---

## 6. Workflow (branch → validate → preview → approval → production)

1. **Branch**: `master` = production (push deploys immediately). Feature work on `feat/...` (or `fix/...`).
   Never commit feature work straight to `master`.
2. **Scope**: one concern per branch/commit. Inspect the current branch, last commit, and working tree first.
3. **Local validation gates** (report exact results, never claim untested):
   - `node --check` on every modified JS file (copy to `.mjs` first if it uses `import`/`export`).
   - Template work: render all templates with a harness (count, unique ids, no render errors, XSS escaping).
   - UI work: Playwright smoke on a local static server — picker options, Edit→Preview→Contoh→Edit draft intact, 0 console errors.
   - Review the diff for accidental changes and secrets.
4. **Preview**: push the feature branch → Vercel Preview. Wait for status **Ready**; give URL + test checklist.
5. **Approval**: a good preview ≠ production approval. Production only on the user's explicit instruction.
6. **Production**: summarize exact commit/branch, scope, and expected impact before promoting.
7. **Handoff**: use the format in `AGENTS.md` §7.

---

## 7. Start here — minimal reading per task

| You need to change… | Read only |
|---|---|
| Template picker / order / categories shown | `index.html` (`#tpl-filter`, `#tpl-grid`) + `renderTemplatePicker()` in `js/app.js` |
| A document's layout, fields, or columns | `js/templates/business-documents.js` + `renderDoc` in `js/modules/template-engine.js` |
| Document/state shape, drafts, totals | `js/modules/invoice-engine.js` |
| Print / save / share behaviour | `js/modules/output.js` |
| Auth, billing, saves, admin | `js/modules/backend.js` (+ `supabase/`) — approval required |
| Credits in offline mode | `js/modules/credit-ledger.js` |
| Serverless AI endpoint | `api/gemini-assistant.js` |
| Headers / rewrites / deploy | `vercel.json` |

---

## 8. Known drift & cautions

- The repo's `supabase/` schema can lag the **live** DB. Before touching billing/RPC/migrations, read the
  **live** function/table definitions (e.g. from the Supabase SQL editor). Do not assume repo schema = live.
- Example of past drift: `issue_document` argument list differed between repo files and the live DB.
- `sw.js` serves the app shell offline; stale caches can mask frontend changes during testing
  (unregister the SW / use a fresh origin).

_Last updated: 2026-10-17 (Phase 1 renderer/UX branch)._
