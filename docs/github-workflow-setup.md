# GitHub Workflow Setup

## Automated Issue Status Sync

This project includes an automated GitHub Actions workflow that syncs issue labels with project board statuses.

### Quick Reference

| Label | Project Status | Use Case |
|-------|---------------|----------|
| `status: todo` | Todo | Issue is in the backlog |
| `status: in progress` | In Progress | Currently being worked on |
| `status: ready to test` | Ready to Test | Implementation complete, needs testing |
| `status: needs changes` | Needs Changes | Tested but requires modifications |
| `status: done` | Done | Completed and verified |

### How to Use

1. **Add a label** to any issue: `status: in progress`
2. **Workflow automatically updates** the project board status to match
3. **No manual dragging** of cards needed!

### Files

- **Workflow**: `.github/workflows/sync-issue-status.yml`
- **Documentation**: `.github/workflows/README.md`
- **Verification Script**: `scripts/verify-project-setup.mjs`
- **Setup Helper**: `scripts/add-project-status-options.mjs`

### Testing

To test the workflow:

```bash
# Verify configuration
node scripts/verify-project-setup.mjs

# Add a status label to an issue
gh issue edit <issue-number> --add-label "status: in progress"

# Check the Actions tab to see the workflow run
# https://github.com/Gregadeaux/scouting/actions
```

### Alignment with Project Guidelines

From `CLAUDE.md`:

> "Once you are finished with a feature, update the github issue, setting its status to 'ready to test'."

This workflow automates that process! When you (or Claude) add the `status: ready to test` label, the project board automatically updates.

### Setup Status

✅ Workflow file created
✅ All status labels created
✅ All project status options configured
✅ Verification script available
✅ Documentation complete

**Next Step**: Push to GitHub and test!

---

**Created**: 2025-10-29
**Documentation**: See `.github/workflows/README.md` for full details
