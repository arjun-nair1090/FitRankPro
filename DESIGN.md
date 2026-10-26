---
name: FitRank
description: A dark, card-based training log with one blue accent and data that draws itself.
colors:
  ground: "#0B0C0E"
  surface: "#15171B"
  surface-raised: "#1C1F24"
  surface-control: "#252930"
  seam: "#262A31"
  ink: "#F4F5F7"
  ink-muted: "#9AA1AC"
  signal-blue: "#3D7BFF"
  signal-blue-fill: "#2F6BF0"
  done-green: "#2FD27A"
  record-amber: "#F5B53D"
  stop-red: "#F2555A"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(32px, 6vw, 56px)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(21px, 6.2vw, 34px)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tnum"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Segoe UI Variable Text, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  sm: "8px"
  md: "10px"
  lg: "14px"
  sheet: "20px"
  pill: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue-fill}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface-control}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "40px"
  button-danger-armed:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.ground}"
    rounded: "{rounded.md}"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "18px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
    height: "42px"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
  set-row:
    rounded: "{rounded.sm}"
    height: "44px"
---

# Design System: FitRank

## Overview

**Creative North Star: "The Lit Scoreboard"**

FitRank is a training log you read in a dim gym between sets, one-handed, then study at a desk later. The ground is near-black, every unit of content sits on a slightly lifted card with a hairline seam, and a single blue carries every action and every line of data. Nothing glows, nothing is glass; the drama comes from numbers: big, bold, tabular figures that count up, and dials and charts that draw themselves when you arrive.

The system is the category standard (Hevy, Strong) played straight and finished to Whoop's data-viz craft. Density is moderate: a phone shows one decision per card, a desktop shows two cards side by side under a fixed sidebar. Color beyond the accent is reserved for state: green means done, amber means a record, red means destructive.

**Key Characteristics:**
- Near-black ground, flat cards separated by 1px seams rather than shadows.
- One accent (signal blue) for actions, active navigation and every chart line.
- State colors only for state: done green, record amber, stop red.
- Platform UI type with tabular numerals; figures are the loudest thing on screen.
- Motion that draws data in once per route, never on re-render.

## Colors

A dark neutral ramp with one cool accent and three state colors that never decorate.

### Primary
- **Signal Blue** (signal-blue): chart strokes and bars, dial rings, links, active nav icons, focus rings, the exercise name in the logger. Text use is fine on ground and surface (4.7:1 or better).
- **Signal Blue Fill** (signal-blue-fill): the background of primary buttons only, deepened from Signal Blue so white button text clears 4.5:1.

### Tertiary (state only)
- **Done Green** (done-green): completed set rows (13% tint), the pressed done tick, "on pace" deltas, the server-mode chip, success toasts, the sessions dial.
- **Record Amber** (record-amber): PR badge, trophy icons, the nutrition dial, warning notes and the "not saved" chip.
- **Stop Red** (stop-red): destructive actions and error toasts. Quiet as text until armed; filled only in the tap-again confirm state.

### Neutral
- **Gym Floor** (ground): page background and the mobile bars.
- **Card Slate** (surface): cards, sheets, the auth card.
- **Raised Slate** (surface-raised): inputs, list rows inside cards, chips, segmented control track.
- **Control Slate** (surface-control): secondary buttons, the selected segment, the idle done tick.
- **Seam** (seam): every 1px border and chart gridline.
- **Chalk** (ink): primary text and numbers.
- **Muted Chalk** (ink-muted): secondary text, axis labels, idle nav. Holds 6.9:1 on cards.

### Named Rules
**The One Signal Rule.** Signal blue is the only hue that means "act" or "data". A second accent is never introduced; new series are drawn as lighter or dimmer blue (past weeks are 38% alpha, the current week is solid).

**The State-Only Rule.** Green, amber and red appear only when something is done, a record, a warning or destructive. They never decorate a card, heading or icon at rest.

## Typography

**Display Font:** platform UI stack (SF Pro on Apple devices, Segoe UI Variable on Windows, Roboto on Android)
**Body Font:** same stack

**Character:** Native-feeling and neutral, so the app reads like a first-party fitness tool. Personality comes from weight and size steps on numbers, not from a typeface.

### Hierarchy
- **Display** (800, clamp(32px, 6vw, 56px), 1.04, -0.035em): the sign-in headline only.
- **Headline** (750, 28px, 1.2, -0.02em): page titles and the greeting. Drops to 24px under 600px.
- **Figure** (750, clamp(21px, 6.2vw, 34px), 1, -0.03em, tabular): dial values and big stats; units ride along at 0.42em in muted chalk.
- **Title** (650, 16-17px): card headings, exercise names, workout titles.
- **Body** (400, 15px, 1.45, tabular numerals): everything else; secondary lines at 13-14px.
- **Label** (600, 12px): field labels, axis ticks, column heads. Column heads in the logger are uppercase with 0.04em tracking.

### Named Rules
**The Tabular Rule.** Every number on screen uses tabular numerals (set on the body), so counts, weights and timers never jitter as they change.

## Layout

Phone first. Below 900px: a sticky top bar (brand plus data-mode chip), one column with 16px gutters, and a fixed five-tab bar (Home, Log, History, Progress, More) that respects the home-indicator safe area. More opens a bottom sheet with the remaining sections. At 900px and up: a 232px sticky sidebar holds brand, navigation, the data-mode chip and the signed-in user; the main column is capped at 1120px (860px in the logger) with 36px/40px padding. Paired cards sit two-up from 1000px.

Spacing runs on a 4px base: 4/8/12/16/20 between and inside components, 16px between cards on phone and 20px on desktop, 18px card padding. Bottom padding grows when the rest-timer dock is open so it never covers the last set.

## Elevation & Depth

Flat by default. Depth is tonal: ground, then card slate, then raised slate for controls inside a card, each step outlined by the 1px seam. Shadows appear only on things that float above the page.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 10px 30px rgba(0,0,0,.5)`): rest-timer dock and toasts.
- **Sheet** (`box-shadow: 0 -12px 40px rgba(0,0,0,.5)`): bottom sheets on phone.
- **Auth card** (`box-shadow: 0 24px 60px rgba(0,0,0,.5)`): the sign-in card over the animated background.
- **Segment lift** (`box-shadow: 0 1px 2px rgba(0,0,0,.4)`): the selected segment in a segmented control.

### Named Rules
**The Seam Not Shadow Rule.** Cards are separated by a 1px seam and a tonal step, never by a shadow. If it doesn't float over the page, it doesn't cast one.

## Shapes

Gently rounded, never pill-shaped except chips and badges. Cards 14px, controls and buttons 10px, set rows, ticks and small icon buttons 8px, sheets 20px on their top corners (18px all round on desktop). Chart bars have 4px tops. Icons are authored 24px line drawings at 1.75 stroke with round caps and joins; the done tick thickens to 2.4.

## Components

### Buttons
- **Shape:** 10px radius, 40px tall (48px for the main Start and auth actions, 12px radius).
- **Primary:** signal-blue-fill with white text, used once per view for the main action (Start workout, Finish, Save, Import).
- **Secondary:** control slate with chalk text.
- **Ghost:** transparent with muted text that brightens on a raised-slate hover; row actions such as Repeat and Rename.
- **Destructive:** stop-red text on transparent. The first tap arms it: it turns into a filled red "Tap again to confirm" with a small scale-in, and disarms after 3.5s.
- **Press:** every button scales to 0.97 on press.

### Chips
- **Data-mode chip:** pill, 26px, icon plus label. Green tint for "Server", amber for "Server · not saved", neutral for "Demo · this browser". Always visible (sidebar foot or top bar).
- **Exercise chips:** raised-slate pills listing a routine's exercises.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card slate with a 1px seam.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 18px; card heads are a title on the left and muted meta or one control on the right.

### Inputs / Fields
- **Style:** raised slate, 1px seam, 10px radius, 42px tall; label above in 13px muted.
- **Focus:** the border turns signal blue and the fill steps up slightly. Keyboard focus anywhere shows a 2px signal-blue outline with 2px offset.
- **Logger inputs:** centered 16px semibold numbers on a borderless raised slate; placeholders show the previous session's values, or "–" when there is none (never a fake 0).

### Navigation
- **Desktop sidebar:** 40px rows, icon plus label, muted at rest, card-slate hover, raised-slate fill and blue icon when current.
- **Phone tab bar:** five equal columns, icon over an 11px label, current tab gets chalk text and a blue icon.

### Dial (signature)
Ring gauge on a control-slate track, 9-unit stroke with a round cap, drawn clockwise from 12 o'clock. The figure and its label sit inside; one muted sentence below says what the number means against a real baseline. Tone follows the metric: blue for load, green for sessions, amber for fuel. On route entry the ring draws from empty in 1.5s and the figure counts up.

### Logger header
Title (editable) and Finish on one row, then Duration, Volume and Sets as labelled 22px figures. Sticky from 900px up; scrolls away on phones to give the set rows the screen.

### Set row (signature)
Grid of set number, previous, weight, reps and a done tick. Completing a set sweeps a green tint across the row from the left and draws the tick; a set that beats the lift's best estimated 1RM pops an amber PR badge with a small radial burst and a short vibration.

### Charts
Weekly bars (past weeks in 38% blue, current week solid with its value always shown, hover/focus tooltip in chalk, an optional dashed chalk reference line such as the 4-week average), a smoothed line with a fading blue area fill and an end dot (revealed left to right by a clip-path), horizontal bars for muscle split, and a vertical pointer scrubber with a chalk tooltip on line charts.

## Do's and Don'ts

### Do:
- **Do** keep one primary button per view, filled with signal-blue-fill (#2F6BF0) so white text passes 4.5:1.
- **Do** show which data mode the app is in at all times through the mode chip.
- **Do** run the entrance once per route change, with the shared exponential ease-out `cubic-bezier(.16, 1, .3, 1)`: dials draw, bars grow, lines reveal, figures count up. Cards only settle 6px from a fully visible state (40ms stagger); the data carries the moment.
- **Do** list rows inside a card as a divided list (seam between rows), never as filled boxes.
- **Do** collapse every animation to an instant state change under `prefers-reduced-motion`.
- **Do** derive every number from logged data, and show an honest empty state ("Log this at least twice to see a trend") instead of a placeholder figure.

### Don't:
- **Don't** use gradient text, decorative glass or blur, glows, or blob backgrounds (the look the previous build shipped).
- **Don't** use emoji or unicode glyphs as icons; draw them in the 1.75-stroke line set.
- **Don't** add eyebrow labels above headings or colored side borders on cards.
- **Don't** use green, amber or red decoratively.
- **Don't** replay entrance animations on re-render, such as ticking a set or typing.
- **Don't** invent scores, prices or device integrations that the app can't back with real data.
