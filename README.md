# Simplenight QA Automation — Hotels Booking Search

Playwright + TypeScript automation framework for Simplenight's booking flows,
built for the Lead QA take-home assignment. The included test automates the
Hotels category end-to-end (steps 1–7 of the spec): category selection →
search → map view → price/guest-score filters → map zoom + pin selection →
hotel-card validation.

## Why it's structured this way

The assignment asks for a framework where *any* category's booking flow could
be automated, not just Hotels. So the design splits along two axes:

- **Category-agnostic vs. category-specific.** `HomePage` (navbar) and
  `SearchWidget` (location/dates/guests) are shared by every vertical.
  `SearchResultsPage` and `HotelCard` are Hotels-specific today, but follow
  the same POM pattern — a `FlightCard` or `CarCard` would live next to
  `HotelCard` and reuse `BasePage`.
- **Pages vs. components.** Reusable pieces of UI (the search widget, a
  result card) are modeled as components composed into pages, instead of
  duplicating locators across page objects.

```
src/
  config/     execution parameters (base URL, timeouts) — env-driven, not hardcoded
  data/       test data (location, dates, guests, filters) — separate from test logic
  pages/      Page Object Model
    components/
  utils/      small domain helpers (e.g. guest-score label → numeric threshold)
tests/        specs (thin — orchestration + assertions only)
env/          per-environment .env files
```

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
npm install
npm run install:browsers   # installs Chromium (+ OS deps on Linux CI)
```

Or manually:

```bash
npx playwright install --with-deps chromium   # add firefox/webkit for the other projects
```

## Configure

Environments are handled via `env/.env.<ENV>` (see `src/config/env.config.ts`).
`staging` is the default and already points at
`https://wl.stg.simplenight.com/`. To point at a different environment or
override a value, copy `.env.example` to `.env` or edit `env/.env.<name>`:

```bash
cp .env.example .env
```

## Run

```bash
npm run test:hotels -- --project=chromium          # Hotels spec, headless (recommended)
npm run test:hotels -- --project=chromium --headed # headed, useful for debugging
npm test                                           # all projects (chromium, firefox, webkit)
npm run test:staging                               # explicit ENV=staging
npm run test:headed                                # all specs, headed
npm run test:ui                                    # Playwright interactive UI mode
npm run test:debug                                 # step-through debugger
npm run report                                     # open the last HTML report
npm run codegen                                    # record locators against staging
```

Run against a single browser:

```bash
npx playwright test --project=chromium
```

## Test coverage

The included spec (`tests/hotels-booking-search.spec.ts`) covers assignment steps 1–7:

| Step | Action |
|------|--------|
| 1 | Open staging homepage |
| 2 | Select **Hotels** category |
| 3 | Search Miami · Aug 1–3 · 1 adult + 1 child (age 8) |
| 4 | Switch to **Map** view |
| 5 | Filter price **$100–$1000+** and guest score **Very Good (7+)** |
| 6 | Zoom in on map clusters and select a hotel pin |
| 7 | Assert hotel card price and guest score match the filters |

**Stability:** 5 consecutive green runs against staging locally (Chromium, headless), ~20–26 s each.

## Locators (calibrated against staging)

All locators were validated against the live DOM at `https://wl.stg.simplenight.com/`
(July 2026). The app uses Mantine comboboxes, Google Maps embeds, and dynamic
`data-testid` values — the table below lists the strategies that actually work today.

| UI element | Locator strategy |
|------------|------------------|
| Location trigger | `getByTestId(/search-form_location_trigger/)` |
| Location autocomplete | dialog `textbox` + `option` matching city name |
| Dates | `getByTestId(/search-form_dates_trigger/)` + calendar button `"1 August 2026"` (exact) |
| Guests | `getByTestId(/search-form_guests_trigger/)` + `Add Child` + `Child 1 Age` picker |
| Search submit | `getByTestId(/search-form_search-button/)` |
| Map view toggle | `getByRole('radio', { name: 'Map' })` |
| Price sliders | `getByRole('slider').nth(0)` min · `.nth(1)` max (range 0–1000, keyboard arrows) |
| Guest score filter | `label` click on `"Very Good (7+)"` |
| Map zoom | cluster buttons (`button:not(gmp-advanced-marker)` with numeric text) |
| Map hotel pin | `gmp-advanced-marker` click |
| Hotel card | first result block containing `"Includes Taxes and Fees"` (List view after pin select) |

Guest score thresholds match the live filter panel copy: **Very Good ≥ 7.0**,
**Good ≥ 5.0**, **Excellent ≥ 9.0** (see `src/utils/guest-score.util.ts`).

If the UI changes, re-calibrate with `npm run codegen` and update the page objects.

## Use of AI tools

I used AI assistants (**Claude** and **Cursor**) as part of my workflow, as
encouraged in the assignment. Their role was limited to acceleration — not
substitution for QA judgment:

| Area | How AI helped | What I owned |
|------|---------------|--------------|
| Framework setup | Suggested project layout, POM structure, and README outline from the PDF | Final architecture, naming, and file split (pages vs. components vs. data) |
| Locators | Proposed candidate selectors while exploring the UI | Every locator validated against live staging via codegen, traces, screenshots, and real DOM inspection — speculative selectors were rejected until a green run |
| Boilerplate | TypeScript/Playwright snippets for page objects | Assertions, guest-score thresholds, filter logic, and test flow design |

**Quality controls applied throughout:**

- Type-checking after every change (`npm run typecheck`).
- Running the Hotels spec repeatedly until stable — **5/5 consecutive green runs**
  against staging before treating it as done.
- Web-first waits only — **no fixed sleeps** in `src/` or `tests/`.
- Hand-reviewing every page object, locator, and assertion before commit.

All final code, design decisions, and test coverage are my reviewed work.

## Optional: CI

A GitHub Actions workflow (`.github/workflows/playwright.yml`) is included as
a bonus — it is **not required** by the assignment. It runs the Hotels spec
against staging on push/PR (Chromium, single worker). The primary validation
path is the local commands in **Run** above. If Actions fails, open the
workflow run → **Artifacts** → download `playwright-report` for traces,
screenshots, and video.
