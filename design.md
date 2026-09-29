# RedLink — Design System (Web Dashboard)

> Source of truth: `RedLink UI Kit.html` (Sign in board, Screen-states board).
> Scope: **web dashboard only.** There is no mobile app in this phase. Donor-facing patterns from the kit's mobile board are adapted to web views here. Don't build native or mobile-app screens.

RedLink matches blood requests from hospitals with compatible, eligible donors nearby and notifies those donors. Hospital staff, donors and admins all use one web app and **one sign-in**. Role decides what they see.

---

## 1. Principles

1. **Urgency without panic.** Red is for the brand, primary actions and genuinely critical things. Everything else stays calm and neutral.
2. **Say what happened and what to do next.** Never write just "Something went wrong."
3. **Every data view designs all six states:** loading, empty (first use), empty (no results), error, success, blocked.
4. **Privacy is visible.** Patient details never leave the hospital. Donor-facing screens show the hospital, ward and location, never patient identity.
5. **One primary action per view.** Secondary actions use outline or dark buttons, never a second red button.

---

## 2. Design tokens

### 2.1 Colour

Use the names in the first column. Never hard-code hex values in components.

| Token | Hex | Use |
|---|---|---|
| **Brand / primary** | | |
| `--color-primary` | `#B3172F` | Primary buttons, links, brand mark, focus border, critical tag |
| `--color-primary-hover` | `#93112A` | Hover/pressed primary, link hover, text on primary-soft chips |
| `--color-primary-soft` | `#FDE3E5` | Filter chips, brand icon tiles |
| `--color-primary-subtle` | `#FEF2F3` | Error icon tile, error badge background |
| `--color-primary-ring` | `rgba(208, 42, 63, 0.18)` | 3px focus ring (base `#D02A3F`) |
| `--color-primary-on-dark` | `#F29BA4` | Brand-tinted icons on dark surfaces |
| **Neutrals (warm)** | | |
| `--color-ink` | `#1A1514` | Primary text, dark buttons, dark hero panel |
| `--color-ink-2` | `#3E3734` | Text on neutral badges |
| `--color-text-muted` | `#574F4B` | Body/secondary copy, icon buttons |
| `--color-text-subtle` | `#736A66` | Captions, helper text, meta, dividers-with-text |
| `--color-placeholder` | `#9A918C` | Input placeholder |
| `--color-bg` | `#F6F4F3` | App/page background |
| `--color-surface` | `#FFFFFF` | Cards, panels, inputs |
| `--color-surface-sunken` | `#FBFAF9` | Table header row |
| `--color-neutral-soft` | `#EDEAE8` | Row dividers, neutral badge bg, skeleton base, empty progress segment |
| `--color-border` | `#E4DFDC` | Card/panel borders, divider lines |
| `--color-border-strong` | `#C3BCB8` | Input borders, outline buttons, dashed callouts |
| `--color-dark-2` | `#2A2422` | Decorative shapes on dark panels |
| `--color-on-dark-muted` | `#C9C1BD` | Secondary text on `ink` panels |
| **Success** | | |
| `--color-success` | `#1F7A4D` | Success text/icon, "on" switch, completed step |
| `--color-success-soft` | `#E7F4EC` | Success badge/icon bg |
| `--color-success-halo` | `#F3FAF6` | 10px halo ring around the success icon |
| `--color-on-success-muted` | `#D4EEDF` | Secondary text on success banner |
| **Warning / pending** | | |
| `--color-warning` | `#8A5300` | Warning text/icon ("Under review") |
| `--color-warning-mid` | `#D08A1E` | Current in-progress step segment |
| `--color-warning-soft` | `#FFF3DC` | Warning badge/icon bg |
| **Info** | | |
| `--color-info` | `#1F5FAD` | Info/loading badge text |
| `--color-info-soft` | `#E8F0FB` | Info badge bg |

**Rules**
- Red means *brand, primary action or critical*. Don't use it for decoration or for plain "error" styling on non-urgent things when neutral copy will do.
- Status always pairs colour with text or an icon. Never rely on colour alone.
- Neutrals are warm (red-brown undertone). Don't mix in cool greys like `#6B7280`.
- **Dark mode is not defined in the kit.** Ship light only for now.

### 2.2 Typography

| Family | Weights | Role |
|---|---|---|
| **Bricolage Grotesque** | 500, 600, 700 | Display: wordmark, page titles, hero, empty-state titles, card headlines |
| **IBM Plex Sans** | 400, 500, 600 | UI and body (default `font-family` on `body`) |
| **IBM Plex Mono** | 400, 500 | IDs, error refs, blood-group badges, codes |

```css
--font-display: 'Bricolage Grotesque', sans-serif;
--font-sans: 'IBM Plex Sans', system-ui, sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, monospace;
```

**Type scale**

| Token | Size / line-height | Family · weight | Notes / example |
|---|---|---|---|
| `display-xl` | 52 / 56 | Display 700, `-0.02em` | Auth hero: "Stop calling donors one by one." |
| `display-lg` | 40 / 1.2 | Display 700, `-0.01em` | Page title |
| `display-md` | 30 / 1.2 | Display 700 | Auth form title "Sign in" |
| `display-sm` | 24 / 28 | Display 700 | Section/banner headline |
| `wordmark` | 22 | Display 700 | "RedLink" |
| `title-lg` | 20 / 1.3 | Display 600 | Empty first-use title, request card headline |
| `title-md` | 18 / 1.3 | Sans 600 | State titles (error, no results, success, blocked) |
| `body-lg` | 16 / 25 | Sans 400 | Hero supporting copy, card titles (600) |
| `body-input` | 15 | Sans 400 / 600 | Input values, large button labels (600) |
| `body` | 14 / 21 | Sans 400 | Default body, state descriptions |
| `label` | 13 | Sans 500 / 600 | Form labels (500), small buttons and links (600), meta |
| `caption` | 12 | Sans 400 / 600 | Helper text, badges (600) |
| `eyebrow` | 12 | Sans 600, uppercase, `0.08em` | Section eyebrow ("STATES", "NEEDS YOU NOW · 1") |
| `mono-sm` | 11 | Mono 400 | "Error 504 · ref 7f3a-19c2" |

Keep state descriptions to about 280–290px wide (`max-width`) and hero copy to 440px.

### 2.3 Spacing

4-based scale, with 6/10/14 half-steps that the kit uses for tight UI:

`2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 18 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64`

| Context | Value |
|---|---|
| Page padding (desktop 1440) | 64 |
| Auth hero panel padding | 56 |
| Card grid gap | 24 |
| Section title → content | 28 |
| Form field gap | 20 |
| Label → input | 6 |
| State card inner padding / gap | 40 / 14–16 |
| Table cell horizontal padding | 20 |
| Button group gap | 8 |

### 2.4 Radius

| Token | Value | Use |
|---|---|---|
| `--radius-xs` | 4px | Skeleton bars |
| `--radius-sm` | 6px | Urgency tag ("Critical") |
| `--radius-md` | 8px | Buttons (38–40px), icon buttons |
| `--radius-lg` | 10px | Inputs, large (48px) buttons, small icon tiles (36px) |
| `--radius-xl` | 12px | Option/choice cards, large action buttons |
| `--radius-2xl` | 14px | Panels, data cards, tables |
| `--radius-3xl` | 18px | Feature cards, 64px icon tiles |
| `--radius-4xl` | 20px | 72px icon tiles |
| `--radius-full` | 999px | Badges, chips, avatars, switches, progress segments |

### 2.5 Elevation

The kit is **flat by default**: panels use a 1px `--color-border` and no shadow.

| Token | Value | Use |
|---|---|---|
| `--ring-focus` | `0 0 0 3px var(--color-primary-ring)` + `border-color: var(--color-primary)` | Focused inputs/controls |
| `--shadow-urgent` | `0 6px 16px -4px rgba(179, 23, 47, 0.2)` | Critical request card only (with a 2px primary border) |
| `--halo-success` | `0 0 0 10px var(--color-success-halo)` | Success icon |
| `--shadow-knob` | `0 1px 2px rgba(0,0,0,0.2)` | Switch knob |

### 2.6 Sizing

| Element | Height |
|---|---|
| Button, small | 38 |
| Button, medium (default) | 40 |
| Button, large / auth | 48 |
| Input | 48 |
| Icon button | 36 (18px icon) |
| Filter chip | 28 |
| Badge | ~22–24 (padding `3px 10px`) |
| Table header row | 36 |
| Table body row | 56 |
| Checkbox | 18 |
| Switch | 52 × 32 (knob 26) |

### 2.7 Iconography

- 24×24 grid, **outline** style, `stroke-width: 1.75`, round caps and joins, `fill: none`, `stroke: currentColor`.
- Use stroke 1.5 for large illustrative icons (30–36px in state tiles) and stroke 2 for the check and refresh glyphs.
- Sizes are 16 (inline/meta), 18 (buttons, inputs), 22 (nav, logo), 30/36 (state tiles).
- Decorative icons get `aria-hidden="true"`.
- **Lucide** matches this style closely. Set `strokeWidth={1.75}` globally.
- The brand mark is a blood drop with a heartbeat line. Use the files in `frontend/public/brand/` rather than redrawing it:

  | File | Use |
  |---|---|
  | `redlink-logo.svg` | Full logo (mark + wordmark) on light backgrounds |
  | `redlink-logo-reversed.svg` | Full logo on `ink` or other dark backgrounds |
  | `redlink-icon.svg` | Mark alone, red on light backgrounds |
  | `redlink-icon-white.svg` | Mark alone, white on `primary` or dark backgrounds |
  | `redlink-app-icon.svg` | Rounded-square app icon (touch icon, PWA, social) |
  | `../favicon.svg` | Browser tab icon; heavier heartbeat stroke so it reads at 16–32px |

### 2.8 Motion

- Skeleton shimmer: a linear gradient `#EDEAE8 → #F6F4F3 → #EDEAE8`, `background-size: 200%`, `1.4s ease-in-out infinite`.
- **Respect `prefers-reduced-motion`.** Stop the shimmer and show a static `--color-neutral-soft`.
- Transitions stay short (120–200ms) and apply to colour, border and shadow only.

---

## 3. CSS starter

```css
:root {
  /* brand */
  --color-primary: #B3172F;
  --color-primary-hover: #93112A;
  --color-primary-soft: #FDE3E5;
  --color-primary-subtle: #FEF2F3;
  --color-primary-ring: rgba(208, 42, 63, 0.18);
  --color-primary-on-dark: #F29BA4;
  /* neutrals */
  --color-ink: #1A1514;
  --color-ink-2: #3E3734;
  --color-text-muted: #574F4B;
  --color-text-subtle: #736A66;
  --color-placeholder: #9A918C;
  --color-bg: #F6F4F3;
  --color-surface: #FFFFFF;
  --color-surface-sunken: #FBFAF9;
  --color-neutral-soft: #EDEAE8;
  --color-border: #E4DFDC;
  --color-border-strong: #C3BCB8;
  --color-dark-2: #2A2422;
  --color-on-dark-muted: #C9C1BD;
  /* status */
  --color-success: #1F7A4D;
  --color-success-soft: #E7F4EC;
  --color-success-halo: #F3FAF6;
  --color-on-success-muted: #D4EEDF;
  --color-warning: #8A5300;
  --color-warning-mid: #D08A1E;
  --color-warning-soft: #FFF3DC;
  --color-info: #1F5FAD;
  --color-info-soft: #E8F0FB;
  /* type */
  --font-display: 'Bricolage Grotesque', sans-serif;
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
  /* radius */
  --radius-xs: 4px; --radius-sm: 6px; --radius-md: 8px; --radius-lg: 10px;
  --radius-xl: 12px; --radius-2xl: 14px; --radius-3xl: 18px; --radius-4xl: 20px;
  --radius-full: 999px;
  /* elevation */
  --ring-focus: 0 0 0 3px var(--color-primary-ring);
  --shadow-urgent: 0 6px 16px -4px rgba(179, 23, 47, 0.2);
}

body { margin: 0; background: var(--color-bg); color: var(--color-ink); font-family: var(--font-sans); }
a { color: var(--color-primary); }
a:hover { color: var(--color-primary-hover); }
input::placeholder { color: var(--color-placeholder); }

.shimmer {
  background: linear-gradient(90deg, #EDEAE8 0%, #F6F4F3 50%, #EDEAE8 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
@keyframes shimmer { 0% { background-position: 100% 0 } 100% { background-position: -100% 0 } }
@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; background: var(--color-neutral-soft); }
}
```

Fonts (Google Fonts):

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
```

<details>
<summary>Tailwind theme extension (if the project uses Tailwind)</summary>

```js
// tailwind.config.js → theme.extend
colors: {
  primary: { DEFAULT: '#B3172F', hover: '#93112A', soft: '#FDE3E5', subtle: '#FEF2F3', 'on-dark': '#F29BA4' },
  ink: { DEFAULT: '#1A1514', 2: '#3E3734' },
  muted: '#574F4B', subtle: '#736A66', placeholder: '#9A918C',
  canvas: '#F6F4F3', surface: '#FFFFFF', sunken: '#FBFAF9',
  'neutral-soft': '#EDEAE8', line: '#E4DFDC', 'line-strong': '#C3BCB8',
  success: { DEFAULT: '#1F7A4D', soft: '#E7F4EC', halo: '#F3FAF6' },
  warning: { DEFAULT: '#8A5300', mid: '#D08A1E', soft: '#FFF3DC' },
  info: { DEFAULT: '#1F5FAD', soft: '#E8F0FB' },
},
fontFamily: {
  display: ['"Bricolage Grotesque"', 'sans-serif'],
  sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
  mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
},
borderRadius: { xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px', '2xl': '14px', '3xl': '18px', '4xl': '20px' },
boxShadow: { focus: '0 0 0 3px rgba(208,42,63,0.18)', urgent: '0 6px 16px -4px rgba(179,23,47,0.2)' },
```
</details>

---

## 4. Components

### 4.1 Buttons

| Variant | Style | When |
|---|---|---|
| **Primary** | bg `primary`, white text, no border | The one main action per view ("Sign in", "Create your first request", "Track responses", "Try again") |
| **Dark** | bg `ink`, white text | A strong secondary action next to an outline button ("Show compatible", "Directions") |
| **Outline** | bg `surface`, 1px `border-strong`, `ink` text | Secondary/back actions ("Clear filters", "Back to requests", "Decline") |
| **Text / link** | no bg, `primary` text, 600 | Tertiary actions ("How matching works", "Forgot password?", "I can't make it anymore") |
| **Icon** | 36×36, transparent, `text-muted`, radius 8 | Show password, row actions; always has `aria-label` |

- Sizes: sm 38px (padding `0 14px`, 13px text), md 40px (padding `0 16px`, 14px text), lg 48px (radius 10–12, 15px text, full width in forms).
- Labels are 600 weight, sentence case, and name the action with a verb ("Track responses", not "OK").
- A leading icon is 16px with an 8px gap.
- In button pairs the order is secondary first, then primary. In card footers the primary can be wider (e.g. `1fr 1.6fr`).
- Hover: primary goes to `primary-hover`. Outline gets a `bg` fill. Focus uses `--ring-focus`.
- Disabled: 40–50% opacity and `cursor: not-allowed`. Also say *why* it's disabled nearby (see the Blocked state).

### 4.2 Form fields

- The label sits above the field: 13px/500 `ink`, with a 6px gap. The field is 48px high with padding `0 14px`, radius 10, 1px `border-strong`, `surface` bg and 15px text.
- **Focus:** border `primary` plus `--ring-focus`.
- An inline adornment (like the password eye) goes inside the field wrapper with right padding of 6px and a 36px icon button.
- A label-row link (e.g. "Forgot password?") is right-aligned in the label row, 600 weight, with no underline.
- Checkbox: 18px, `accent-color: primary`, 10px gap to a 14px label.
- **Errors (not drawn in the kit; follow this):** border `primary`, a 12–13px message below in `primary-hover` that states the fix ("Enter a hospital email, e.g. name@hospital.lk"), and `aria-describedby` linking to it.
- Always set `autocomplete` (`email`, `current-password`, …).

### 4.3 Badges and chips

| Type | Style |
|---|---|
| **Status badge** | pill, padding `3px 10px`, 12px/600. Tones: neutral (`neutral-soft` / `ink-2`), info (`info-soft` / `info`), success (`success-soft` / `success`), warning (`warning-soft` / `warning`), error (`primary-subtle` / `primary`) |
| **Filter chip** | pill, 28px high, padding `0 10px`, `primary-soft` bg, `primary-hover` text, 12px/600, label format `Key: Value` ("Group: AB−", "City: Jaffna"). Add a remove ✕ when interactive |
| **Urgency tag** | 24px, radius 6, padding `0 8px`, solid `primary` bg, white 12px/600: **Critical** |
| **Blood-group badge** | square tile, `ink` bg, white `IBM Plex Mono` text (e.g. `A+`). 52px/radius 14 in profile headers, smaller (32–36px, radius 10) in tables |

### 4.4 Cards and panels

- **Panel:** `surface`, 1px `border`, radius 14, `overflow: hidden`.
- **Feature/summary card:** radius 16–18, padding 16.
- **Option card** (e.g. "Become a donor" / "Register a hospital"): padding 14, radius 12, 1px `border-strong`, a 14px/600 title with an 18px icon, and a 12px `text-subtle` description.
- **Critical request card:** 2px `primary` border, `--shadow-urgent`, radius 18. Header row: urgency tag on the left, deadline on the right ("Needed by 18:00 today", 12px/600 `primary`). Then a display-font headline ("City Hospital needs A+"), a meta line ("ICU · 1 more donor needed · 3.2 km away") and the location with an icon. Use this for critical requests only.
- **Dashed callout:** 1px dashed `border-strong`, radius 14, padding `14px 16px`, a 20px icon and 13px/18 `text-muted` copy with key values in bold `ink`. Use it for reminders ("You'll be eligible again on **28 Dec 2026**").

### 4.5 Tables and lists

- Header row: 36px, `surface-sunken` bg, `border` top and bottom, 12px/600 `text-subtle`.
- Body row: 56px, padding `0 20px`, 1px `neutral-soft` bottom divider, gap 12.
- Typical row: 32px avatar or blood-group tile, then two lines (14px/500 title plus 12px `text-subtle` meta), then a right-aligned badge or value (13px/600).
- A panel header above the table has padding `18px 20px`, with the title on the left and actions/filters on the right.
- Active filters appear as chips in a bar under the header (padding `14px 20px`) and **stay visible in the empty-results state**.
- A list-row icon tile is 36×36, radius 10, `primary-soft` bg with a `primary` 18px icon.

### 4.6 Switch

52×32 pill, padding 3, 26px white knob with `--shadow-knob`. On: `success` bg, knob on the right. Off: `border-strong` bg. Use `role="switch"`, `aria-checked` and `aria-label`, and put a helper line beside it ("Turn off while travelling or unwell").

### 4.7 Step progress

Use this for multi-stage status such as hospital approval. It is a row of equal pill segments, 4px high with a 6px gap, about 260px wide. Done segments are `success`, the current one is `warning-mid` and upcoming ones are `neutral-soft`. The caption below is 12px `text-subtle` with the current step in bold and its tone colour: "Registered · **Under review** · Approved".

### 4.8 State icon tile

A rounded square (64px/radius 18, or 72px/radius 20 for first-use) with a soft tone background and a 30–36px icon in the tone colour:
brand/first-use → `primary-soft`/`primary`; no-results → `bg`/`text-subtle`; error → `primary-subtle`/`primary`; blocked → `warning-soft`/`warning`. Success is a **circle** (72px, `success-soft`, 34px check at stroke 2) with `--halo-success`.

### 4.9 Divider with text

Two 1px `border` lines flexing around a 12px `text-subtle` label with a 12px gap ("New to RedLink?").

---

## 5. Screen states (required for every data view)

Every list, table, detail and dashboard widget ships all six. Wrap each state in the same panel container as the loaded view so the layout doesn't jump.

| State | Container semantics | Content recipe | Kit example |
|---|---|---|---|
| **Loading** | `aria-busy="true"` | A skeleton that **mirrors the real layout** (same header, row height, avatar, badge positions). Shimmer, stopped for reduced motion | 6 skeleton rows: 32px circle, two bars at varied widths (55/35, 70/30 …), 56×22 pill |
| **Empty · first use** | — | 72px brand icon tile → `title-lg` title → one sentence on the *value* → **one primary action** → optional text link | "No blood requests yet" → "Create your first request" + "How matching works" |
| **Empty · no results** | — | Keep the filter chips visible → neutral tile → title that names the filters → explain and suggest alternatives → outline "Clear filters" plus dark "Show compatible" | "No eligible AB− donors in Jaffna" |
| **Error** | `role="alert"` | Error tile → plain cause → reassurance (what's kept) → primary "Try again" with a refresh icon → mono reference line | "We couldn't load donors" · "Error 504 · ref 7f3a-19c2" |
| **Success** | `role="status"` | Success halo icon → title with the ID → outcome in numbers → outline back plus primary next step | "Request #RQ-1043 is live" → "Back to requests" / "Track responses" |
| **Blocked** | — | Warning tile → why it's blocked → who is acting and how long it takes → step progress | "Posting unlocks after approval" · "usually takes 1–2 working days" |

Centred state content has `gap: 14–16px`, `padding: 40px`, `text-align: center` and descriptions capped at about 290px.

---

## 6. Layout

- **Design width is 1440px.** Build fluid: content max-width about 1312px (1440 − 2×64). Use 24px gutters and 16px side padding on narrow viewports. The dashboard must still work at tablet and phone widths in the browser, though no native app is planned.
- **Grid:** 12 columns for pages. Card/state galleries use `repeat(3, 1fr)` with a 24px gap, collapsing to 2 columns and then 1.
- **Page header:** eyebrow (12px uppercase `primary`) over a `display-lg` title on the left. Optional right-aligned 13px `text-muted` note (max 420px) or actions. Bottom-aligned, 28px gap to content.

### 6.1 Sign-in (designed)

- A two-column grid: a **640px dark hero panel** plus a fluid form column (form 400px wide, centred).
- The hero is `ink` bg with 56px padding and three rows: brand mark, headline + supporting copy, trust line. It has a large 520px `dark-2` blood drop bleeding off the bottom-right.
  - Headline: "Stop calling donors one by one." (display-xl)
  - Support: "Post a request and RedLink ranks every compatible, eligible donor nearby — then notifies them for you." (16/25, `on-dark-muted`)
  - Trust line: a shield-check icon in `primary-on-dark` plus "Patient details never leave the hospital" (13px).
- Form, in order: "Sign in" (display-md) with the subtitle "Hospital staff, donors and admins use the same sign-in." → Email → Password (with the "Forgot password?" link and a show/hide toggle) → "Keep me signed in on this device" → primary lg "Sign in" → divider "New to RedLink?" → two option cards: **Become a donor** ("Get alerts when you can help") and **Register a hospital** ("Needs admin approval").
- Below about 1024px, hide the hero or collapse it to a slim brand header above the form.

### 6.2 App shell (not in kit — proposed default)

The kit links to `Dashboard`, `Requests`, `New request` and `Request detail` but doesn't draw them. Until they're designed:
- Left sidebar (about 240px, `surface`, right border `border`) with the brand mark and wordmark at the top. Nav items are 40px, 14px/500 `text-muted`, 18px icons. The active item is `primary-soft` bg with `primary-hover` text.
- Top bar inside the content area holds the page title, a global "New request" primary button (hospital role) and the user menu.
- Content sits on `bg` with 32–64px padding. Data lives in panels (§4.4).

### 6.3 Pages by role

| Role | Pages | Notes |
|---|---|---|
| **Hospital staff** | Dashboard, Requests (table), New request (form), Request detail (donor responses) | Posting is **blocked until admin approval** (use the Blocked state). After posting, show the Success state and link to Request detail |
| **Donor** | Home (eligibility + availability + incoming requests), Requests, History, Profile | Adapted from the kit's donor board (see §7) |
| **Admin** | Hospital approvals queue, users, requests overview | Approval uses the step progress: Registered → Under review → Approved |

---

## 7. Donor web views (adapted from the kit's donor board)

These patterns come from the mobile mockup but are specified for the **web dashboard**:

- **Greeting header:** 13px `text-muted` "Good afternoon" over the name in display 24/700, with the blood-group badge (52px, `ink`, mono) on the right.
- **Eligibility card:** a 64px ring showing days since the last donation against the 90-day interval, plus "You can donate" (16/600) and "Last donation 12 Mar · 201 days ago".
- **Availability switch card:** "Available for requests" plus the helper "Turn off while travelling or unwell" and the switch (§4.6).
- **"Needs you now · N"** eyebrow, then critical request cards (§4.4) with **Decline** (outline) and **I can donate** (primary).
- **Accepted confirmation:** a `success` banner with a white check in an 18%-white circle, a display headline ("Thank you, Kamal. City Hospital is expecting you."), and instructions in `on-success-muted` ("Please arrive before 17:30 and bring your NIC."). Actions: Directions (dark), Call blood bank (outline), and the text link "I can't make it anymore".
- **Donation history list:** list rows (§4.5) with hospital, date · request ID and units. The header shows "7 total · 7 lives helped". End with a dashed callout for the next eligibility date.
- On desktop, lay these out as a 2-column dashboard (status cards on the left, requests and history on the right), not a phone-width column.

---

## 8. Content and voice

- **Plain, specific and kind.** Name the thing, the number and the next step. Good: "We notified the top 18 of 46 eligible donors. You'll get an alert as each one replies."
- **Errors:** cause, then reassurance, then action, then reference. Never blame the user, and never write "Something went wrong."
- **Blocked:** why, then who, then when ("An admin is reviewing Nawaloka Hospital's registration. This usually takes 1–2 working days.").
- **Empty:** describe the value, not the absence.
- Sentence case everywhere except eyebrows (uppercase via CSS).
- **Formats**
  - Blood groups: `A+ A− B+ B− AB+ AB− O+ O−`. Use the true minus sign **"−" (U+2212)**, not a hyphen.
  - Dates: `12 Mar 2026`. Times are 24-hour: `18:00`.
  - Request IDs: `#RQ-1043`. Error refs: `Error 504 · ref 7f3a-19c2` (mono).
  - Separator: a middle dot with spaces (` · `).
  - Distance: `3.2 km away`. Units: `1 unit`.
  - Locale context is Sri Lanka (NIC, Colombo addresses, `.lk` emails in examples).

---

## 9. Accessibility checklist

- [ ] Visible focus on every interactive element (`--ring-focus` plus a `primary` border).
- [ ] Icon-only buttons have `aria-label`. Decorative SVGs have `aria-hidden="true"`.
- [ ] Loading containers use `aria-busy="true"`, errors use `role="alert"` and success uses `role="status"`.
- [ ] Switches use `role="switch"` and `aria-checked`. Nav uses `aria-current="page"`.
- [ ] Status is never conveyed by colour alone (always text or an icon).
- [ ] Shimmer and animations stop under `prefers-reduced-motion`.
- [ ] Body text is at least 14px and captions at least 12px. `text-subtle` is only used on `surface`/`bg`.
- [ ] Form fields have real `<label>`s and `autocomplete`, and errors use `aria-describedby`.
- [ ] Hit targets are at least 36px (buttons 38–48px).

---

## 10. Out of scope / open items

- **Mobile app:** not in this phase. The web dashboard should still be responsive.
- **Dark mode:** not defined.
- **Not yet designed in the kit:** Dashboard, Requests table, New request form, Request detail, admin screens, toasts/notifications, modals, pagination, date pickers. Build them from the tokens and components above and add them to the kit when designed.
