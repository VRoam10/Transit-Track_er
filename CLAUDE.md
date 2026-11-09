# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Transit Tracker is a full-stack transit tracking application (bus & metro) with three independent codebases in a monorepo: a Node.js backend, a Next.js web frontend (back-office), and a Flutter mobile app.

## Development Commands

### Backend (`backend/`)
```bash
npm run dev                       # Start dev server with hot reload (ts-node-dev, port 3000)
npm run build                     # Compile TypeScript to dist/
npm start                         # Run compiled production server
npm run worker                    # Start background scheduler (ts-node-dev)
npm run prisma:generate           # Generate Prisma client after schema changes
npm run prisma:migrate <name>     # Create a new migration
npm run prisma:deploy             # Apply pending migrations
npm run prisma:reset              # Reset DB and reapply all migrations (destructive)
npm run prisma:studio             # Open Prisma Studio on port 5556
```

### Frontend (`frontend/`)
```bash
npm run dev       # Start Next.js dev server
npm run build     # Production build
npm run lint      # Run ESLint
```

### Mobile (`transit_track_er_mobile/transit_track_er/`)
```bash
flutter run                    # Run the app
flutter pub get                # Install dependencies
dart run build_runner build    # Generate Hive adapters (*.g.dart files)
```

### Docker (full stack)
```bash
docker compose up --build      # Start backend + postgres + worker
```
PostgreSQL runs on port 5432 (user: `transit`, password: `transit`, db: `transit`).

## Architecture

### Backend (Express 5 + TypeScript + Prisma)

Entry point: `backend/src/index.ts`. Routes are mounted as:
- `/api/users` — auth (register, login, JWT token management)
- `/api/timetables` — saved timetable CRUD
- `/api/bus/*` and `/api/metro/*` — transit data (lines, stops, directions, next passages) fetched from external APIs
- `/api/connector/*` — user-created API connectors with transformation rules
- `/api/health` — health check

Key patterns:
- **Auth middleware** (`src/middleware/auth.ts`): JWT Bearer token auth that attaches `req.user` (Prisma User). The Express Request type is augmented in `types.d.ts`.
- **Route validation**: Uses `express-validator` with a `handleValidationErrors` pattern (validate array + error handler middleware).
- **Connector system**: Users create Connectors pointing to external transit APIs. Each connector has sub-resources (Line, Stop, Direction, NextPassage) with JSON `transformation` fields that map external API responses to a normalized format.
- **Worker** (`src/worker/scheduler.ts`): Background process running on 60s interval, evaluates cron expressions from saved timetables and sends Firebase push notifications via the internal API.
- **Services**: Firebase notification service (`src/services/firebase.services.ts`).

Database schema (PostgreSQL via Prisma): `backend/prisma/schema.prisma`. Core models: User, SavedTimetable (JSON timetable with cron), Connector, Line, Stop, Direction, NextPassage. Connectors have 1:1 relations with Line/Stop/Direction/NextPassage.

### Frontend (Next.js 16 + React 19 + Tailwind CSS 4)

This is the **back-office** web app, not the end-user app. Uses the App Router (`frontend/app/`).

Pages:
- `/` — landing page
- `/login` — authentication
- `/dashboard` — main dashboard
- `/connector` — list connectors; `/connector/new` — create; `/connector/[connector]/*` — manage sub-resources (line, stop, direction, nxpassage)
- `/timetable` — timetable management
- `/contact`, `/rgpd` — static pages

Shared components live in `frontend/components/` (Header, Sidebar, Footer, Connector, Connectors, Timetables, Transformer). Icons use `lucide-react`.

### Mobile (Flutter/Dart)

Located at `transit_track_er_mobile/transit_track_er/`. This is the end-user app.

Structure under `lib/src/`:
- `bus_feature/` and `metro_feature/` — direct external API calls (legacy)
- `bus_feature_backend/` and `metro_feature_backend/` — calls through the backend API
- `service/` — api_service, auth_service, notification_service, timetable_service
- `save_favorite/` — Hive models for offline favorites (`*.g.dart` are generated)
- `form/` and `form_backend/` — save/remove forms for stations and stops
- `pages/` — login, register, home
- `types/` — data models (metro_line, bus_line, station, etc.)
- `settings/` — theme and timezone management
- `environment.dart` — API base URL configuration

## Conventions

- Backend TypeScript compiles to ES2020 with CommonJS modules
- Backend uses `PrismaClient` instantiated per-file (no shared singleton)
- Frontend uses `"use client"` directive for interactive components
- Commit messages follow conventional style: `feat:`, `fix:`, `build:`, `style:`

## Dark Theme

Always support both light and dark themes in **all frontend and mobile UI work**:

- **Frontend (Tailwind CSS)**: Use `dark:` variants alongside every light-mode class. Background: `bg-white dark:bg-gray-800` or `bg-gray-50 dark:bg-black`. Text: `text-gray-900 dark:text-white`, `text-gray-600 dark:text-gray-300`, etc. Borders: `border-gray-200 dark:border-gray-700`. Never add light-only styles without a `dark:` counterpart.
- **Mobile (Flutter)**: Use `Theme.of(context).colorScheme` and `Theme.of(context).textTheme` instead of hardcoded colors. Rely on the existing theme system in `lib/src/settings/` for light/dark switching. Never hardcode `Colors.*` values that don't adapt to the active theme.
