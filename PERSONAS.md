# 1 Day Sprint — Personas & Ceremonies

This document describes the AI agent team ("personas") and sprint ceremony commands used in Team 930's scouting development workflow, adapted from John Cruikshank's [1 Day Sprint methodology](https://www.linkedin.com/pulse/1-day-sprint-john-cruikshank).

---

## The Core Idea

Traditional agile ceremonies (standup, planning, retro, review) exist to create shared context, surface blockers, and keep a team aligned. Those needs don't go away when AI agents do the implementation — but the pace changes.

**Human team (~4 hours in the morning)**:
- Sprint Review: open yesterday's demo package, verify against acceptance criteria
- Human Retro: improve prompts, memory, skills based on what agents got wrong
- Sprint Planning: define acceptance criteria, architectural guidance
- Kickoff Handoff: package all context for agents, then step away

**Agent personas (noon → end of day)**:
- Autonomous development loop with mandatory review gates after each iteration
- Standups between iterations to surface and resolve blockers
- Demo prep at end of day
- Agent retro to update memory and harness

The quality of the kickoff handoff determines the quality of everything agents build.

---

## Agent Personas

Personas live in `.claude/agents/`. They are Claude subagents invoked by the orchestrating agent or Claude Code directly.

### `developer` — Lead Developer

**Role**: Implements features, fixes bugs, writes the code.

**Knows**:
- Next.js 15 App Router patterns
- TypeScript strict mode (zero `any`)
- Repository → Service → API → Component layered architecture
- JSONB hybrid pattern for season-specific game data
- Which existing files to copy patterns from (per CLAUDE.md)

**Use when**: You need something built.

---

### `code-reviewer` — Code Review Gate

**Role**: Checks code correctness, conventions, and minimalism.

**Checks**:
- Zero `any` types, no type assertion hacks
- Follows CLAUDE.md reference patterns
- Naming conventions (snake_case DB, camelCase TS)
- Layer boundaries respected
- No over-engineering or bonus features

**Output**: Structured PASS/FAIL with file:line citations.

---

### `architect` — Architecture Gate

**Role**: Verifies architectural decisions fit the system design.

**Checks**:
- JSONB hybrid: season-specific data in JSONB, not new relational columns
- Layered architecture: each layer has exactly one responsibility
- New seasons follow `src/types/season-YYYY.ts` + config pattern
- Offline-first implications considered for data writes

**Output**: Structured PASS/FAIL with architectural guidance.

---

### `qa-engineer` — Functional / QA Gate

**Role**: Verifies acceptance criteria are met and tests pass.

**Checks**:
- `npm run type-check` passes
- `npm run lint` passes
- Unit tests pass (`npm run test -- --run`)
- Each acceptance criterion from the kickoff handoff is explicitly verified

**Output**: Structured PASS/FAIL with criterion-by-criterion breakdown.

---

### `security-reviewer` — Security Gate

**Role**: Scans for security vulnerabilities relevant to this stack.

**Checks**:
- No secrets/keys in source code
- API routes use `src/lib/api/auth-middleware.ts`
- CSRF protection on state-changing routes
- User input sanitized via `src/lib/utils/input-sanitization.ts`
- No SQL injection (parameterized queries only)

**Output**: Structured PASS/FAIL with severity levels (BLOCKER / HIGH / MEDIUM / INFO).

---

## Sprint Ceremony Commands

Commands live in `.claude/commands/`. Invoke them as slash commands in Claude Code.

| Command | When to Use |
|---|---|
| `/sprint-kickoff` | Morning — generate the kickoff handoff package |
| `/standup` | Between iterations — report progress and blockers |
| `/review-pr` | After implementation — run all 4 gates on a PR |
| `/demo-prep` | End of day — package the sprint results |
| `/sprint-retro` | End of day — agent retrospective, update harness |

---

## The 4 Mandatory Review Gates

Every iteration of the autonomous sprint runs these gates in order. Nothing merges without all 4 passing.

```
Code Review → Architecture → QA / Functional → Security
```

Gate failures are fed back to the `developer` persona for fixes, then the failed gate re-runs. This loop continues until all gates pass or a blocker is flagged for human review.

---

## How to Adopt Gradually

This system is additive. Each piece works independently:

**Start here (low friction)**:
- Use `/review-pr` on your next PR for an automated 4-gate review
- Ask the `developer` persona to implement a small feature

**Add next**:
- Use `/sprint-kickoff` at the start of a working session to structure your intent
- Use `/standup` mid-session to check progress

**Full loop (when ready)**:
- Run the full morning block → handoff → autonomous sprint → demo review cycle

You don't need to adopt everything at once. The personas and commands work with normal Claude Code sessions too — they just give more structure and codebase-specific context.

---

## Devcontainer

A `.devcontainer/devcontainer.json` is included for isolated, reproducible development. See [.devcontainer/README.md](.devcontainer/README.md) for setup.

This matters for the 1 Day Sprint because fast iteration without a clean environment creates hard-to-debug failures. Each sprint starting from a clean container means gate results are trustworthy.

---

## Further Reading

- John Cruikshank's original post: [The 1 Day Sprint](https://www.linkedin.com/pulse/1-day-sprint-john-cruikshank) (Feb 2026)
- This codebase's architecture: [CLAUDE.md](CLAUDE.md)
