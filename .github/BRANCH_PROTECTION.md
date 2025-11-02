# Branch Protection Configuration

This document describes the recommended branch protection rules for the main and develop branches.

## Recommended Settings

### For `main` branch:

1. **Require pull request reviews before merging**
   - Required approving reviews: **1**
   - Dismiss stale pull request approvals when new commits are pushed: **✓**
   - Require review from Code Owners: **Optional**

2. **Require status checks to pass before merging**
   - Require branches to be up to date before merging: **✓**
   - Required status checks:
     - `lint / ESLint & TypeScript`
     - `test / Run Unit Tests`
     - `test / Run E2E Tests (chromium)` *(at minimum)*

3. **Require conversation resolution before merging**: **✓**

4. **Require linear history**: **Optional** (depends on team preference)

5. **Do not allow bypassing the above settings**: **✓**

### For `develop` branch:

Same settings as `main`, but optionally:
- Can reduce required reviewers to 0 for faster iteration
- Still enforce all status checks

## Setting Up Branch Protection

### Via GitHub Web UI:

1. Go to repository **Settings** → **Branches**
2. Click **Add branch protection rule**
3. Enter branch name pattern: `main`
4. Configure settings as listed above
5. Click **Create** or **Save changes**
6. Repeat for `develop` branch

### Via GitHub CLI:

```bash
# Protect main branch
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "lint / ESLint & TypeScript",
      "test / Run Unit Tests",
      "test / Run E2E Tests (chromium)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "required_conversation_resolution": true,
  "restrictions": null
}
EOF
```

## Workflow Status Checks

Our CI/CD pipeline includes the following workflows:

| Workflow | File | Duration | Purpose |
|----------|------|----------|---------|
| **Lint & Type Check** | `lint.yml` | ~2 min | Fast linting and type checking |
| **Unit Tests** | `unit-tests.yml` | ~5 min | Vitest unit tests with coverage |
| **E2E Tests** | `e2e.yml` | ~10 min | Playwright E2E tests (3 browsers) |

### Recommended Required Checks:

**Minimum (Fast Feedback)**:
- `lint / ESLint & TypeScript`
- `test / Run Unit Tests`
- `test / Run E2E Tests (chromium)` *(chromium only for speed)*

**Comprehensive (Maximum Quality)**:
- `lint / ESLint & TypeScript`
- `test / Run Unit Tests`
- `test / Run E2E Tests (chromium)`
- `test / Run E2E Tests (firefox)`
- `test / Run E2E Tests (webkit)`

## Benefits

✅ **Prevents broken code** from reaching main/develop
✅ **Enforces code review** before merging
✅ **Maintains test coverage** thresholds
✅ **Catches linting errors** early
✅ **Ensures TypeScript type safety**
✅ **Encourages conversation resolution**

## Troubleshooting

### "Required status check is not present"

If you see this error, it means:
1. The workflow hasn't run yet (create a PR to trigger it)
2. The workflow name/job name doesn't match exactly
3. The workflow is disabled or has errors

**Solution**: Push a commit to trigger all workflows, then add the checks after they appear.

### Checks are taking too long

If CI is slow:
1. **For PRs**: Only require chromium E2E tests
2. **For main**: Require all browsers (comprehensive testing)
3. Consider caching improvements in workflows

### Need to bypass protection temporarily

**Not recommended**, but if absolutely necessary:
1. Admin can temporarily disable branch protection
2. Make the urgent change
3. **Immediately re-enable protection**
4. Open follow-up PR to properly fix the issue

## Maintenance

Review and update these settings:
- **Quarterly**: As team grows/shrinks
- **When adding new workflows**: Add to required checks
- **When removing workflows**: Remove from required checks
- **After incidents**: Strengthen rules if needed

---

*Last updated: 2025-10-31*
