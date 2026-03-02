---
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
argument-hint: [sprint goal or "current sprint"]
description: Run the end-of-sprint agent retrospective — analyze gate telemetry, update memory and skills, improve the harness for next sprint
model: sonnet
---

# Agent Sprint Retrospective

Run the end-of-sprint retrospective for: **$ARGUMENTS**

The retro's output feeds directly into the next morning's human retro. It surfaces what the agent harness should change, so improvements compound daily.

## Step 1 — Gather Sprint Telemetry

```bash
# Sprint commits
git log main..HEAD --oneline

# Any demo package from this sprint
ls .claude/sprints/ 2>/dev/null | tail -5
```

Read the demo package if it exists to get gate pass/fail data.

## Step 2 — Retrospective Analysis

Analyze the sprint and produce this retrospective:

```markdown
# Agent Sprint Retrospective
**Sprint**: [goal]
**Date**: [today]

---

## What Went Well

[Things that worked — gate catches that prevented problems, patterns that were clear, decisions that were easy]

1. [Item]
2. [Item]

---

## What Was Hard

[Things that slowed down the sprint — ambiguous acceptance criteria, missing context, gates that fired false positives, patterns that weren't clear]

1. [Item — root cause analysis]
2. [Item]

---

## Gate Telemetry

| Gate | Times Run | Times Failed | Common Failure Reason |
|---|---|---|---|
| Code Review | N | N | [pattern] |
| Architecture | N | N | [pattern] |
| QA / Functional | N | N | [pattern] |
| Security | N | N | [pattern] |

---

## Recurring Issues (Patterns to Fix)

[Issues that happened more than once — these signal harness improvements needed]

### Issue 1
- **What happened**: [description]
- **Root cause**: [ambiguous handoff? missing pattern reference? wrong gate criteria?]
- **Recommended fix**: [specific change to a prompt, memory entry, or skill]

---

## Harness Improvement Recommendations

[Concrete changes to make before next sprint]

### Prompt Updates
- **File**: `.claude/agents/[persona].md`
- **Change**: [what to add/remove/clarify and why]

### Memory Updates
- **File**: `memory/MEMORY.md` or `memory/[topic].md`
- **Change**: [what to record for future sprints]

### Kickoff Template Updates
- **Section**: [which section of the handoff template]
- **Change**: [what to add to prevent recurrence]

---

## Questions for Human Retro Tomorrow

[Items the human team should discuss in their morning retro]

1. [Question — frame as a decision or improvement needed]
2. [Question]

---

## Memory Updates Applied This Sprint

[Facts learned during this sprint that should persist to future sprints]

1. [Fact about this codebase or workflow]
```

## Step 3 — Apply Memory Updates

If the retro identified memory updates, apply them now using the Write/Edit tools on the relevant memory files in `memory/`.

Do NOT write speculative or unverified conclusions. Only write things confirmed by this sprint's work.

## Step 4 — Update Harness (if clear wins)

If a persona prompt change is low-risk and clearly correct (e.g., adding a specific pattern reference that was obviously missing), apply it now using Edit on the relevant `.claude/agents/` file.

Flag high-stakes prompt changes for human review in the morning retro instead.
