# Contributing

## Team Workflow: Frontend Completion Evidence

When closing any frontend issue in Paperclip, include a completion comment with publication evidence.

Checklist:

- `branch`: exact git branch name used for delivery
- `commit`: full 40-character SHA
- `pr_url`: GitHub pull request URL
- `artifact_paths`: one or more repo paths under `artifacts/`

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
- Branch: `feature/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `https://github.com/1siamBot/payment-gateway/pull/123`
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```

Blocked publication variant:

```md
## Completion (Blocked Publication)

- Issue: [ONE-XXX](/ONE/issues/ONE-XXX)
- Parent compliance issue: [ONE-68](/ONE/issues/ONE-68)
- Branch: `feature/one-xxx-short-name`
- Commit: `0123456789abcdef0123456789abcdef01234567`
- PR: `Unavailable: GitHub credentials not available in runtime`
- Blocker owner: `PM/CTO`
- Retry plan: `2026-03-20T10:00:00+07:00 (Asia/Bangkok)`
- Artifacts:
  - `artifacts/one-xxx/<artifact-file>.md`
```
