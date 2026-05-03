# HevyLog

Personal fitness dashboard that visualises your [Hevy](https://hevy.com) workout history. Built with React, TypeScript, and Recharts.

## Features

- **Dashboard** — weekly/monthly/yearly stats, progressive overload suggestions, PRs with estimated 1RM, muscle health (push/pull/lower balance, neglect alerts, frequency with targets), consistency streak, milestones
- **Workouts** — calendar view with per-day workout cards
- **Exercises** — searchable list with per-exercise weight progression charts and plateau detection
- **Body Heatmap** — visual muscle group breakdown over configurable time windows
- **Bodyweight** — weight tracking chart

## Setup

```bash
npm install
```

Create `.env` from the example:

```bash
cp .env.example .env
```

Add your Hevy API key to `.env`:

```
VITE_HEVY_API_KEY=your-api-key-here
```

Get your API key from [app.hevyapp.com/settings/api](https://app.hevyapp.com/settings/api).

```bash
npm run dev
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Import this repo on Vercel
2. Add `VITE_HEVY_API_KEY` as an environment variable
3. Framework preset: **Vite** — no other config needed

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | ESLint |
