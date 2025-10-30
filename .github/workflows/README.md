# GitHub Workflows

This directory contains automated workflows for the FRC Scouting System.

## Sync Issue Status to Project

**File**: `sync-issue-status.yml`

### Purpose

Automatically syncs issue status labels with the GitHub Project board status field. When you add a label like `status: in progress` to an issue, the workflow updates the corresponding project item's status to "In Progress".

### How It Works

1. **Trigger**: Fires when a label is added to or removed from an issue
2. **Filter**: Only processes labels starting with `status:`
3. **Match**: Finds the matching status option in the project (case-insensitive)
4. **Update**: Updates the project item's status field to match

### Label → Status Mapping

The workflow automatically maps labels to project statuses by name:

| GitHub Label | Project Status |
|--------------|----------------|
| `status: todo` | Todo |
| `status: in progress` | In Progress |
| `status: ready to test` | Ready to Test |
| `status: needs changes` | Needs Changes |
| `status: done` | Done |

### Setup Requirements

#### 1. Project Status Options

Your GitHub Project must have the following status options configured:

- **Todo** - Initial state for new issues
- **In Progress** - Currently being worked on
- **Ready to Test** - Implementation complete, needs testing
- **Needs Changes** - Tested but requires modifications
- **Done** - Completed and verified

**To add missing options:**

1. Go to your [project settings](https://github.com/users/Gregadeaux/projects/3)
2. Click the three dots (...) → Settings
3. Find the "Status" field and click the pencil icon
4. Click "+ Add option" for each missing status
5. Run `node scripts/verify-project-setup.mjs` to confirm

#### 2. Issue Labels

Create the following labels in your repository:

```bash
# Create status labels
gh label create "status: todo" --color "d4c5f9" --description "Issue is in the backlog"
gh label create "status: in progress" --color "0e8a16" --description "Currently being worked on"
gh label create "status: ready to test" --color "fbca04" --description "Ready for testing"
gh label create "status: needs changes" --color "d93f0b" --description "Requires changes"
gh label create "status: done" --color "0075ca" --description "Completed"
```

### Configuration

The workflow is pre-configured with your project details:

- **Project ID**: `PVT_kwHOAAc3Ns4BGyII`
- **Status Field ID**: `PVTSSF_lAHOAAc3Ns4BGyIIzg3upxs`
- **Project Number**: `3`

If you need to update these, edit the values at the top of the workflow script.

### Testing

1. **Verify setup**:
   ```bash
   node scripts/verify-project-setup.mjs
   ```

2. **Test the workflow**:
   - Create or find an existing issue in your project
   - Add the label `status: in progress`
   - Go to Actions tab to see the workflow run
   - Check the project board - the issue should move to "In Progress"

3. **Check workflow logs**:
   - Go to GitHub Actions tab
   - Click on the workflow run
   - Expand "Sync status label to project" to see detailed logs

### Troubleshooting

#### Workflow doesn't run

- **Check**: Is the workflow file committed and pushed to the `main` branch?
- **Check**: Are you adding labels to issues (not pull requests)?
- **Check**: Is the label name exactly matching (e.g., `status: in progress`)?

#### Status doesn't update

- **Check logs**: View the workflow run in the Actions tab for error messages
- **Check project**: Is the issue added to the project board?
- **Check status options**: Run `node scripts/verify-project-setup.mjs`
- **Check permissions**: The `GITHUB_TOKEN` needs write access to projects

#### Status option not found

```
⚠️ No status option found matching "ready to test"
Available options: Todo, In Progress, Needs Changes, Done
```

**Solution**: Add the missing status option to your project settings.

### Workflow Output Examples

**Success**:
```
Processing label "status: in progress" -> status "in progress"
Available status options: Todo, In Progress, Ready to Test, Needs Changes, Done
Found matching status option: "In Progress" (47fc9ee4)
Found project item for issue #42: MDExOlByb2plY3RWMkl0ZW0yOTc=
✅ Updated issue #42 to status "In Progress"
```

**Missing Status**:
```
Processing label "status: ready to test" -> status "ready to test"
Available status options: Todo, In Progress, Needs Changes, Done
⚠️ No status option found matching "ready to test"
Please add this status option to the project settings.
```

**Issue Not in Project**:
```
Processing label "status: in progress" -> status "in progress"
⚠️ Issue #42 not found in project
The issue may need to be added to the project first.
```

### Benefits

1. **Consistency**: Labels and project status always stay in sync
2. **Automation**: No manual dragging of cards between columns
3. **Flexibility**: Works with any status options you configure
4. **Visibility**: Clear workflow logs show exactly what happened
5. **Resilience**: Gracefully handles missing statuses or project items

### Maintenance

- **Adding new statuses**: Just add the option to the project and create the matching label
- **Renaming statuses**: Update both the project option and the label (they must match)
- **Removing statuses**: Delete the label and optionally remove from project

### Integration with CLAUDE.md

This workflow aligns with the project guidelines in `CLAUDE.md`:

> "When I ask to add features, make sure there is a github issue with proper labels and milestone assignment to track it with."

> "Once you are finished with a feature, update the github issue, setting its status to 'ready to test'."

> "When I ask you to test the project, go through all of the github issues for ones with the status 'ready to test'..."

The workflow automates the status tracking mentioned in these guidelines.

### Future Enhancements

Potential improvements for this workflow:

- [ ] Auto-add issues to project when status label is applied
- [ ] Sync other fields (milestone, assignee, etc.)
- [ ] Support for multiple projects
- [ ] Slack/Discord notifications on status changes
- [ ] Analytics: track time spent in each status

---

**Last Updated**: 2025-10-29
**Maintained by**: FRC Scouting System Team
