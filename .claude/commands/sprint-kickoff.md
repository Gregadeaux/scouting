---
allowed-tools: Read, Bash, Glob, Grep
argument-hint: [Linear issue number(s) or milestone description]
description: Generate a sprint kickoff handoff package — the context document that agent personas use to run the autonomous development sprint
model: sonnet
---

# Sprint Kickoff Handoff Package

Generate a complete kickoff handoff package for the sprint described by: **$ARGUMENTS**

The kickoff handoff is the most important artifact humans produce. It determines the quality of everything the agent personas build.

## Step 1 — Gather Context

If `$ARGUMENTS` contains Linear issue numbers (e.g., SCOUT-123), fetch them:
```bash
# Use gh or linear CLI if available, or ask the user to paste issue details
```

Read relevant existing code to understand what already exists:
```bash
git log --oneline -20
git status
```

Also read:
- `CLAUDE.md` for current season status and coding standards
- `PERSONAS.md` for sprint workflow reminder

## Step 2 — Generate Handoff Package

Produce the following document:

---

```markdown
# Sprint Kickoff Handoff
**Date**: [today]
**Sprint Goal**: [1-sentence statement of what success looks like]
**Milestone**: [specific deliverable — what will exist at end of sprint that didn't before]

---

## Acceptance Criteria

These are the conditions a functional reviewer will check. Each must be unambiguous.

- [ ] [Criterion 1 — specific, testable]
- [ ] [Criterion 2 — specific, testable]
- [ ] [Criterion 3 — specific, testable]

---

## Architectural Guidance

[Decisions made in planning that agents should follow without re-litigating]

- **Pattern to follow**: [e.g., "This follows the team service pattern in src/lib/services/team.service.ts"]
- **Layer constraints**: [e.g., "No direct Supabase calls from new components"]
- **Season handling**: [e.g., "Use season-detection utility, do not hardcode 2025"]
- **Files to modify**: [list files expected to change]
- **Files NOT to modify**: [list files that should be left alone]

---

## Known Constraints

- [Any technical limitations or decisions already made]
- [Dependencies on other systems (TBA API, Supabase edge functions, etc.)]
- [Performance requirements if applicable]

---

## Open Questions for Agent Resolution

[Questions agents should resolve autonomously during the sprint]

1. [Question — agents should decide and document their answer]
2. [Question]

---

## Open Questions Requiring Human Input

[Anything that genuinely needs human judgment — queue for next morning review]

1. [Question]

---

## Harness Updates Since Last Sprint

[Any prompt changes, memory updates, or tooling fixes from yesterday's retro]

- [Update 1]
- [Update 2]

---

## Environment Notes

- Active season: [2025/2026 based on CLAUDE.md]
- Branch to work on: [feature/scout-XXX-description]
- Linear issue(s): [SCOUT-XXX]
```

---

## Checklist Before Handing Off

Review this before telling agents to proceed:

- [ ] Sprint goal is a single, clear sentence
- [ ] Every acceptance criterion is independently verifiable
- [ ] Architectural guidance specifies which existing patterns to copy
- [ ] No acceptance criterion requires human judgment to evaluate
- [ ] Files expected to change are listed
- [ ] Linear issue is linked

When complete, paste this handoff package into the conversation where the `developer` persona will receive it.
