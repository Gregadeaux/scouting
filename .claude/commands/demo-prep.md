---
allowed-tools: Read, Bash, Glob, Grep
argument-hint: [sprint goal or "current sprint"]
description: Prepare the end-of-sprint demo package that the human team reviews the next morning
model: sonnet
---

# Sprint Demo Package Preparation

Prepare the end-of-sprint demo package for: **$ARGUMENTS**

This package is what the human team opens first thing next morning during Sprint Review. Make it scannable — they should be able to get the full picture in 10 minutes.

## Step 1 — Gather Sprint Data

```bash
# What was changed
git log main..HEAD --oneline

# What files changed
git diff main..HEAD --name-only

# Test results
npm run test -- --run 2>&1 | tail -20

# Type check
npm run type-check 2>&1
```

## Step 2 — Produce the Demo Package

```markdown
# Sprint Demo Package
**Sprint Goal**: [goal from kickoff handoff]
**Date**: [today]
**Branch**: [current branch]
**Linear Issue(s)**: [SCOUT-XXX]

---

## Summary

[2-3 sentences: what was built, what was deferred, overall outcome]

---

## What Was Built

### [Feature/Fix Name]
- **Description**: [What it does and why]
- **Files changed**: [list]
- **How to see it**: [Where to look in the app, or what test to run]

### [Feature/Fix Name 2]
[same structure]

---

## What Was Deferred

| Item | Reason | Recommended Next Step |
|---|---|---|
| [item] | [why not done] | [what to do next] |

---

## Acceptance Criteria Review

| Criterion | Status | Notes |
|---|---|---|
| [criterion 1] | Met / Partial / Not Met | [detail] |
| [criterion 2] | Met / Partial / Not Met | [detail] |

---

## Gate Pass/Fail Summary

| Gate | Iterations to Pass | Final Result |
|---|---|---|
| Code Review | [N] | PASS |
| Architecture | [N] | PASS |
| QA / Functional | [N] | PASS |
| Security | [N] | PASS |

---

## Key Decisions Made

[Decisions the developer persona made autonomously during the sprint that the human team should know about]

1. [Decision — what was chosen and why]
2. [Decision]

---

## Open Questions for Human Review

[Items flagged during standup that need human judgment]

1. [Question — what decision is needed?]

---

## How to Verify

```bash
# Pull the branch
git checkout [branch-name]

# Install and run
npm install
npm run dev

# Run tests
npm run test -- --run
```

**Key areas to review in the app**:
1. [Navigate to X to see Y]
2. [Check Z behavior by doing W]

---

## Metrics

- Iterations: [N]
- Gate failures resolved: [N]
- Tests added: [N]
- Files changed: [N]
```

## Step 3 — Save the Package

Save the demo package as `.claude/sprints/[date]-demo.md` for the human team to find.

```bash
mkdir -p .claude/sprints
```

This file is gitignored by default (add `.claude/sprints/` to `.gitignore` if not already there). It's for team use during review, not for the permanent codebase history.
