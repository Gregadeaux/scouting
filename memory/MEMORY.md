# Agent Memory

This file persists facts learned across sprints. Updated by `/sprint-retro` at the end of each autonomous sprint.

## How This Works

- The `/sprint-retro` command writes confirmed findings here after each sprint
- Facts here are loaded into agent context automatically in future sprints
- Only write verified, stable facts — not session-specific context or speculation
- Organize by topic, not chronologically

---

## Project

- **Repo**: FRC Scouting System — Team 930
- **Stack**: Next.js 15, TypeScript 5 (strict), Supabase, Tailwind CSS 3.4
- **Current season**: 2025 Reefscape (2026 game releases Jan 10, 2026)
- **Linear project**: 930-Scouting (issue prefix SCOUT-XXX)

## Architecture

- JSONB hybrid: evergreen relational tables + season-specific JSONB columns
- Layer order: Repository → Service → API Route → Component
- Season types: `src/types/season-YYYY.ts` | Season config: `src/lib/config/season-YYYY.ts`
- No `any` types — ESLint fails the build

## Patterns

- Copy API routes from: `src/app/api/admin/events/route.ts`
- Copy services from: `src/lib/services/team.service.ts`
- Copy repositories from: `src/lib/repositories/team.repository.ts`

## Sprint History

_No sprints recorded yet. First entry will be written after the first `/sprint-retro` run._
