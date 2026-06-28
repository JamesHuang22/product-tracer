# OpenProduct

All-in-one agentic indie-product signal tracker. (Repo/package id: `product-tracer`.)

## Structure

```
product-tracer/
├── apps/
│   ├── web/         # Next.js 15 (App Router) — public web surface
│   └── worker/      # Collectors, cron, signal/notification engines
├── packages/
│   ├── types/       # Shared zod schemas + TS types
│   └── db/          # Supabase client + SQL migrations
├── PRD.md           # Product requirements (see jbk/prd-v0.3 for latest)
└── pnpm-workspace.yaml
```

## Prerequisites

- Node 22 (`nvm use` reads `.nvmrc`)
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- A Supabase project (free tier)

## Setup

```bash
pnpm install
cp .env.example .env
# fill in Supabase + GitHub + Anthropic keys
```

## Commands

```bash
pnpm web:dev        # Next.js dev server on :3000
pnpm worker:dev     # Worker entrypoint (watch mode)
pnpm typecheck      # Type-check every workspace
pnpm format         # Format the repo with Prettier
```

## Status

Scaffold only — collectors, migrations, and pages land in subsequent PRs.
See PRD §10 (milestones) for the P0 plan.
