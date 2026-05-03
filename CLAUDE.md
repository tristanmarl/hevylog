# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite HMR)
npm run build     # tsc + vite build
npm run lint      # eslint
npm run preview   # preview dist build
```

No test suite exists yet.

## Environment

Requires `.env` with:
```
VITE_HEVY_API_KEY=your-api-key-here
```

## Architecture

Single-page React app (Vite + TypeScript + Tailwind) that visualises data from the Hevy fitness API.

**Data flow:** `src/api/hevy.ts` → pages/components. The API module fetches all paginated data upfront (`fetchAllWorkouts`, `fetchExerciseTemplates`, `fetchBodyweightEntries`) with an in-memory 5-minute TTL cache keyed by URL path. All pages receive raw `Workout[]` and compute derived stats locally — no global state manager.

**Computation layer:** `src/utils/stats.ts` is the heavy lifter — all analytics (weekly stats, PRs, muscle balance, plateaus, streaks, milestones, suggestions) live here as pure functions. `src/utils/muscles.ts` handles muscle-group inference via keyword matching on exercise titles, falling back to `ExerciseTemplate.primary_muscle_group` when available.

**Types:** `src/types/hevy.ts` is the single source of truth for API shapes. `WorkoutExercise.muscle_groups` is populated at the API layer and may be absent, which is why `getMuscleGroupsForExercise()` has a keyword-match fallback.

**Routing:** React Router v7, all routes under a single `Layout` shell with a collapsible sidebar and `⌘K` global search. Period selection (`week / 30d / 90d / 365d`) is persisted to `localStorage`.

**Styling:** Tailwind utility classes + occasional inline `style` props for the brand orange `#e86a2e` and dark palette (`#0f0f0f` bg, `#1a1a1a` cards, `#2a2a2a` borders). No CSS modules or styled-components.
