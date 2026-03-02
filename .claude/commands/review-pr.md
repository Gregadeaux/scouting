---
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Agent
argument-hint: [PR number or branch name or "staged changes"]
description: Run all 4 review gates (code, architecture, QA, security) on changed code and produce a consolidated gate report
model: sonnet
---

# PR Review — All Gates

Run all 4 mandatory review gates on the changes described by: **$ARGUMENTS**

## What to Review

If `$ARGUMENTS` is a PR number, fetch the diff with:
```bash
gh pr diff $ARGUMENTS
```

If `$ARGUMENTS` is a branch name, compare with main:
```bash
git diff main...$ARGUMENTS --name-only
git diff main...$ARGUMENTS
```

If `$ARGUMENTS` is "staged changes":
```bash
git diff --staged
```

Read the changed files in full using the Read and Glob tools before invoking the gate agents.

## Gate Sequence

Run each gate agent in sequence. Each gate must PASS before the PR can merge.

### Gate 1: Code Review
Invoke the `code-reviewer` agent with the list of changed files and the diff.
Wait for its PASS/FAIL report.

### Gate 2: Architecture Review
Invoke the `architect` agent with the list of changed files and the diff.
Wait for its PASS/FAIL report.

### Gate 3: Functional / QA Review
Invoke the `qa-engineer` agent with the list of changed files and the acceptance criteria (if provided in $ARGUMENTS or derivable from the PR description).
Wait for its PASS/FAIL report.

### Gate 4: Security Review
Invoke the `security-reviewer` agent with the list of changed files and the diff.
Wait for its PASS/FAIL report.

## Consolidated Report

```
# PR Review Report
**PR**: $ARGUMENTS
**Date**: [today]

## Gate Results

| Gate | Result | Issues |
|---|---|---|
| Code Review | PASS / FAIL | [count] |
| Architecture | PASS / FAIL | [count] |
| QA / Functional | PASS / FAIL | [count] |
| Security | PASS / FAIL | [count] |

## Overall: [APPROVED / CHANGES REQUIRED]

---
## Gate Details

[Paste full output from each gate below]

### Code Review Gate
[output]

### Architecture Gate
[output]

### QA Gate
[output]

### Security Gate
[output]

---
## Required Changes Before Merge
[Consolidated list of all BLOCKER / FAIL items that must be resolved]
```

If all 4 gates PASS: the PR is **APPROVED** for merge.
If any gate FAILS: list all required changes. The developer must fix and re-run the failed gate(s).
