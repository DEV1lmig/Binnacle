# Binnacle

A game backlog and social review platform. Discover games, write reviews, manage your backlog, follow friends, and participate in a moderated community.

## Stack

- **Frontend:** Next.js 16.1.1 (App Router, Turbopack) + React 19 + Tailwind CSS 4
- **Backend:** Convex (serverless database + functions)
- **Auth:** Clerk (JWT, webhooks, RBAC)
- **Game Data:** IGDB API (Twitch)
- **Monorepo:** pnpm workspaces

## Quick Start

```bash
pnpm install

# Terminal 1: Backend
pnpm --filter backend dev

# Terminal 2: Frontend
pnpm --filter web dev
```

Open http://localhost:3000.

## Environment Setup

```bash
cp apps/web/.env.example apps/web/.env.local
```

Required variables: `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `IGBD_CLIENT_ID`, `IGBD_CLIENT_SECRET`.

Backend (Convex dashboard) also needs: `CLERK_JWT_ISSUER_DOMAIN`, `CLERK_WEBHOOK_SECRET`.

## Features

- Game discovery and search (3-tier: index -> cached terms -> IGDB fallback)
- Reviews with ratings, likes, and comments (@mentions supported)
- Personal game backlog with status tracking (want to play, playing, completed, on hold, dropped)
- Favorites collection
- Social feed (community + friends timelines)
- Follow/friend system with request management
- User blocking and privacy controls (per-field visibility)
- Notification system with user preferences
- Admin/moderator panel with RBAC (user management, content moderation, reports)
- DLC/expansion support with filtering
- Profile dashboard with settings

## Commands

```bash
pnpm --filter web typecheck   # Type checking
pnpm --filter web lint        # Linting
pnpm --filter web build       # Production build
pnpm --filter web test        # Run tests (Vitest)
pnpm --filter backend codegen # Regenerate Convex types
```

## Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Development Guide](docs/development/readme.md)
- [Security](docs/security/readme.md)
- [Testing](docs/testing/readme.md)
- [Backlog Feature Spec](apps/backend/convex/BACKLOG_FEATURE.md)

## Deployment

- **Web:** Vercel (auto-deploys from `main`)
- **Backend:** Convex Cloud (auto-deploys via `convex dev`)
- **CI:** GitHub Actions (typecheck -> lint -> build on push/PR to `main`)
