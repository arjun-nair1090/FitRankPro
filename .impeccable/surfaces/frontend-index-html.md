---
version: 1
slug: "frontend-index-html"
primary_target: "frontend/index.html"
related_targets: ["frontend/app.js","frontend/styles.css"]
---

# FitRank app shell

Scope: the whole SPA in frontend/ (auth, dashboard, live logger, routines, history, progress, nutrition, imports, insights, account, admin). Mode: Operate.

Audience and job: the owner logging sets one-handed between lifts on an iPhone, then reviewing progress on desktop. Benchmarks: Hevy (logging flow) and Whoop (data visualisation).

Constraints: vanilla JS, no build step; works against the Java API or in browser-only demo mode, and always says which. Only real data; no invented scores, prices or claims. Motion must respect prefers-reduced-motion.

## Direction contract

THESIS: The category standard played straight at Hevy/Whoop craft: a dark logger of cards with one blue accent. It refuses the decorative "premium glass" dashboard (blobs, gradient text, emoji icons) the old build shipped.

OWN-WORLD: Near-black ground #0B0C0E, card surfaces #15171B / #1C1F24 with 1px #262A31 seams, text #F4F5F7 / #9AA1AC, one accent #3D7BFF; green #2FD27A, amber #F5B53D and red #F2555A only for state (done, PR, warning, destructive). System UI stack (SF Pro on iPhone), tabular numerals, big bold figures. Authored 1.75-stroke line icons. Radii 14/10/8.

STORY: Open the app and see this week's training state at a glance; tap Start; log sets fast with previous values pre-filled; finish and watch the new numbers land in history and charts.

FIRST VIEWPORT: Desktop: 232px sidebar (logo, nav, data-mode chip), main column with greeting row and Start workout button, a three-dial strip (Weekly load vs 4-week average, Sessions this week, kcal today) drawing in, then last-workout card and weekly volume bars. Phone: same content stacked, five-tab bottom bar (Home, Log, History, Progress, More), Start workout as a full-width accent button directly under the greeting, above the dials (revised at build: the one action a lifter opens the app for stays in the first thumb-reach screen without scrolling past data, as Hevy places it).

FORM: Category standard (canon), chosen by the user over the rolled hand; seed key 4dbe6a8d.

SIGNATURE: Whoop-grade data motion: dials and charts draw themselves (stroke-dashoffset, exponential ease-out), figures count up, a pointer scrubber reads exact values; in the logger a completed set sweeps green and a PR set pops a badge. Route changes cross-fade through the View Transitions API. One orchestrated entrance per route, nothing on re-render.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
