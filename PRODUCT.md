# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primarily the owner, using FitRank as a personal training tracker: logging sets between lifts on an iPhone (home-screen PWA over the same Wi-Fi as the API, or the GitHub Pages demo) and reviewing progress, nutrition and imports on a desktop. A FitRank admin account manages other users and their plans.

## Product Purpose
Log strength and cardio sessions fast, keep the history honest, and turn it into progress you can read: volume, PRs, estimated 1RM, streaks, body weight and nutrition. Success is a workout logged without friction and a progress view that reflects only real, saved data.

## Positioning
One place that merges your own logged sessions with imported Hevy history and Apple Health exports, ranked against your own past self (PRs, 1RM, streaks) rather than spread across separate apps.

## Operating Context
- Mid-workout logging on a phone: one hand, short glances between sets, rest timer running.
- Post-session and weekly review on desktop: charts, PR list, date-range filters.
- Imports: Hevy CSV/JSON exports and Apple Health `export.xml` files, previewed before merge.
- Admin: upgrade/downgrade/delete users, view system analytics.

## Capabilities and Constraints
- Frontend: vanilla JS SPA, no build step, served as static files (`frontend/`).
- Backend: Java (JDK 8+ HttpServer) REST API with PostgreSQL via JDBC; falls back to an in-memory store when no database is reachable.
- Data mode: uses the API when reachable; otherwise a clearly labelled demo mode stores data in the browser (this is how the GitHub Pages deploy runs).
- Plans: FREE vs PREMIUM are assigned by an admin; there is no payment integration. Premium gates advanced analytics and export.
- Feature areas to keep: dashboard, live workout logger, routines, history/progress charts, nutrition & body weight, Hevy + Apple Health imports, admin + premium plans, profile and settings (units, rest timer).

## Brand Commitments
Name: FitRank. Existing icon at `frontend/assets/icon.svg`.
Standing preference: the category standard, executed at full craft. A dark logger with cards and one accent; quality bar set by Hevy (logging flow) and Whoop (data visualisation, cinematic charts and dials).

## Evidence on Hand
- `frontend/seed.json`: the owner's own Hevy/Apple Health history, to be trimmed and anonymized for the public demo.
- No testimonials, customers, benchmarks or real pricing exist; do not invent them.

## Product Principles
- Logging speed beats decoration: the next set is always one tap away.
- Only real data: charts and stats come from saved sessions, never placeholders.
- Honest modes: always show whether data is on the server or only in this browser.
- Your past self is the leaderboard.
