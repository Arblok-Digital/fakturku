# AGENTS.md — FakturKu operating rules

Read this file before editing, testing, committing, or deploying.

## 1. Repository and branch discipline

- Canonical repository: `Arblok-Digital/fakturku`.
- Feature work happens on feature branches (e.g. `feat/...`); any pushed branch gets a Vercel Preview deployment automatically.
- `master` is the production line, and pushing to `master` deploys Production immediately (Vercel Production Branch = `master`). Do not commit directly to it for feature work.
- Always inspect the current branch, latest commit, and working-tree changes before touching files.
- Do not overwrite changes made by another agent. Fetch/re-read the current file immediately before updating it.
- Keep changes scoped. Explain what changed, why, files touched, checks performed, and known limitations in the handoff.
- Never claim a test, build, visual check, or deployment succeeded unless it was actually run and its result observed.

## 2. Deployment guardrails

- A Vercel Preview deployment is for review; it is not production approval.
- Wait for Preview deployment status **Ready**, then provide its URL and a short test checklist.
- Do not merge/push to `master` (which deploys Production), change Vercel project settings/domains/environment variables, roll back commits, or delete branches unless the user explicitly authorizes that exact action.
- A user's approval that a preview looks good means the preview passed their visual review; it does not by itself authorize production deployment unless they explicitly say to deploy/promote to production.
- Before any production release, summarize the exact commit/branch and scope, plus the expected production impact.

## 3. Product-specific constraints

- Keep the category selection inside the template dropdown unless the user explicitly asks otherwise.
- Keep the template selector available.
- Print, Save as, and WhatsApp sharing actions belong at the bottom of the workflow, not in the header, unless explicitly requested.
- Do not change backend, database schema, auth, billing, RPC, or data migration as part of a frontend/UI task without explicit approval.
- Preserve the user's live draft when switching between Edit, Preview, and Contoh.
- The Contoh tab must render fictional example data using the selected template's renderer. It must not mutate the user's actual document state. Disable document output/share actions while viewing example data and restore the user's document when leaving example mode.
- Do not present generic tax/legal templates as official, certified, or guaranteed compliant. The internal tax worksheet is not official e-Faktur.

## 4. Where to look first

- `docs/ARCHITECTURE.md`: layer map, data pipeline, template contract, invariants, and a per-task "start here" reading list. **Read this before exploring the repo** — it exists so agents don't have to read the whole codebase.
- `index.html`: app structure and mobile bottom navigation.
- `css/app.css`: app/editor/preview/mobile styles.
- `css/landing.css`: landing page styles.
- `js/app.js`: UI wiring, state, tab switching, and example mode.
- `js/templates/`: template definitions and field metadata.
- `js/modules/template-engine.js`: template selection/rendering integration.
- `js/modules/`: domain modules; inspect the specific module before changing it.
- `sw.js`: service-worker cache version. If cached assets change, consider whether the cache version must be bumped; do not bump it automatically without understanding the caching behavior.
- `supabase/schema.sql`: backend schema. Treat as high impact.
- `PLAN-billing-kategori/`: supporting research/planning notes, not runtime code.

Always inspect current files; this map can become stale as the repository evolves.

## 5. Minimum validation for UI/template work

Run checks appropriate to the change and report their exact outcome. At minimum consider:
- JavaScript syntax checks for modified JS files.
- Check that HTML IDs are unique and referenced IDs exist.
- Confirm imports and asset paths resolve.
- Review the diff for accidental changes and secrets.
- Test on the Vercel Preview or local static server at mobile width.
- For template work, verify at least one representative template per affected category and test Edit → Preview → Contoh → Edit to confirm the user's draft remains intact.
- Check print/save/share behavior only where relevant; example mode must not output fictional data accidentally.

Do not report an interactive browser test if only HTTP/asset availability was checked.

## 6. Local machine and sync safety

- GitHub branch/commit is the shared source of truth; an arbitrary folder on a local drive may be stale or may contain uncommitted work.
- Before using a local folder: verify its path, remote URL, current branch, latest commit, and `git status`.
- Do not delete a local project folder just because it is behind the remote. First confirm there are no unique uncommitted files/changes and that the repository is recoverable from GitHub.
- Do not copy an old local folder over the latest branch. Prefer fetching the remote branch and reviewing diffs.

## 7. Handoff format

When finishing, report:
1. Branch and commit changed.
2. Files changed and short purpose.
3. Checks actually performed and results.
4. Preview URL/status, if deployed.
5. What the user should verify.
6. Explicitly state whether production was changed (normally: no).
