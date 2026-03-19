# Contributing

## Team Workflow: Backend Completion Evidence

When closing any backend issue in Paperclip, include a completion comment with publication evidence.

Checklist:

- `branch`: exact git branch name used for delivery
- `commit`: full 40-character SHA
- `pr_url`: GitHub pull request URL
- `tests`: commands executed for backend verification
- `artifact_paths`: one or more repo paths under `artifacts/` when artifacts are generated

If PR publication is blocked, replace `pr_url` with:

- explicit reason PR is unavailable
- blocker owner
- timestamped retry plan
- latest local commit SHA waiting for publication

Template:

```md
## Completion

- Issue: [ONE-XXX](/ONE/issues/ONE-XXX)
- Parent compliance issue: [ONE-68](/ONE/issues/ONE-68)
- Branch: `backend/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `https://github.com/1siamBot/payment-gateway/pull/123`
- Tests:
  - `npm test -- test/<backend-suite>.spec.ts`
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```

Blocked publication variant:

```md
## Completion (Blocked Publication)

- Issue: [ONE-XXX](/ONE/issues/ONE-XXX)
- Parent compliance issue: [ONE-68](/ONE/issues/ONE-68)
- Branch: `backend/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `Unavailable: GitHub credentials not available in runtime`
- Blocker owner: `PM/CTO`
- Retry plan: `2026-03-20T10:00:00+07:00 (Asia/Bangkok)`
- Tests:
  - `npm test -- test/<backend-suite>.spec.ts`
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```

## Team Workflow: Frontend Completion Evidence

When closing any frontend issue in Paperclip, include a completion comment with publication evidence.

Checklist:

- `branch`: exact git branch name used for delivery
- `commit`: full 40-character SHA
- `pr_url`: GitHub pull request URL
- `touched_files`: repo-relative paths changed for delivery
- `verification`: test/build command output summary used for QA handoff
- `artifact_paths`: one or more repo paths under `artifacts/`
- `traceability`: include links to [ONE-68](/ONE/issues/ONE-68) and [ONE-71](/ONE/issues/ONE-71) in every completion comment

If PR publication is blocked, replace `pr_url` with:

- explicit reason PR is unavailable
- blocker owner
- timestamped retry plan (absolute date/time with timezone)
- latest local commit SHA waiting for publication

Template:

```md
## Completion

- Issue: [ONE-XXX](/ONE/issues/ONE-XXX)
- Parent compliance issue: [ONE-68](/ONE/issues/ONE-68)
- QA handoff issue: [ONE-71](/ONE/issues/ONE-71)
- Branch: `feature/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `https://github.com/1siamBot/payment-gateway/pull/123`
- Touched files:
  - `frontend/path/to/file.vue`
- Verification summary:
  - `npm run frontend:build` (pass)
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```

Blocked publication variant:

```md
## Completion (Blocked Publication)

- Issue: [ONE-XXX](/ONE/issues/ONE-XXX)
- Parent compliance issue: [ONE-68](/ONE/issues/ONE-68)
- QA handoff issue: [ONE-71](/ONE/issues/ONE-71)
- Branch: `feature/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `Unavailable: GitHub credentials not available in runtime`
- Blocker owner: `PM/CTO`
- Retry plan: `2026-03-20T10:00:00+07:00 (Asia/Bangkok)`
- Touched files:
  - `frontend/path/to/file.vue`
- Verification summary:
  - `npm run frontend:build` (pass/fail + short note)
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```
