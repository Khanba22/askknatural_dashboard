# Quiz Dashboard & Shopify Integration — Full Spec

---

## 0. Corrected Prompt (for your own reference / for briefing a dev)

> Build a quiz management system with two parts:
>
> **1. Admin dashboard** (internal, authenticated) with:
> - Quiz builder: full CRUD on quizzes, and on each quiz's questions and options. Questions and options are fully dynamic — no fixed count.
> - Analytics screen with two levels:
>   - **Global**: cross-quiz KPIs (total attempts, completion rate, most popular quiz, trend over time, etc.)
>   - **Per-quiz**: a quiz selector + date range picker at the top, driving a KPI row (attempts, completions, completion rate, avg time) plus one chart per question — bar/pie for option-based questions, word cloud for free-text questions.
>
> **2. Shopify storefront integration**:
> - A "Take a Quiz" entry point that opens a responsive modal.
> - Modal opens on a **hub screen**: a list of top-level quiz choices (driven by each quiz's `homeOptionText`). Selecting one starts that quiz's question flow.
> - Each question screen shows `n / total` progress, renders the right input for the question type (text / single-select / multi-select), and has Previous/Next controls. Next is disabled if the question is `enforced` and unanswered.
> - All answers are held client-side and written to the database in one atomic submission at the end, followed by a success screen.
> - Visual design must inherit the existing Shopify theme's tokens (colors, type, spacing) rather than looking like a bolted-on component — and the admin dashboard must look like a considered, purpose-built SaaS product, not a generic template.

---

## 1. Data Model

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE quizzes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  home_option_text  TEXT,                 -- label on the hub screen; NULL = hidden from hub
  description       TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  order_index       INTEGER NOT NULL DEFAULT 0,  -- hub display order
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE question_type AS ENUM ('text', 'single_option', 'multi_option');

CREATE TABLE questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  type         question_type NOT NULL,
  enforced     BOOLEAN NOT NULL DEFAULT false,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_questions_quiz_order ON questions(quiz_id, order_index);

CREATE TABLE options (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  order_index  INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_options_question_order ON options(question_id, order_index);

-- One row per "attempt" (a user going through a quiz once)
CREATE TABLE quiz_attempts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id               UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  shopify_customer_id   TEXT,               -- nullable, logged-in shoppers only
  session_token         TEXT NOT NULL,      -- anonymous client-generated id (localStorage/uuid)
  current_question_index INTEGER NOT NULL DEFAULT 0,  -- cheap progress ping, see §5
  started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at          TIMESTAMPTZ,        -- NULL until final submit
  is_completed          BOOLEAN NOT NULL DEFAULT false,
  source_url            TEXT,
  idempotency_key       TEXT UNIQUE,        -- see §5, prevents duplicate submits
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_attempts_quiz_completed ON quiz_attempts(quiz_id, is_completed, completed_at);

-- One row per question answered within an attempt
CREATE TABLE quiz_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id    UUID NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text   TEXT,                       -- populated only for type = 'text'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

-- Junction table — required because multi_option answers can hold >1 option
CREATE TABLE quiz_answer_options (
  answer_id  UUID NOT NULL REFERENCES quiz_answers(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES options(id) ON DELETE CASCADE,
  PRIMARY KEY (answer_id, option_id)
);
```

**Why the junction table matters:** your original sketch had a single `option id` on the response row. That works for `single_option`, but a `multi_option` answer can select several options at once — cramming that into one column forces either a comma-separated string (breaks joins/aggregation) or one row per option with no way to say "these N options belong to the same answer instance." `quiz_answer_options` solves both.

**Why `current_question_index` exists:** you asked for atomic writes only at completion, which is the right call for data integrity — but it means an abandoned attempt gives you zero information about *where* the person quit. This one integer, updated via a fire-and-forget `PATCH` on question change (not blocking Next), is enough to build a drop-off funnel per question without touching your atomic-submit design.

---

## 2. API Endpoints

Framework-agnostic; shown as REST routes. If your backend is Next.js (matches your other stack), these map directly to `app/api/**/route.ts`.

### Admin — Quiz CRUD (auth-protected)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/quizzes` | List all, with question/attempt counts |
| POST | `/api/admin/quizzes` | `{ name, slug, homeOptionText?, description?, isActive }` |
| PATCH | `/api/admin/quizzes/:id` | Partial update |
| DELETE | `/api/admin/quizzes/:id` | Soft-delete recommended (`is_active=false`) if attempts exist; hard delete only if zero attempts |
| PATCH | `/api/admin/quizzes/reorder` | `{ order: [quizId, ...] }` → sets `order_index` |

### Admin — Questions & Options CRUD
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/quizzes/:quizId/questions` | Ordered, with nested options |
| POST | `/api/admin/quizzes/:quizId/questions` | `{ text, type, enforced }` |
| PATCH | `/api/admin/questions/:id` | Edit text/type/enforced |
| DELETE | `/api/admin/questions/:id` | Cascades options + historical answers stay (FK cascade — see note below) |
| PATCH | `/api/admin/quizzes/:quizId/questions/reorder` | `{ order: [questionId, ...] }` |
| POST | `/api/admin/questions/:id/options` | `{ text }` |
| PATCH | `/api/admin/options/:id` | Edit text |
| DELETE | `/api/admin/options/:id` | |
| PATCH | `/api/admin/questions/:id/options/reorder` | `{ order: [optionId, ...] }` |

> **Gap to decide on:** cascading delete on a question with existing answers will silently destroy historical analytics for that question. Recommend: block delete (409) if `quiz_answers` reference the question, and offer an "archive" (soft-delete via a flag) path instead. Same logic for options.

### Public (Shopify storefront-facing, via App Proxy — see §4)
| Method | Path | Notes |
|---|---|---|
| GET | `/apps/quiz/hub` | Returns active quizzes: `[{ id, homeOptionText }]`, ordered |
| GET | `/apps/quiz/:quizId` | Full quiz payload: ordered questions, each with ordered options |
| POST | `/apps/quiz/:quizId/attempts` | Creates attempt on hub selection. Body: `{ sessionToken, shopifyCustomerId?, sourceUrl }` → returns `attemptId` |
| PATCH | `/apps/quiz/attempts/:attemptId/progress` | `{ currentQuestionIndex }` — fire-and-forget, non-blocking |
| POST | `/apps/quiz/attempts/:attemptId/submit` | Body: `{ idempotencyKey, answers: [{ questionId, answerText? , optionIds?: [] }] }`. Writes all `quiz_answers` + `quiz_answer_options` rows in **one transaction**, sets `is_completed=true`, `completed_at=now()` |

### Admin — Analytics
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/analytics/global` | See KPI list §6.1 |
| GET | `/api/admin/analytics/quiz/:id?from=&to=` | See KPI list §6.2, includes per-question chart data |

Per-question chart payload shape (option-based):
```json
{
  "questionId": "...",
  "text": "Which service interests you?",
  "type": "single_option",
  "totalAnswers": 214,
  "options": [
    { "optionId": "...", "text": "Consulting", "count": 120, "pct": 56.1 },
    { "optionId": "...", "text": "Implementation", "count": 94, "pct": 43.9 }
  ]
}
```
Per-question payload shape (text-based, for word cloud):
```json
{
  "questionId": "...",
  "text": "What's your biggest challenge?",
  "type": "text",
  "totalAnswers": 88,
  "wordFrequencies": [
    { "word": "budget", "count": 19 },
    { "word": "time", "count": 14 }
  ],
  "rawSample": ["...", "..."]   // last N raw answers for admin spot-checking
}
```
Word cloud data should be computed server-side (tokenize → lowercase → strip stopwords/punctuation → count) rather than shipping raw text to the client and building the cloud there — keeps the payload small and avoids re-deriving the same frequencies on every render.

---

## 3. Implementation Gaps Filled

1. **Auth on admin routes.** Not specified — use session-based auth (NextAuth, Clerk, or a simple signed cookie + password gate if it's just you). Every `/api/admin/*` route must check this server-side, not just hide the UI.
2. **Rate limiting on public endpoints.** `/apps/quiz/:quizId/attempts` and `/submit` are unauthenticated by nature (anonymous shoppers) — add IP/session-based rate limiting so someone can't script-spam fake completions into your analytics.
3. **Idempotent submit.** Client generates a UUID once when the attempt starts, sends it as `idempotencyKey` on submit. Server checks it against `quiz_attempts.idempotency_key` (unique constraint) before writing — a retried request (flaky mobile network) returns the existing result instead of double-writing.
4. **Enforced-answer validation happens twice**: client-side (disables Next) for UX, and **server-side on submit** (reject if an enforced question has no matching answer in the payload) — never trust the client alone.
5. **Ordering.** `order_index` on questions and options, not array position — array position breaks the moment someone reorders via drag-and-drop and a request lands out of order.
6. **Soft-delete vs hard-delete** — covered in §2, applies to quizzes/questions/options once real answer data exists against them.
7. **Session identity for anonymous shoppers.** Generate a `sessionToken` (UUID) client-side on first modal open, persist in `localStorage`, reuse across attempts — lets you dedupe "one person, multiple attempts" in analytics if you ever need to.

---

## 4. Shopify Integration

**Use a Shopify App Proxy**, not a direct cross-origin call to your backend:
- In your Shopify custom app config, set an App Proxy with subpath prefix `apps`, subpath `quiz`, pointing at your backend (e.g. `https://yourapp.com/proxy`).
- Storefront JS then calls same-origin paths like `/apps/quiz/hub` — Shopify forwards them server-to-server, adds an HMAC signature you verify, and you avoid CORS entirely plus keep your real backend URL private.
- Verify the proxy signature on every incoming request in your backend before touching the DB.

**Theme placement:**
- Add a small Liquid **snippet** (`snippets/quiz-launcher.liquid`) rendering a button, included wherever you want the entry point (header, a specific page template, a custom section block).
- Add a **section** (`sections/quiz-modal.liquid`) that renders the modal shell (hidden by default) once, globally, in `theme.liquid` — avoids re-mounting per page.
- JS as a vanilla module or a lightweight web component (`<quiz-modal>`), not React — standard Online Store 2.0 themes don't ship a React runtime, and pulling one in just for this is unnecessary weight. (If this is actually a Hydrogen/headless storefront, the calculus flips — say so and I'll adjust to React.)

**Theme-matching, concretely:** don't hardcode colors/fonts in the modal CSS. Instead:
- Read the theme's existing CSS custom properties (most OS 2.0 themes expose `--color-background`, `--color-foreground`, `--color-accent`, `--font-heading-family`, `--font-body-family`, border-radius tokens, etc. — check `assets/base.css` or the theme's `snippets/theme-styles-variables.liquid`).
- Map the modal's own internal variables to those: `--quiz-accent: var(--color-accent, #000)`, etc., with a sane fallback.
- This means the quiz modal re-skins itself automatically if the merchant changes their theme's color scheme in the theme editor — which is the actual definition of "integrated with the theme," not just "looks similar today."

---

## 5. Quiz Modal — Frontend Flow

**State machine:** `hub → question[0..n-1] → success`

1. **Hub screen.** `GET /apps/quiz/hub` on modal open. Renders cards/list from `homeOptionText`. No progress indicator here.
2. **On card click:** `POST /apps/quiz/:quizId/attempts` → get `attemptId`; `GET /apps/quiz/:quizId` to fetch full ordered question set; transition to question 0.
3. **Question screen:**
   - Top: small `n / total` span.
   - Body: question text + input by `type`:
     - `text` → textarea
     - `single_option` → radio group
     - `multi_option` → checkbox group
   - Footer: **Previous** / **Next**. Next is `disabled` when `enforced === true` and the current answer is empty (empty = no text, or zero options selected).
   - On question change (either direction), fire `PATCH /apps/quiz/attempts/:attemptId/progress` — don't await it, don't block navigation on it.
   - Answers accumulate in local component state (a `Map<questionId, answer>`), not written to DB yet.
4. **Previous from question 0** returns to the hub. The in-progress attempt is simply abandoned (it already exists as a "started" row for funnel purposes — that's fine, that's a real data point).
5. **Last question's Next becomes Submit.** Fires `POST /apps/quiz/attempts/:attemptId/submit` with the full accumulated answer set + the idempotency key generated at attempt start. Show a loading state; on success, transition to the success screen. On network failure, retry is safe (idempotent).
6. **Success screen.** Confirmation message, close button. Optionally personalize using the selected quiz's `homeOptionText` ("Thanks for exploring **{{ homeOptionText }}**") — nice touch, not required.

Responsive behavior: full-screen sheet on mobile (slide up), centered modal with max-width ~560px on desktop. Progress span, question, and footer buttons all stay in a fixed-height frame so the modal doesn't jump in height between questions — reserve consistent padding regardless of input type.

---

## 6. Dashboard KPIs

### 6.1 Global (cross-quiz) screen
- **Total attempts** (all-time, plus a trend sparkline)
- **Total completions** and **completion rate %** (`completed / started`)
- **Active quizzes** count
- **Most popular quiz** (by attempt volume, last 30 days)
- **Attempts over time** — line/area chart, selectable granularity (day/week)
- **Avg. completion time** (median is more honest than mean here — outliers from abandoned-then-resumed sessions skew averages hard)
- **Drop-off leaderboard** — which quizzes lose the most people before question 1 vs mid-quiz (needs `current_question_index`, §1)

### 6.2 Per-quiz screen
Controls at top: **quiz selector** + **date range picker**, both driving every KPI/chart below via `?from=&to=`.

- **Attempts** in range
- **Completions** in range
- **Completion rate %**
- **Avg / median time to complete**
- **Funnel chart**: attempts reaching each question index (uses `current_question_index`) — shows exactly where people bail
- **Per-question section**, one block per question in quiz order:
  - `single_option` / `multi_option` → bar chart (preferred over pie once options exceed ~4-5; pie only for binary/near-binary splits) showing count + % per option
  - `text` → word cloud + a small "recent responses" list for qualitative spot-checking

---

## 7. Dashboard Visual Design Guide

The brief: not a generic Tailwind-starter dashboard. Concretely, that template look comes from a specific set of defaults — default `Inter` at every size, `shadow-md rounded-lg` on every card, a violet-500-on-white palette used identically for buttons/badges/icons/links, and icon-heavy KPI cards where the icon competes with the number for attention. Fixing this is about being deliberate on a short list of decisions, not about adding more visual noise.

### 7.1 Design tokens (copy-paste starting point)

```css
:root {
  /* Surfaces — two-layer, not flat white-on-white */
  --surface-canvas: #F7F6F3;      /* page background, warm off-white, not pure #fff */
  --surface-raised: #FFFFFF;      /* cards, panels */
  --surface-sunken: #EFEDE8;      /* input backgrounds, table stripes */
  --surface-inverse: #14121F;     /* sidebar / nav, deep indigo-black not pure black */

  /* Text */
  --text-primary: #14121F;
  --text-secondary: #5B5868;
  --text-tertiary: #9C99A8;
  --text-on-inverse: #F1EFEA;

  /* Accent — reserve for primary actions + key data points ONLY */
  --accent: #6155E8;
  --accent-hover: #5147D1;
  --accent-subtle: #EDEBFC;       /* accent backgrounds, e.g. selected nav item */

  /* Semantic (status, not decoration) */
  --success: #1E9E6B;
  --warning: #C77D12;
  --danger: #D1453B;

  /* Data-viz palette — tints/shades of accent + two controlled complements,
     NOT a rainbow. Use in this exact order for categorical series. */
  --chart-1: #6155E8;  /* accent */
  --chart-2: #A8A0F5;  /* accent tint */
  --chart-3: #2FB5A0;  /* complement, teal */
  --chart-4: #E8A94F;  /* complement, amber */
  --chart-5: #3D3A4D;  /* neutral dark, for "other" buckets */

  /* Elevation — hairline border first, shadow second and subtle */
  --border-hairline: 1px solid rgba(20,18,31,0.08);
  --shadow-raised: 0 1px 2px rgba(20,18,31,0.04), 0 1px 1px rgba(20,18,31,0.03);

  /* Type scale (1.25 ratio) */
  --text-xs: 12px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 19px;
  --text-xl: 24px;
  --text-2xl: 30px;
  --text-display: 38px;   /* KPI numbers live here */

  --font-ui: -apple-system, "Inter", system-ui, sans-serif;
  --font-numeric: "Inter", "Helvetica Now", system-ui, sans-serif; /* enable tabular-nums */

  /* Spacing (8px base, not the Tailwind 4px default — reads less cramped) */
  --space-1: 8px; --space-2: 16px; --space-3: 24px; --space-4: 32px; --space-5: 48px;

  --radius-sm: 6px;
  --radius-md: 10px;   /* cards — smaller than the common 16-24px "bubbly" default */
}
```

### 7.2 Layout rules

- **12-column grid, 24px gutter, generous outer margin.** Don't let KPI cards touch the viewport edge on desktop — cap content width around 1280px and let the canvas breathe.
- **Sidebar**: `--surface-inverse` background, icon + label nav items, **no filled active-pill** — use a 2px left border in `--accent` plus a text-color change. A fully filled active state is the single most template-y tell.
- **KPI cards**: number first, in `--text-display` with `font-variant-numeric: tabular-nums`, label above it in `--text-sm` `--text-secondary` uppercase-tracked. Trend indicator (▲/▼ + %) sits next to the number in `--success`/`--danger`, small. No large decorative icon — if you want an icon, make it 16px and muted, not a 40px colored blob.
- **Cards**: `--surface-raised`, `--border-hairline`, `--radius-md`, `--shadow-raised`. That's it — no gradient overlays, no colored top borders per card unless it's carrying real meaning (e.g., status).
- **Charts**: axis labels in `--text-tertiary`, gridlines at low opacity, data in the `--chart-*` sequence. Bar charts get rounded top corners only (2-4px), not fully pill-shaped bars.
- **Tables**: zebra striping via `--surface-sunken`, not borders between every row — borders-everywhere is another template tell.
- **Empty/loading states**: skeleton shapes matching the actual layout (not a generic spinner centered in a blank card), and empty states get one sentence + one action, not a full illustration unless that's genuinely part of your brand.

### 7.3 What to avoid specifically
- Accent color on every icon, badge, and link — pick 2-3 places it's allowed to appear (primary button, active nav, key KPI trend) and hold that line everywhere else.
- Identical `rounded-xl shadow-lg` on literally every element — vary elevation intentionally (nav = flat/inverse, cards = subtle, modals = the one place a real shadow earns its keep).
- Default `Inter` at default weights for both headings and numbers — turning on `tabular-nums` and giving KPI numbers their own oversized weight is a small change that reads as "designed," not "scaffolded."
- Rainbow/auto-generated chart palettes — always pull from the fixed `--chart-*` sequence so every chart in the product feels like it belongs to the same system.

---

## 8. Suggested Screen List (Admin IA)

1. **Quizzes** — list view (name, status, question count, attempt count, last edited) → **Quiz Builder** (question/option CRUD, drag-to-reorder)
2. **Analytics → Global**
3. **Analytics → Per-Quiz** (selector + date range + KPI row + funnel + per-question charts)
4. **Settings** (optional) — Shopify App Proxy status/health check, webhook status if you add any