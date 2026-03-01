# DevMind Codebase Audit (Step 1)

## Folder structure

- `src/` — app source
  - `app/` — routes, layout, pages, components (ui + devmind + figma), lib
  - `components/` — RedirectByAuth, ProtectedRoute, RoleGuard
  - `contexts/` — AuthContext
  - `lib/` — supabase client
  - `pages/` — SignIn, SignUp (auth pages)
  - `styles/` — theme.css, tailwind.css, fonts.css, custom.css, index.css
  - `types/` — database.ts (Supabase types)

## Every page that exists

| Route | File | What it renders |
|-------|------|-----------------|
| / | RedirectByAuth | Redirects by auth state |
| /signin | SignIn | Auth form (GitHub + email/password) |
| /signup | SignUp | Auth form + role selector |
| /app | Dashboard | Metric cards, emotional arc chart, AI insight placeholder, recent projects |
| /app/projects | ProjectList | Filterable project cards (mock data) |
| /app/projects/new | NewProject | Multi-step new project form (3 steps, mock submit) |
| /app/journal | Journal | Hub to pick project to log (empty state for now) |
| /app/projects/:id/checkin | JournalCheckin | Check-in form (energy, confidence, blocked, one word, motivated) |
| /app/projects/:id/reflection | DeepReflection | Full-page reflection editor with prompts |
| /app/projects/:id/post-mortem | ProjectPostMortem | Post-mortem form (status, rushed, overwhelmed, satisfaction, etc.) |
| /app/insights | InsightsDashboard | Pattern cards, growth tracker, recommendations, charts (mock) |
| /app/settings | Settings | Notification toggles (browser, email, Telegram, threshold, post-mortem, digest) |
| /app/team | TeamView | Manager-only team dashboard (metrics, charts, alerts) |
| * | NotFound | 404 with link to dashboard |

## Every component (summary)

- **Layout**: Sidebar + main Outlet; nav items by role; user + role at bottom; sign out link; mobile bottom nav.
- **DevMind**: StatCard, AIInsightCard, EmojiSelector, NumberSelector, Sparkline, ProjectStatusBadge, quick-action, loading-skeleton.
- **UI**: Button, Input, Label, Card, Tabs, Select, Switch, Slider, Textarea, Dialog, etc. (shadcn-style).
- **Auth**: ProtectedRoute, RedirectByAuth, RoleGuard.

## What is working vs placeholder

- **Working**: Auth (SignIn, SignUp with Supabase), routing, layout, role-based nav, profile fetch after sign-in, RoleGuard for Team, design tokens (theme.css).
- **Placeholder / mock**: Dashboard metrics and recent projects (mock numbers/arrays), project list (mock array), insights (mock cards/data), team view (mock data), journal hub (no project list from DB). New project form does not persist to Supabase. Journal check-in and deep reflection do not save. Post-mortem does not persist. Settings do not persist. No Supabase hooks in `src/hooks/` — all data is mock or in-memory.

## What conflicts with the design philosophy

- **Fixed**: Dashboard “Track your patterns, improve your outcomes” → “Project Overview” / “Metrics across all projects”. Removed “Journal Streak” and “Growth Score” celebration. Removed “Start your journey” style copy; empty states use “No projects. Create one to begin tracking.” SignIn: removed “Continue to your dashboard.” Theme: muted text set to #8B949E.
- **Partially addressed**: EmojiSelector still used on journal check-in (spec: number selector 1–10, no emojis for energy). Post-mortem satisfaction still uses emojis (spec: 5 plain squares). Some settings copy still “friendly” (e.g. “gentle reminders”).
- **Remaining**: Replace any “Great job”, “Amazing”, exclamation marks, cheerful tone across all pages. Replace emoji-based selectors with neutral controls where specified. Ensure all empty states and errors are factual and direct.

## Design tokens (current)

- Background: #0D1117
- Card/surface: #161B22
- Border: #30363D
- Primary: #6C63FF
- Success: #3FB950
- Destructive: #F85149
- Foreground: #E6EDF3
- Muted foreground: #8B949E
- Fonts: Inter (body), JetBrains Mono (metrics) via fonts.css

## Supabase wiring

- **Wired**: Auth (signIn, signUp, signOut, resetPasswordForEmail), AuthContext profile fetch from `profiles`, signUp creates `organisations` (manager) and upserts `profiles` (solo/member/manager).
- **Not wired**: projects, journal_entries, project_postmortems, ai_insights, silence_records, notification_settings. No RLS-driven reads/writes from app yet; no `src/hooks/` data hooks.
