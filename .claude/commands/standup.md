---
allowed-tools: Read, Bash, Glob, Grep
argument-hint: [iteration number] [persona name(s) or "all"]
description: Run an agent standup between sprint iterations — report progress, blockers, and next steps
model: sonnet
---

# Agent Standup — Iteration $ARGUMENTS

Run a structured standup between iterations of the autonomous sprint.

## Standup Format

Each active persona reports on the standard three questions, plus a fourth for autonomous blocker resolution.

---

Produce a standup report in this format:

```markdown
# Agent Standup
**Sprint**: [sprint goal from kickoff handoff]
**Iteration**: $ARGUMENTS
**Time**: [now]

---

## Developer

**Completed this iteration**:
- [What was built/fixed]

**In progress**:
- [What's currently being worked on]

**Blockers**:
- [None | Description of blocker]

**Blocker resolution**:
- [How blocker was resolved autonomously, OR flagged for human review if it requires judgment]

**Next iteration plan**:
- [Specific next steps]

---

## Gate Results This Iteration

| Gate | Result | Action Taken |
|---|---|---|
| Code Review | PASS / FAIL / NOT RUN | [fix applied or pending] |
| Architecture | PASS / FAIL / NOT RUN | [fix applied or pending] |
| QA / Functional | PASS / FAIL / NOT RUN | [fix applied or pending] |
| Security | PASS / FAIL / NOT RUN | [fix applied or pending] |

---

## Milestone Progress

**Acceptance criteria status**:
- [ ] [Criterion 1] — Met / In Progress / Not Started
- [ ] [Criterion 2] — Met / In Progress / Not Started

**Estimated iterations remaining**: [N]

---

## Flagged for Human Review (Morning Queue)

[Items that cannot be resolved autonomously and need human judgment]

1. [Item — describe the decision needed]
```

---

## When to Run a Standup

- Between each development iteration
- After a gate fails and is resolved (to document the fix)
- When a blocker is encountered

## Autonomous Blocker Resolution Guidelines

Agents should resolve blockers autonomously when:
- The blocker is a technical issue with a clear solution (missing import, type error, etc.)
- The decision falls within the architectural guidance from the kickoff handoff
- The resolution follows an existing pattern in the codebase

Flag for human review when:
- The blocker requires changing acceptance criteria
- The blocker involves a product decision (what should this behavior be?)
- The blocker involves a security tradeoff
